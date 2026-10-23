const VIEWER_HTML="<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>GarageMahal • MiPorkChop</title>\n<style>\n:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111827;color:white;text-align:center}main{width:min(90vw,500px);padding:2rem;border:1px solid #374151;border-radius:22px;background:#1f2937}h1{font-size:1.3rem;letter-spacing:.13em}.lamp{font-size:5rem;margin:1rem}.state{font-size:2rem;font-weight:900}.detail{font-size:1.2rem;margin-top:.6rem}.stamp{color:#cbd5e1;margin-top:1rem}.open .state{color:#4ade80}.closed .state{color:#f87171}.unknown .state{color:#d1d5db}\n</style></head><body><main id=\"card\" class=\"unknown\" aria-live=\"polite\"><h1>THE GARAGEMAHAL</h1><div class=\"lamp\" id=\"lamp\">⚪</div><div class=\"state\" id=\"state\">CHECKING STATUS</div><div class=\"detail\" id=\"detail\">Connecting to Cloudflare…</div><div class=\"stamp\" id=\"stamp\"></div></main>\n<script>\nconst card=document.getElementById('card'),lamp=document.getElementById('lamp'),title=document.getElementById('state'),detail=document.getElementById('detail'),stamp=document.getElementById('stamp');\nlet last=null;\nfunction formatAge(age){\n const seconds=age%60,minutes=Math.floor(age/60)%60,hours=Math.floor(age/3600)%24,days=Math.floor(age/86400);\n if(days>0)return days+'d '+hours+'h '+minutes+'m '+seconds+'s';\n if(age>=3600)return hours+'h '+minutes+'m '+seconds+'s';\n if(age>=60)return minutes+'m '+seconds+'s';\n return seconds+' seconds';\n}\nfunction render(){\n const age=last?.lastSeen?Math.max(0,Math.floor((Date.now()-Date.parse(last.lastSeen))/1000)):null;\n const fresh=age!==null&&Number.isFinite(age)&&age<=450;\n const state=fresh?last.state:'UNKNOWN';\n const known=state==='OPEN'||state==='CLOSED';\n card.className=known?(state==='OPEN'?'open':'closed'):'unknown';\n lamp.textContent=state==='OPEN'?'🟢':state==='CLOSED'?'🔴':'⚪';\n title.textContent=state==='OPEN'?\"BOYS R BUZZIN'\":state==='CLOSED'?\"BOYS AIN'T BUZZIN'\":'SERVICE UNAVAILABLE';\n detail.textContent=known?(state==='OPEN'?'GarageMahal is OPEN':'GarageMahal is CLOSED'):'GarageMahal status is unknown';\n stamp.textContent=age===null?'No confirmed heartbeat':('Last confirmed '+(formatAge(age)+' ago')+' • '+new Date(last.lastSeen).toLocaleString());\n}\nasync function refresh(){\n try{\n  const response=await fetch('/api/public-status',{cache:'no-store'});\n  if(!response.ok)throw Error('HTTP '+response.status);\n  last=await response.json();\n }catch(e){last=null;}\n render();\n}\nrefresh();setInterval(refresh,15000);setInterval(render,1000);\n</script></body></html>";
/** MiPorkChop 0.4: public viewer and read-only status; authenticated writes. */
const KEY="garage-status";
const STALE_MS=450000;
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
