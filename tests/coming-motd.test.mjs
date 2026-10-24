import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import fs from 'node:fs';
import {Attendance} from '../src/attendance.js';
import {MOTD_HTML} from '../src/motd-page.js';
import worker from '../src/worker.js';

const db=new DatabaseSync(':memory:');
const storage={sql:{exec(q,...args){return db.prepare(q).all(...args);}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
// Fixture PIN only. The real PIN is configured as a Cloudflare secret.
const secrets={MOTD_PIN:'0123'},obj=new Attendance({storage},secrets);
const env={ATTENDANCE:{idFromName:n=>n,get:()=>obj}};
const origin='https://porkchop.mipi.support';
let now=Date.now();Date.now=()=>now;
const a=crypto.randomUUID(),b=crypto.randomUUID();
async function call(path,body,id=a){const r=await obj.fetch(new Request('https://internal'+path,{method:body?'POST':'GET',headers:{'X-Visitor-ID':id},body:body?JSON.stringify(body):undefined}));return {status:r.status,...await r.json()};}
await call('/device',{state:'OPEN'});
let data=await call('/attendance',{action:'coming'});
assert.equal(data.comingCount,1);assert.equal(data.count,1);assert.equal(data.comingExpiresAt,now+900000);
const expiry=data.comingExpiresAt;
now+=1000;data=await call('/attendance',{action:'coming'});assert.equal(data.comingExpiresAt,expiry);
await call('/attendance',{action:'coming'},b);
assert.equal((await call('/attendance')).comingCount,2);
// Same attendance API used by the QR page atomically converts inbound to arrived.
data=await call('/attendance',{action:'in'});assert.equal(data.count,2);assert.equal(data.comingCount,1);assert.equal(data.onMyWay,false);
assert.equal(data.expiresAt,now+21600000);
data=await call('/attendance',{action:'coming'});assert.equal(data.onMyWay,false);assert.equal(data.comingCount,1);
await call('/attendance',{action:'cancel-coming'},b);assert.equal((await call('/attendance')).comingCount,0);
await call('/attendance',{action:'coming'},b);now+=900000;await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).comingCount,0);
await call('/attendance',{action:'coming'},b);await call('/device',{state:'CLOSED'});
data=await call('/attendance');assert.equal(data.count,0);assert.equal(data.comingCount,0);
assert.equal((await call('/attendance',{action:'coming'})).status,409);
await call('/device',{state:'OPEN'});now+=450001;
assert.equal((await call('/attendance',{action:'coming'})).status,409);

