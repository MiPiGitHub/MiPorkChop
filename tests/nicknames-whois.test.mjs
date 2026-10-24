import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import {Attendance} from '../src/attendance.js';
import worker from '../src/worker.js';
import {WHOIS_HTML} from '../src/whois-page.js';
const db=new DatabaseSync(':memory:');
const storage={sql:{exec(q,...args){return db.prepare(q).all(...args);}},transactionSync(fn){db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
const obj=new Attendance({storage},{MOTD_PIN:'0123'});
const env={ATTENDANCE:{idFromName:n=>n,get:()=>obj}};
const origin='https://porkchop.mipi.support';
let now=Date.now();Date.now=()=>now;
const a=crypto.randomUUID(),b=crypto.randomUUID();
async function call(path,body,id=a){
 const response=await obj.fetch(new Request('https://internal'+path,{method:body?'POST':'GET',headers:{'X-Visitor-ID':id},body:body?JSON.stringify(body):undefined}));
 return {status:response.status,...await response.json()};
}
await call('/device',{state:'CLOSED'});
assert.equal((await call('/attendance',{action:'nickname',name:'  Sully  '})).nickname,'Sully');
assert.deepEqual((await call('/whois')).here,[]);
now+=21*24*3600000;
await call('/device',{state:'OPEN'});
assert.equal((await call('/attendance')).nickname,'Sully');
await call('/attendance',{action:'coming'});
let roster=await call('/whois');assert.equal(roster.coming[0].name,'Sully');assert.equal(roster.here.length,0);
await call('/attendance',{action:'in'});
roster=await call('/whois');assert.equal(roster.here[0].name,'Sully');assert.equal(roster.coming.length,0);
await call('/attendance',{action:'in'},b);
db.prepare('INSERT INTO manual_counts VALUES (?,?,?)').run('checked',2,now+21600000);
roster=await call('/whois');assert.equal(roster.here.filter(x=>!x.name).reduce((n,x)=>n+(x.count??1),0),2);
const expiry=(await call('/attendance')).expiresAt;
await call('/attendance',{action:'nickname',name:'<img src=x onerror=alert(1)>'});
assert.equal((await call('/attendance')).expiresAt,expiry);
assert.equal((await call('/whois')).here.find(x=>!x.incognito&&x.name).name,'<img src=x onerror=alert(1)>');
for(const name of ['x'.repeat(41),'bad\nname','\u202ename',5,null]){
 assert.equal((await call('/attendance',{action:'nickname',name})).status,400);
}
await call('/attendance',{action:'nickname',name:''});
assert.equal((await call('/attendance')).nickname,'');
assert.equal((await call('/attendance')).checkedIn,true);
assert.equal((await call('/whois')).here.filter(x=>x.name&&!x.incognito).length,0);
await call('/attendance',{action:'nickname',name:'Sully'});
await call('/device',{state:'CLOSED'});
assert.equal((await call('/whois')).here.length,0);
assert.equal((await call('/attendance')).nickname,'Sully');
await call('/device',{state:'OPEN'});
await call('/attendance',{action:'coming'});
now+=900000;await call('/device',{state:'OPEN'});
assert.equal((await call('/whois')).coming.length,0);
await call('/attendance',{action:'in'});
now+=450001;
assert.equal((await call('/whois')).state,'UNKNOWN');
assert.deepEqual((await call('/whois')).here,[]);
await call('/device',{state:'OPEN'});
assert((await call('/whois')).here.some(x=>x.name==='Sully'));
now+=21600000;await call('/device',{state:'OPEN'});
assert.equal((await call('/whois')).here.length,0);
assert.equal((await call('/attendance')).nickname,'Sully');
now+=366*24*3600000;
assert.equal((await call('/attendance')).nickname,'');
for(const path of ['/WHOIS','/whois']){
 const response=await worker.fetch(new Request(origin+path),env);
 assert.equal(response.status,200);assert.equal(await response.text(),WHOIS_HTML);
 const redirect=await worker.fetch(new Request('http://porkchop.mipi.support'+path),env);
 assert.equal(redirect.status,308);
}
assert.equal((await worker.fetch(new Request(origin+'/api/whois',{method:'POST'}),env)).status,405);
const unauth=await worker.fetch(new Request(origin+'/api/attendance',{method:'POST',headers:{Origin:origin},body:JSON.stringify({action:'nickname',name:'test'})}),env);
assert.equal(unauth.status,400);
const evil=await worker.fetch(new Request(origin+'/api/attendance',{method:'POST',headers:{Origin:'https://evil.example',Cookie:'__Host-miporkchop='+a},body:JSON.stringify({action:'nickname',name:'test'})}),env);
assert.equal(evil.status,403);
// Execute the list renderer: user names remain text and stale/expired rows disappear.
const nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',children:[],replaceChildren(){this.children=[];},append(x){this.children.push(x);}});return nodes.get(id);}
const context=vm.createContext({Date,document:{getElementById:node,createElement:()=>({textContent:''})}});
const script=WHOIS_HTML.match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(script.slice(0,script.indexOf('async function refresh')),context);
context.sample={state:'OPEN',lastSeen:now,here:[{name:'<img src=x>',expiresAt:now+1000},{name:null,count:2,expiresAt:now+1000}],coming:[]};
vm.runInContext('roster=sample;render()',context);
assert.equal(node('here-list').children[0].textContent,'<img src=x>');
assert.equal(node('here-unnamed').textContent,'Plus 2 unnamed buddies');
now+=1001;vm.runInContext('render()',context);assert.equal(node('here-list').children.length,0);
now+=450001;vm.runInContext('render()',context);assert.equal(node('here-total').textContent,'—');
console.log('PASS: remembered optional names, anonymous/manual counts, conversion, forget, expiry, closure, stale privacy, routes, origin protection and safe roster rendering.');
