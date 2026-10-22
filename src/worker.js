import viewerHtml from "./viewer.html";
const VIEWER_HTML=viewerHtml;
/** MiPorkChop 0.4: public viewer and read-only status; authenticated writes. */
const KEY="garage-status";
const STALE_MS=180000;
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:HEADERS});
function authorized(request,secret){
 if(!secret||typeof secret!=="string")return false;
 const header=request.headers.get("authorization");
 if(!header?.startsWith("Bearer "))return false;
 const a=new TextEncoder().encode(header.slice(7)),b=new TextEncoder().encode(secret);
 let diff=a.length^b.length;
 for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a[i]??0)^(b[i]??0);
 return diff===0;
}
async function status(env){
 const record=await env.STATUS_KV.get(KEY,"json");
 if(!record)return {state:"UNKNOWN",lastSeen:null,reason:"No device report yet"};
 const lastSeen=Date.parse(record.lastSeen??"");
 if(!Number.isFinite(lastSeen)||lastSeen>Date.now()+30000||Date.now()-lastSeen>STALE_MS)
   return {state:"UNKNOWN",lastSeen:record.lastSeen??null,reason:"Device heartbeat stale"};
 return {state:record.switchState,lastChanged:record.lastChanged,lastSeen:record.lastSeen};
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(path==="/health"&&request.method==="GET")return json({service:"MiPorkChop",ok:true});
  if(path==="/"&&request.method==="GET"){
   return new Response(VIEWER_HTML,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
  }
  if(!env.STATUS_KV)return json({error:"Storage not configured"},503);
  if(path==="/api/public-status"&&request.method==="GET")return json(await status(env));
  if(path!=="/api/status")return json({error:"Not found"},404);
  if(request.method==="GET"){
   if(!authorized(request,env.VIEWER_API_TOKEN))return json({error:"Unauthorized"},401);
   return json(await status(env));
  }
  if(request.method==="POST"){
   if(!authorized(request,env.DEVICE_API_TOKEN))return json({error:"Unauthorized"},401);
   let body;try{body=await request.json()}catch{return json({error:"Invalid JSON"},400)}
   if(!body||!["OPEN","CLOSED"].includes(body.state))return json({error:"state must be OPEN or CLOSED"},400);
   const now=new Date().toISOString(),previous=await env.STATUS_KV.get(KEY,"json");
   const lastChanged=previous?.switchState===body.state&&previous.lastChanged?previous.lastChanged:now;
   await env.STATUS_KV.put(KEY,JSON.stringify({switchState:body.state,lastChanged,lastSeen:now,source:"physical-switch"}));
   return json({ok:true,state:body.state,lastChanged,lastSeen:now});
  }
  return json({error:"Method not allowed"},405);
 }
};
