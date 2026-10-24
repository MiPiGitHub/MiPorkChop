import assert from 'node:assert/strict';
import vm from 'node:vm';
import {DatabaseSync} from 'node:sqlite';
import {Attendance} from '../src/attendance.js';
import worker from '../src/worker.js';

const db=new DatabaseSync(':memory:');
const storage={sql:{exec(q,...args){return db.prepare(q).all(...args);}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const obj=new Attendance({storage}),env={ATTENDANCE:{idFromName:n=>n,get:()=>obj}};
const origin='https://porkchop.mipi.support';
let now=Date.now();Date.now=()=>now;
async function state(value){await obj.fetch(new Request('https://internal/device',{method:'POST',body:JSON.stringify({state:value})}));}
function browser(){
 let cookie='other=value',actions=[];
 return {
  actions,
  async fetch(path,options={}){
   const headers=new Headers(options.headers);
   headers.set('Cookie',cookie);
   if(options.method==='POST'){
    headers.set('Origin',origin);actions.push(JSON.parse(options.body).action);
   }
   const r=await worker.fetch(new Request(origin+path,{...options,headers}),env);
   const set=r.headers.get('Set-Cookie');if(set)cookie='other=value; '+set.split(';')[0];
   return r;
  },
  async scan(path){
   const page=await this.fetch(path);assert.equal(page.status,200);
   const html=await page.text();assert(!html.includes('<button'));
   const nodes={result:{},detail:{}};
   await vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],{document:{getElementById:id=>nodes[id]},fetch:this.fetch.bind(this)});
   return nodes.result.textContent;
  },
  async status(){return (await this.fetch('/api/attendance')).json();}
 };
}
await state('OPEN');
const first=browser(),second=browser();
// A QR document GET alone does not check anyone in.
await first.fetch('/check-in');assert.equal((await first.status()).count,1);
assert.match(await first.scan('/check-in'),/You’re checked in/);
const expiry=(await first.status()).expiresAt;
now+=1000;await first.scan('/check-in');
assert.equal((await first.status()).count,2);assert.equal((await first.status()).expiresAt,expiry);
await second.scan('/check-in');assert.equal((await first.status()).count,3);
await first.scan('/check-out');await first.scan('/check-out');
assert.equal((await second.status()).count,2);assert.deepEqual(first.actions,['in','in','out','out']);
await state('CLOSED');assert.equal(await first.scan('/check-in'),'Check-in unavailable');
assert.equal(await first.scan('/check-out'),'You’re checked out');
await state('OPEN');await first.scan('/check-in');now+=450001;
assert.equal(await second.scan('/check-in'),'Check-in unavailable');
assert.equal(await first.scan('/check-out'),'You’re checked out');
await state('OPEN');await first.scan('/check-in');now+=6*60*60*1000;
assert.equal((await first.status()).count,0);
for(const path of ['/check-in','/check-out']){
 const r=await worker.fetch(new Request('http://porkchop.mipi.support'+path),env);
 assert.equal(r.status,308);assert.equal(r.headers.get('Location'),origin+path);
 assert.equal((await worker.fetch(new Request(origin+path,{method:'POST'}),env)).status,405);
}
console.log('PASS: QR first visit, existing cookie after other cookies, action isolation, repeat scans, two browsers, fixed expiry, closure, stale checkout, HTTPS redirect.');
