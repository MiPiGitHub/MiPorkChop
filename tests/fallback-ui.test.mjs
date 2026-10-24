import assert from 'node:assert/strict';
import vm from 'node:vm';
import {MOTD_HTML} from '../src/motd-page.js';
const nodes={};
function node(id){return nodes[id]??={value:'',hidden:id==='editor',listeners:{},attrs:{},classList:{toggle(){}},addEventListener(e,fn){this.listeners[e]=fn;},setAttribute(k,v){this.attrs[k]=v;},append(){},focus(){}};}
let state='UNKNOWN',online=false,writes=0,auth=true;
const context=vm.createContext({Date,Set,document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>node(Math.random())},setInterval(){},fetch:async(path,options)=>{
 let status=200,data={};
 if(path==='/api/motd/session')data={authenticated:true,message:''};
 if(path==='/api/motd/counts')data={count:state==='OPEN'?1:0,comingCount:0,browserCount:0,browserComingCount:0,manualCount:0,manualComingCount:0,canAdjust:state==='OPEN'};
 if(path==='/api/motd/garage'){
  if(!auth){status=401;data={error:'Please enter your PIN'};}
  else{if(options.method==='PUT'){writes++;if(online){status=409;data={error:'MiPi is online'};}else state=JSON.parse(options.body).state;}
   if(status===200)data={state,deviceAvailable:online};}
 }
 return {ok:status===200,status,json:async()=>data};
}});
vm.runInContext(MOTD_HTML.match(/<script>([\s\S]*?)<\/script>/)[1],context);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(nodes.backup.hidden,false);assert.equal(nodes['garage-toggle'].disabled,true);
await nodes['garage-cover'].listeners.click();assert.equal(writes,0);assert.equal(nodes['garage-toggle'].disabled,false);
await nodes['garage-toggle'].listeners.click();assert.equal(state,'OPEN');assert.equal(nodes['garage-toggle'].attrs['aria-checked'],'true');
await nodes['garage-toggle'].listeners.click();assert.equal(state,'CLOSED');assert.equal(nodes['garage-cover'].attrs['aria-expanded'],'false');assert.equal(nodes['garage-toggle'].disabled,true);
state='OPEN';await vm.runInContext('refreshGarage()',context);assert.equal(nodes['garage-toggle'].attrs['aria-checked'],'true');
online=true;await vm.runInContext('refreshGarage()',context);assert.equal(nodes.backup.hidden,true);
online=false;auth=false;await vm.runInContext('refreshGarage()',context);assert.equal(nodes.editor.hidden,true);assert.equal(nodes.backup.hidden,true);
console.log('PASS: cover-only action, guarded open, close/reset, restored open state, device reconnect, session expiry.');