function browser(ip='192.0.2.1'){
 let cookie='other=value';
 return {async request(path,method='GET',body,extra={}){
  const headers={Cookie:cookie,'CF-Connecting-IP':ip,...(method==='GET'?{}:{Origin:origin}),'Content-Type':'application/json',...extra};
  const r=await worker.fetch(new Request(origin+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env);
  const set=r.headers.get('Set-Cookie');if(set)cookie='other=value; '+set.split(';')[0];
  return {status:r.status,headers:r.headers,data:await r.json()};
 }};
}
const admin=browser(),publicBrowser=browser('192.0.2.2');
assert.equal((await admin.request('/api/motd','PUT',{message:'Unauthorized'})).status,401);
assert.equal((await admin.request('/api/motd/session','POST',{pin:'0123'},{Origin:'https://evil.example'})).status,403);
assert.equal((await admin.request('/api/motd/session','POST',{pin:'0123'})).status,200);
data=await admin.request('/api/motd/session');assert.equal(data.data.authenticated,true);
const message='<img src=x onerror=alert(1)> Football & grilling';
assert.equal((await admin.request('/api/motd','PUT',{message})).status,200);
assert.equal((await publicBrowser.request('/api/motd')).data.message,message);
assert.equal((await admin.request('/api/motd','PUT',{message:'x'.repeat(281)})).status,400);
assert.equal((await admin.request('/api/motd','PUT',{message:5})).status,400);
assert.equal((await publicBrowser.request('/api/motd')).data.message,message);
await admin.request('/api/motd','PUT',{message:''});assert.equal((await publicBrowser.request('/api/motd')).data.message,'');
await admin.request('/api/motd/session','DELETE');assert.equal((await admin.request('/api/motd','PUT',{message:'no'})).status,401);
const guesses=browser('192.0.2.3');
for(let i=0;i<5;i++)assert.equal((await guesses.request('/api/motd/session','POST',{pin:'wrong'})).status,401);
const limited=await guesses.request('/api/motd/session','POST',{pin:'0123'});assert.equal(limited.status,429);assert(limited.headers.get('Retry-After'));
now+=900001;assert.equal((await guesses.request('/api/motd/session','POST',{pin:'0123'})).status,200);
now+=8*60*60*1000;assert.equal((await guesses.request('/api/motd','PUT',{message:'expired'})).status,401);
await admin.request('/api/motd/session','POST',{pin:'0123'});secrets.MOTD_PIN='4567';
assert.equal((await admin.request('/api/motd/session')).status,401);
secrets.MOTD_PIN=undefined;assert.equal((await admin.request('/api/motd/session','POST',{pin:'4567'})).status,503);
assert.equal((await publicBrowser.request('/api/motd')).status,200);
for(const path of ['/MOTD','/motd']){
 let r=await worker.fetch(new Request(origin+path),env);assert.equal(r.status,200);assert.equal(await r.text(),MOTD_HTML);
 r=await worker.fetch(new Request('http://porkchop.mipi.support'+path),env);assert.equal(r.status,308);
}
assert.equal((await worker.fetch(new Request('http://porkchop.mipi.support/api/motd/session',{method:'POST',body:'{}'}),env)).status,403);
new Function(MOTD_HTML.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(!MOTD_HTML.includes('0123'));assert(!MOTD_HTML.includes('4567'));

// Run the viewer with a fake DOM: text remains text and controls track state.
const html=fs.readFileSync(new URL('../src/viewer.html',import.meta.url),'utf8'),nodes={};
const context=vm.createContext({document:{getElementById:id=>nodes[id]??={addEventListener(){}}},fetch:()=>new Promise(()=>{}),setInterval(){}});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
vm.runInContext(`last={state:'OPEN',lastSeen:new Date().toISOString()};attendance={canCheckIn:true,available:true,checkedIn:false,onMyWay:true,comingExpiresAt:Date.now()+900000,comingCount:1,count:0};motdMessage=${JSON.stringify(message)};render();renderAttendance();`,context);
assert.equal(nodes.motd.textContent,message);assert.equal(nodes.motd.innerHTML,undefined);assert.equal(nodes.motd.hidden,false);
assert.equal(nodes['coming-button'].textContent,'Cancel on my way');assert.equal(nodes['attendance-button'].hidden,false);
vm.runInContext("attendance.checkedIn=true;attendance.expiresAt=Date.now()+21600000;renderAttendance();",context);
assert.equal(nodes['coming-button'].hidden,true);assert.equal(nodes['attendance-button'].textContent,"I'm leaving");
vm.runInContext("last.state='CLOSED';render();renderAttendance();",context);
assert.equal(nodes['attendance-section'].hidden,true);assert.equal(nodes.motd.hidden,true);
// Closed messages rotate only after 30 seconds and wrap through every message.
vm.runInContext('globalThis.clock=Date.now();Date.now=()=>clock;closedMessageIndex=0;closedMessageSince=null;render();',context);
const firstClosedMessage=nodes['closed-note'].textContent;
assert.equal(nodes['closed-note'].hidden,false);
vm.runInContext('clock+=29999;render();',context);
assert.equal(nodes['closed-note'].textContent,firstClosedMessage);
vm.runInContext('clock+=1;render();',context);
assert.notEqual(nodes['closed-note'].textContent,firstClosedMessage);
vm.runInContext('clock+=30000*(closedMessages.length-1);render();',context);
assert.equal(nodes['closed-note'].textContent,firstClosedMessage);
vm.runInContext("last.state='UNKNOWN';render();renderAttendance();",context);
assert.equal(nodes['closed-note'].hidden,true);
vm.runInContext("last={state:'OPEN',lastSeen:new Date(Date.now()).toISOString()};render();",context);
assert.equal(nodes['closed-note'].hidden,true);
vm.runInContext("last.state='CLOSED';render();clock+=451000;render();",context);
assert.equal(nodes['closed-note'].hidden,true);
vm.runInContext("last.state='UNKNOWN';render();renderAttendance();",context);
assert.equal(nodes['coming-button'].hidden,true);assert.equal(nodes['attendance-button'].hidden,true);
console.log('PASS: inbound conversion/expiry/cancellation/closure; PIN/session/origin/rate limits; messages/save/clear/XSS text safety; viewer controls and editor syntax.');
