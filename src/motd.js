// Private PIN validation and sessions stay in the Durable Object, never in HTML.
const SESSION_MS=8*60*60*1000,WINDOW_MS=15*60*1000;
const COOKIE='__Host-miporkchop-admin';
const cookie=(value,age)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
async function hash(value){
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
export class Motd {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
  this.sql.exec('CREATE TABLE IF NOT EXISTS manual_counts (kind TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS motd (id INTEGER PRIMARY KEY, message TEXT NOT NULL, updated INTEGER NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS motd_sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL, pin_hash TEXT NOT NULL)');
  this.sql.exec('CREATE TABLE IF NOT EXISTS motd_attempts (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');
 }
 counts(now=Date.now()){
  const actual=[...this.sql.exec('SELECT COUNT(*) AS count FROM visits WHERE expires>?',now)][0].count;
  const inbound=[...this.sql.exec('SELECT COUNT(*) AS count FROM inbound WHERE expires>?',now)][0].count;
  const rows=[...this.sql.exec('SELECT kind,count,expires FROM manual_counts WHERE expires>?',now)];
  const manual=rows.find(r=>r.kind==='checked'),coming=rows.find(r=>r.kind==='coming');
  const garage=[...this.sql.exec('SELECT state,seen FROM garage WHERE id=1')][0];
  return {count:actual+(manual?.count??0),comingCount:inbound+(coming?.count??0),
   browserCount:actual,browserComingCount:inbound,manualCount:manual?.count??0,manualComingCount:coming?.count??0,
   canAdjust:garage?.state==='OPEN'&&now-garage.seen<=450000};
 }
 async fetch(request){
  const path=new URL(request.url).pathname,method=request.method;
  let body={};
  if(method==='POST'||method==='PUT'){
   const text=await request.text();
   if(text.length>2048)return json({error:'Request too large'},413);
   try{body=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
   if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Invalid JSON object'},400);
  }
  const secret=typeof this.env.MOTD_PIN==='string'?this.env.MOTD_PIN:'';
  const configured=/^\d{4}$/.test(secret);
  const pinHash=await hash(secret);
  const tokenHash=await hash(request.headers.get('X-Motd-Session')??'');
  const ipHash=await hash(request.headers.get('X-Client-IP')??'unknown');
  const providedHash=await hash(typeof body.pin==='string'?body.pin:'');
  const newToken=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  const newTokenHash=await hash(newToken);
  return this.ctx.storage.transactionSync(()=>{
   const now=Date.now();
   this.sql.exec('DELETE FROM motd_sessions WHERE expires<=?',now);
   this.sql.exec('DELETE FROM motd_attempts WHERE expires<=?',now);
   const current=()=>{
    const record=[...this.sql.exec('SELECT message,updated FROM motd WHERE id=1')][0];
    return {message:record?.message??'',updatedAt:record?.updated??null};
   };
   if(path==='/motd'&&method==='GET')return json(current());
   if(path==='/motd/session'&&method==='DELETE'){
    this.sql.exec('DELETE FROM motd_sessions WHERE token=?',tokenHash);
    return json({ok:true},200,{'Set-Cookie':cookie('',0)});
   }
   if(!configured)return json({error:'Message editing is not configured yet'},503);
   if(path==='/motd/session'&&method==='POST'){
    // Per-client limit plus a shared ceiling to slow distributed PIN guessing.
    const keys=[ipHash,'global'];
    for(const key of keys){
     const row=[...this.sql.exec('SELECT count,expires FROM motd_attempts WHERE id=?',key)][0];
     if(row&&row.count>=(key==='global'?100:5))return json({error:'Too many attempts. Try again later.'},429,{'Retry-After':String(Math.ceil((row.expires-now)/1000))});
    }
    for(const key of keys)this.sql.exec('INSERT INTO motd_attempts VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1',key,now+WINDOW_MS);
    if(providedHash!==pinHash)return json({error:'Incorrect PIN'},401);
    this.sql.exec('DELETE FROM motd_attempts WHERE id=?',ipHash);
    this.sql.exec('DELETE FROM motd_sessions WHERE token=?',tokenHash);
    this.sql.exec('INSERT INTO motd_sessions VALUES (?,?,?)',newTokenHash,now+SESSION_MS,pinHash);
    return json({authenticated:true,...current()},200,{'Set-Cookie':cookie(newToken,SESSION_MS/1000)});
   }
   const session=[...this.sql.exec('SELECT pin_hash FROM motd_sessions WHERE token=?',tokenHash)][0];
   if(!session||session.pin_hash!==pinHash)return json({error:'Please enter your PIN'},401);
   if(path==='/motd/counts'){
    if(method==='GET')return json(this.counts(now));
    if(method!=='PUT')return json({error:'Method not allowed'},405);
    if(!['checked','coming'].includes(body.kind)||!Number.isInteger(body.count)||body.count<0||body.count>500)
     return json({error:'Choose a whole number from 0 to 500'},400);
    if(!this.counts(now).canAdjust)return json({error:'Adjustments require the garage to be open and online'},409);
    const existing=[...this.sql.exec('SELECT count,expires FROM manual_counts WHERE kind=?',body.kind)][0];
    // Saving the same value never extends its expiry.
    if(!existing||existing.expires<=now||existing.count!==body.count){
     this.sql.exec('INSERT OR REPLACE INTO manual_counts VALUES (?,?,?)',body.kind,body.count,now+(body.kind==='checked'?21600000:900000));
    }
    return json(this.counts(now));
   }
   if(path==='/motd/session'&&method==='GET')return json({authenticated:true,...current()});
   if(path==='/motd'&&method==='PUT'){
    if(typeof body.message!=='string'||body.message.length>280)return json({error:'Message must be 280 characters or fewer'},400);
    const message=body.message.trim();
    this.sql.exec('INSERT OR REPLACE INTO motd VALUES (1,?,?)',message,now);
    return json({ok:true,...current()});
   }
   return json({error:'Method not allowed'},405);
  });
 }
}

