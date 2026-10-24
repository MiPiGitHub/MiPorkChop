import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import fs from 'node:fs';
import {Attendance} from '../src/attendance.js';
const db=new DatabaseSync(':memory:');
const storage={sql:{exec(q,...args){return db.prepare(q).all(...args);}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const obj=new Attendance({storage},{MOTD_PIN:'0123'});
let now=Date.now();Date.now=()=>now;
const a=crypto.randomUUID(),b=crypto.randomUUID(),c=crypto.randomUUID();
async function call(path,body,id=a){
 const r=await obj.fetch(new Request('https://internal'+path,{method:body?'POST':'GET',headers:{'X-Visitor-ID':id},body:body?JSON.stringify(body):undefined}));
 return {status:r.status,...await r.json()};
}
await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).count,1);
assert.equal((await call('/attendance')).hostCount,1);
assert.equal((await call('/attendance')).checkedIn,false);
let roster=await call('/whois');
assert.equal(roster.here.length,1);assert.equal(roster.here[0].name,'PorkChop');assert.equal(roster.here[0].host,true);
for(let i=0;i<5;i++)await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).count,1);
assert.equal((await call('/attendance')).nicknameChosen,false);
let data=await call('/attendance',{action:'coming',nicknameChoice:{mode:'save',name:'  Sully  '}});
assert.equal(data.nickname,'Sully');assert.equal(data.nicknameChosen,true);assert.equal(data.onMyWay,true);
data=await call('/attendance',{action:'in'});
assert.equal(data.count,2);assert.equal(data.comingCount,0);
await call('/attendance',{action:'out'});
assert.equal((await call('/attendance')).count,1);
data=await call('/attendance',{action:'in',nicknameChoice:{mode:'skip'}},b);
assert.equal(data.nicknameChosen,true);assert.equal(data.nickname,'');assert.equal(data.count,2);
const expiry=data.expiresAt;
data=await call('/attendance',{action:'in',nicknameChoice:{mode:'skip'}},b);
assert.equal(data.expiresAt,expiry);assert.equal(data.count,2);
for(const nicknameChoice of [{mode:'save',name:''},{mode:'save',name:'x'.repeat(41)},{mode:'save',name:'bad\nname'},{mode:'other'},null]){
 assert.equal((await call('/attendance',{action:'in',nicknameChoice},c)).status,400);
}
assert.equal((await call('/attendance',undefined,c)).nicknameChosen,false);
assert.equal((await call('/attendance',undefined,c)).checkedIn,false);
await call('/device',{state:'CLOSED'});
assert.equal((await call('/attendance')).count,0);assert.deepEqual((await call('/whois')).here,[]);
assert.equal((await call('/attendance',{action:'in',nicknameChoice:{mode:'skip'}},c)).status,409);
assert.equal((await call('/attendance',undefined,c)).nicknameChosen,false);
now+=21*24*3600000;
await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance',undefined,b)).nicknameChosen,true);
assert.equal((await call('/attendance')).nickname,'Sully');
assert.equal((await call('/attendance')).count,1);
assert.equal(obj.motd.counts(now).hostCount,1);
db.prepare('INSERT INTO manual_counts VALUES (?,?,?)').run('checked',3,now+21600000);
assert.equal(obj.motd.counts(now).count,4);
assert.equal(obj.motd.counts(now).browserCount,0);
assert.equal(obj.motd.counts(now).manualCount,3);
now+=450001;
assert.equal((await call('/attendance')).hostCount,0);assert.deepEqual((await call('/whois')).here,[]);
await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).hostCount,1);
// A saved legacy nickname suppresses the first-time prompt without requiring a migration.
db.prepare('INSERT INTO profiles VALUES (?,?,?)').run(c,'Legacy',now+21600000);
assert.equal((await call('/attendance',undefined,c)).nicknameChosen,true);
await call('/attendance',{action:'nickname',name:''},c);
assert.equal((await call('/attendance',undefined,c)).nicknameChosen,true);

// Drive the real viewer script and attendance API together with a minimal DOM.
const viewer=fs.readFileSync(new URL('../src/viewer.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
async function ui(id){
 const nodes={},requests=[];
 const node=id=>nodes[id]??={value:'',disabled:false,open:false,events:{},addEventListener(k,fn){this.events[k]=fn;},showModal(){this.open=true;},close(){this.open=false;}};
 const context=vm.createContext({Date,document:{getElementById:node},setInterval(){},async fetch(path,options={}){
  if(path==='/api/attendance'){
   const body=options.body?JSON.parse(options.body):undefined;
   if(body)requests.push(body);
   const result=await call('/attendance',body,id);
   return {ok:result.status===200,json:async()=>result};
  }
  if(path==='/api/public-status')return {ok:true,json:async()=>({state:'OPEN',lastSeen:new Date(now).toISOString()})};
  return {ok:true,json:async()=>({message:''})};
 }});
 vm.runInContext(viewer,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {nodes,requests,run:code=>vm.runInContext(code,context)};
}
const freshId=crypto.randomUUID(),screen=await ui(freshId);
screen.run("beginAttendance('in')");
assert.equal(screen.nodes['nickname-prompt'].open,true);
assert.equal(screen.requests.length,0);
await screen.run("finishPrompt('save')");
assert.equal(screen.requests.length,0); // empty Save requests a name or Skip
screen.nodes['prompt-name'].value='New Buddy';
await screen.run("finishPrompt('save')");
assert.equal(screen.nodes['nickname-prompt'].open,false);
assert.equal(screen.requests.length,1); // atomic save and check-in
assert.equal((await call('/attendance',undefined,freshId)).nickname,'New Buddy');
const skippedId=crypto.randomUUID(),skipper=await ui(skippedId);
skipper.run("beginAttendance('coming')");await skipper.run("finishPrompt('skip')");
assert.equal((await call('/attendance',undefined,skippedId)).onMyWay,true);
const returning=await ui(skippedId);
returning.run("beginAttendance('in')");
await new Promise(resolve=>setImmediate(resolve));
assert.equal(returning.nodes['nickname-prompt'].open,false);
assert.equal((await call('/attendance',undefined,skippedId)).checkedIn,true);
const cancelled=await ui(crypto.randomUUID());
cancelled.run("beginAttendance('in')");
cancelled.nodes['prompt-cancel'].events.click();
assert.equal(cancelled.requests.length,0);assert.equal(cancelled.nodes['nickname-prompt'].open,false);
const failingId=crypto.randomUUID(),failing=await ui(failingId);
failing.run("beginAttendance('in')");
await call('/device',{state:'CLOSED'});
await failing.run("finishPrompt('skip')");
assert.equal(failing.nodes['nickname-prompt'].open,true);
assert.equal((await call('/attendance',undefined,failingId)).nicknameChosen,false);
assert.match(failing.nodes['prompt-feedback'].textContent,/Could not confirm/);
console.log('PASS: first-use Save/Skip/Cancel, remembered choices, atomic failures, legacy names, automatic host totals/roster, duplicate heartbeats, closure and stale status.');
