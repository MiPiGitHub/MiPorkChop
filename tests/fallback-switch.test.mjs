import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Attendance} from '../src/attendance.js';
import worker from '../src/worker.js';
const db=new DatabaseSync(':memory:');
const storage={sql:{exec(q,...args){return db.prepare(q).all(...args);}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
let now=Date.now();Date.now=()=>now;
const obj=new Attendance({storage},{MOTD_PIN:'0123'}),origin='https://porkchop.mipi.support';
const env={ATTENDANCE:{idFromName:n=>n,get:()=>obj},STATUS_KV:{get:async()=>({switchState:'CLOSED',lastSeen:new Date(now).toISOString()}),put:async()=>{}},DEVICE_API_TOKEN:'fixture'};
let cookie='';
async function api(path,method='GET',body,extra={}){
 const r=await worker.fetch(new Request(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)}),env);
 if(r.headers.has('Set-Cookie'))cookie=r.headers.get('Set-Cookie').split(';')[0];
 return {status:r.status,data:await r.json()};
}
async function internal(path,body){const r=await obj.fetch(new Request('https://internal'+path,{method:body?'POST':'GET',headers:{'X-Visitor-ID':'11111111-1111-1111-1111-111111111111'},body:body?JSON.stringify(body):undefined}));return {status:r.status,data:await r.json()};}
assert.equal((await api('/api/motd/garage','PUT',{state:'OPEN'})).status,401);
await api('/api/motd/session','POST',{pin:'0123'});
assert.equal((await api('/api/motd/garage')).data.deviceAvailable,false);
assert.equal((await api('/api/motd/garage','PUT',{state:'OPEN'},{Origin:'https://evil.example'})).status,403);
assert.equal((await api('/api/motd/garage','PUT',{state:'INVALID'})).status,400);
assert.equal((await api('/api/motd/garage','PUT',{state:'OPEN'})).status,200);
let status=(await api('/api/public-status')).data;
assert.equal(status.source,'manual');assert.equal(status.state,'OPEN');assert.equal(status.lastSeen,null);
assert.equal((await internal('/attendance',{action:'in'})).status,200);
assert.equal((await api('/api/motd/counts')).data.hostCount,1);
assert.equal((await api('/api/whois')).data.here[0].name,'PorkChop');
now+=451000;
assert.equal((await api('/api/public-status')).data.state,'OPEN');
assert.equal((await api('/api/motd/counts','PUT',{kind:'coming',count:3})).status,200);
await api('/api/motd/garage','PUT',{state:'CLOSED'});
assert.equal((await internal('/attendance')).data.count,0);assert.equal((await internal('/attendance')).data.comingCount,0);
await api('/api/motd/garage','PUT',{state:'OPEN'});
// Returning CLOSED device wins, clears attendance and invalidates the manual setting.
await api('/api/status','POST',{state:'CLOSED'},{Authorization:'Bearer fixture'});
assert.equal((await api('/api/public-status')).data.source,'physical-switch');
assert.equal((await api('/api/motd/garage','PUT',{state:'OPEN'})).status,409);
now+=450000;assert.equal((await api('/api/motd/garage')).data.deviceAvailable,true);
now++;assert.equal((await api('/api/public-status')).data.state,'UNKNOWN');
await api('/api/motd/garage','PUT',{state:'CLOSED'});
await api('/api/status','POST',{state:'OPEN'},{Authorization:'Bearer fixture'});
assert.equal((await api('/api/public-status')).data.state,'OPEN');
assert.equal((await api('/api/motd/garage','PUT',{state:'CLOSED'})).status,409);
// Back-to-back requests serialize: a heartbeat that wins first rejects the manual write.
await Promise.all([internal('/device',{state:'CLOSED'}),api('/api/motd/garage','PUT',{state:'OPEN'})]);
assert.equal((await api('/api/public-status')).data.state,'CLOSED');
now+=8*3600000;assert.equal((await api('/api/motd/garage','PUT',{state:'OPEN'})).status,401);
console.log('PASS: fallback authorization, origin, missing device, stale threshold, persistent manual state, attendance, returning device priority and invalidated override.');
