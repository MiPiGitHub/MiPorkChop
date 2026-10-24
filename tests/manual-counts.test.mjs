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
assert.equal(data.comingCount,1);assert.equal(data.count,0);assert.equal(data.comingExpiresAt,now+900000);
const expiry=data.comingExpiresAt;
now+=1000;data=await call('/attendance',{action:'coming'});assert.equal(data.comingExpiresAt,expiry);
await call('/attendance',{action:'coming'},b);
assert.equal((await call('/attendance')).comingCount,2);
// Same attendance API used by the QR page atomically converts inbound to arrived.
data=await call('/attendance',{action:'in'});assert.equal(data.count,1);assert.equal(data.comingCount,1);assert.equal(data.onMyWay,false);
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

const admin=browser(),guest=browser('192.0.2.2');
assert.equal((await guest.request('/api/motd/counts')).status,401);
assert.equal((await guest.request('/api/motd/counts','PUT',{kind:'checked',count:3})).status,401);
await admin.request('/api/motd/session','POST',{pin:'0123'});
await call('/device',{state:'OPEN'});
await call('/attendance',{action:'in'});
await call('/attendance',{action:'coming'},b);
let r=await admin.request('/api/motd/counts','PUT',{kind:'checked',count:3});
assert.equal(r.data.count,4);
r=await admin.request('/api/motd/counts','PUT',{kind:'coming',count:2});
assert.equal(r.data.comingCount,3);
data=await call('/attendance');assert.equal(data.count,4);assert.equal(data.comingCount,3);
for(const count of [-1,1.5,'4',501,null]){
 assert.equal((await admin.request('/api/motd/counts','PUT',{kind:'checked',count})).status,400);
}
assert.equal((await admin.request('/api/motd/counts','PUT',{kind:'checked',count:1},{Origin:'https://evil.example'})).status,403);
await call('/attendance',{action:'in'},b);
data=await call('/attendance');assert.equal(data.count,5);assert.equal(data.comingCount,2);
await admin.request('/api/motd/counts','PUT',{kind:'checked',count:1});
assert.equal((await call('/attendance')).count,3);
now+=800000;await call('/device',{state:'OPEN'});
await admin.request('/api/motd/counts','PUT',{kind:'coming',count:2});
now+=100001;await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).comingCount,0); // duplicate save did not renew
now+=21600000;await call('/device',{state:'OPEN'});
data=await call('/attendance');assert.equal(data.count,0);
await admin.request('/api/motd/counts','PUT',{kind:'checked',count:4});
now+=450001;
assert.equal((await admin.request('/api/motd/counts','PUT',{kind:'checked',count:5})).status,409);
await call('/device',{state:'CLOSED'});
assert.equal((await admin.request('/api/motd/counts')).data.count,0);
await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).count,0);
await admin.request('/api/motd/session','DELETE');
assert.equal((await admin.request('/api/motd/counts')).status,401);
console.log('PASS: manual totals, authorization/origin, validation, browser conversion, reduction, expiry, duplicate saves, stale state and closure.');
