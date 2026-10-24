// One shared Durable Object serializes attendance and device-state changes.
import { Motd } from './motd.js';
const SIX_HOURS=6*60*60*1000;
const FIFTEEN_MINUTES=15*60*1000;
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
export class Attendance {
 constructor(ctx,env={}){
  this.ctx=ctx;this.sql=ctx.storage.sql;
  this.motd=new Motd(ctx,env);
  this.sql.exec("CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS inbound (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
  this.sql.exec("CREATE TABLE IF NOT EXISTS garage (id INTEGER PRIMARY KEY, state TEXT, seen INTEGER)");
 }
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==="/motd"||path==="/motd/session"||path==="/motd/counts")return this.motd.fetch(request);
  let body={};
  if(request.method==="POST"){
   try{body=await request.json();}catch{return reply({error:"Invalid JSON"},400);}
  }
  return this.ctx.storage.transactionSync(()=>{
   const now=Date.now();
   this.sql.exec("DELETE FROM visits WHERE expires<=?",now);
   this.sql.exec("DELETE FROM inbound WHERE expires<=?",now);
   this.sql.exec("DELETE FROM manual_counts WHERE expires<=?",now);
   if(path==="/device"&&request.method==="POST"){
    if(!["OPEN","CLOSED"].includes(body.state))return reply({error:"Invalid state"},400);
    this.sql.exec("INSERT OR REPLACE INTO garage VALUES (1,?,?)",body.state,now);
    if(body.state==="CLOSED"){
     this.sql.exec("DELETE FROM visits");
     this.sql.exec("DELETE FROM inbound");
     this.sql.exec("DELETE FROM manual_counts");
    }
    return reply({ok:true});
   }
   if(path!=="/attendance")return reply({error:"Not found"},404);
   const id=request.headers.get("X-Visitor-ID");
   if(!/^[0-9a-f-]{36}$/.test(id??""))return reply({error:"Missing browser identity"},400);
   const garage=[...this.sql.exec("SELECT state,seen FROM garage WHERE id=1")][0];
   const available=!!garage&&now-garage.seen<=450000;
   const canCheckIn=available&&garage.state==="OPEN";
   if(request.method==="POST"){
    if(body.action==="out"){
     this.sql.exec("DELETE FROM visits WHERE id=?",id);
     this.sql.exec("DELETE FROM inbound WHERE id=?",id);
    }
    else if(body.action==="cancel-coming")this.sql.exec("DELETE FROM inbound WHERE id=?",id);
    else if(body.action==="coming"){
     if(!canCheckIn)return reply({error:"On my way requires a fresh OPEN status"},409);
     if(![...this.sql.exec("SELECT id FROM visits WHERE id=?",id)].length){
      if([...this.sql.exec("SELECT COUNT(*) AS count FROM inbound")][0].count>=500 &&
         ![...this.sql.exec("SELECT id FROM inbound WHERE id=?",id)].length)return reply({error:"On my way capacity reached"},429);
      this.sql.exec("INSERT OR IGNORE INTO inbound VALUES (?,?)",id,now+FIFTEEN_MINUTES);
     }
    }
    else if(body.action==="in"){
     if(!canCheckIn)return reply({error:"Check-in requires a fresh OPEN status"},409);
     if([...this.sql.exec("SELECT COUNT(*) AS count FROM visits")][0].count>=500 &&
        ![...this.sql.exec("SELECT id FROM visits WHERE id=?",id)].length)return reply({error:"Check-in capacity reached"},429);
     // Duplicate check-in requests never extend the original expiration.
     this.sql.exec("INSERT OR IGNORE INTO visits VALUES (?,?)",id,now+SIX_HOURS);
     this.sql.exec("DELETE FROM inbound WHERE id=?",id);
    }else return reply({error:"Invalid action"},400);
   }else if(request.method!=="GET")return reply({error:"Method not allowed"},405);
   const visit=[...this.sql.exec("SELECT expires FROM visits WHERE id=?",id)][0];
   const coming=[...this.sql.exec("SELECT expires FROM inbound WHERE id=?",id)][0];
   return reply({...this.motd.counts(now),
    onMyWay:!!coming,comingExpiresAt:coming?.expires??null,
    checkedIn:!!visit,expiresAt:visit?.expires??null,canCheckIn,available});
  });
 }
}

