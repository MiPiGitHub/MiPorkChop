// One shared Durable Object serializes attendance and device-state changes.
const SIX_HOURS=6*60*60*1000;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
export class Attendance {
 constructor(ctx){
  this.ctx=ctx;this.sql=ctx.storage.sql;
  this.sql.exec("CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS garage (id INTEGER PRIMARY KEY, state TEXT, seen INTEGER)");
 }
 async fetch(request){
  const path=new URL(request.url).pathname;
  let body={};
  if(request.method==="POST"){
   try{body=await request.json();}catch{return reply({error:"Invalid JSON"},400);}
  }
  return this.ctx.storage.transactionSync(()=>{
   const now=Date.now();
   this.sql.exec("DELETE FROM visits WHERE expires<=?",now);
   if(path==="/device"&&request.method==="POST"){
    if(!["OPEN","CLOSED"].includes(body.state))return reply({error:"Invalid state"},400);
    this.sql.exec("INSERT OR REPLACE INTO garage VALUES (1,?,?)",body.state,now);
    if(body.state==="CLOSED")this.sql.exec("DELETE FROM visits");
    return reply({ok:true});
   }
   if(path!=="/attendance")return reply({error:"Not found"},404);
   const id=request.headers.get("X-Visitor-ID");
   if(!/^[0-9a-f-]{36}$/.test(id??""))return reply({error:"Missing browser identity"},400);
   const garage=[...this.sql.exec("SELECT state,seen FROM garage WHERE id=1")][0];
   const available=!!garage&&now-garage.seen<=450000;
   const canCheckIn=available&&garage.state==="OPEN";
   if(request.method==="POST"){
    if(body.action==="out")this.sql.exec("DELETE FROM visits WHERE id=?",id);
    else if(body.action==="in"){
     if(!canCheckIn)return reply({error:"Check-in requires a fresh OPEN status"},409);
     if([...this.sql.exec("SELECT COUNT(*) AS count FROM visits")][0].count>=500 &&
        ![...this.sql.exec("SELECT id FROM visits WHERE id=?",id)].length)return reply({error:"Check-in capacity reached"},429);
     // Duplicate check-in requests never extend the original expiration.
     this.sql.exec("INSERT OR IGNORE INTO visits VALUES (?,?)",id,now+SIX_HOURS);
    }else return reply({error:"Invalid action"},400);
   }else if(request.method!=="GET")return reply({error:"Method not allowed"},405);
   const visit=[...this.sql.exec("SELECT expires FROM visits WHERE id=?",id)][0];
   return reply({count:[...this.sql.exec("SELECT COUNT(*) AS count FROM visits")][0].count,
    checkedIn:!!visit,expiresAt:visit?.expires??null,canCheckIn,available});
  });
 }
}
