export const MOTD_HTML=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dave’s Message Board • GarageMahal</title><meta name="robots" content="noindex,nofollow">
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box}[hidden]{display:none!important}
body{margin:0;background:#111827;color:#f8fafc;padding:24px 16px}main{max-width:520px;margin:auto;background:#1f2937;border:1px solid #374151;border-radius:22px;padding:24px}h1{font-size:1.6rem;margin-top:0}p{line-height:1.5;color:#cbd5e1}label{display:block;margin:16px 0 8px}input,textarea,button{font:inherit;border-radius:10px;border:1px solid #64748b;padding:12px;min-height:44px}input,textarea{width:100%;background:#111827;color:white}textarea{resize:vertical}button{cursor:pointer;background:#334155;color:white}button:disabled{opacity:.55;cursor:wait}.primary{background:#166534;border-color:#4ade80}.presets{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}small{color:#cbd5e1}#feedback{min-height:1.5em}a{color:#86efac}

.backup{margin:22px 0;padding:22px;border:1px solid #657184;border-radius:16px;background:#111923;text-align:center}.backup h2{margin:0;font-size:1.2rem}.backup p{font-size:.9rem}.switch-panel{position:relative;width:150px;height:180px;margin:24px auto 16px;border:3px solid #596575;border-radius:12px;background:linear-gradient(120deg,#374151,#111827);box-shadow:inset 0 0 15px #0009,0 8px 16px #0005}.switch-panel:before,.switch-panel:after{content:'+';position:absolute;color:#aab2bd;font-size:20px;top:2px}.switch-panel:before{left:8px}.switch-panel:after{right:8px}
#garage-toggle{position:absolute;inset:26px 18px 12px;background:transparent;border:0;display:flex;align-items:center;flex-direction:column;justify-content:space-between;font-weight:800}.toggle-stem{width:20px;height:57px;border-radius:12px;background:linear-gradient(90deg,#667180,#f8fafc,#778291);box-shadow:0 8px 0 10px #667180;transform:rotate(18deg);transition:transform .2s}#garage-toggle[aria-checked="true"] .toggle-stem{transform:rotate(-18deg)}#garage-toggle[aria-checked="true"]{color:#86efac}
#garage-cover{position:absolute;inset:18px 8px 6px;z-index:2;border:3px solid #f87171;border-bottom:10px solid #7f1d1d;border-radius:12px;background:linear-gradient(120deg,#ff6868,#b91c1c 65%,#7f1d1d);box-shadow:0 8px 12px #0008;color:white;font-weight:850;letter-spacing:.08em;transform-origin:top;transition:transform .25s,opacity .25s}.switch-panel.uncovered #garage-cover{transform:perspective(400px) rotateX(115deg);opacity:0;pointer-events:none}.backup small{display:block}button:focus-visible{outline:3px solid #fbbf24;outline-offset:4px}@media(prefers-reduced-motion:reduce){#garage-cover,.toggle-stem{transition:none}}
</style></head><body><main><h1>Dave’s message board</h1><p>Give the boys a reason to show up.</p>
<form id="login"><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="current-password" required><div class="actions"><button class="primary" type="submit">Unlock</button></div></form>
<section id="editor" hidden>
<section id="backup" class="backup" hidden aria-labelledby="backup-title">
<h2 id="backup-title">PorkChop’s backup switch</h2>
<p>MiPi is unavailable. You’re in charge, Dave.</p>
<div id="switch-panel" class="switch-panel">
<button id="garage-toggle" type="button" role="switch" aria-checked="false" aria-label="Open garage" disabled><span>ON</span><span class="toggle-stem" aria-hidden="true"></span><span>OFF</span></button>
<button id="garage-cover" type="button" aria-label="Lift red safety cover" aria-expanded="false">LIFT TO<br>UNLEASH<br>THE BOYZ</button>
</div>
<strong id="garage-state">Checking…</strong><p id="garage-help">Lift the cover, then flip the switch to open.</p>
<small>The MiPi takes control automatically when it reconnects.</small>
</section>
<p id="garage-feedback" role="status" aria-live="polite"></p>
<h2>PorkChop’s headcount</h2>
<p>PorkChop is counted automatically while the garage is open—Dave does not need to check in or add himself manually. Add other buddies who skipped checking in.</p>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
<form class="count-form" data-kind="checked"><h3>Checked in</h3><strong id="checked-total">—</strong><p id="checked-breakdown"></p><label for="checked-manual">Manually added</label><input id="checked-manual" type="number" inputmode="numeric" min="0" max="500" step="1" required value="0"><button type="submit">Save checked in</button></form>
<form class="count-form" data-kind="coming"><h3>On the way</h3><strong id="coming-total">—</strong><p id="coming-breakdown"></p><label for="coming-manual">Manually added</label><input id="coming-manual" type="number" inputmode="numeric" min="0" max="500" step="1" required value="0"><button type="submit">Save on the way</button></form>
</div>
<p>Manual counts expire after 6 hours checked in or 15 minutes on the way. Closing clears both. If a manually counted buddy checks in or arrives, reduce the manual count to avoid counting them twice.</p>
<p id="count-feedback" role="status"></p><p>Pick a starting point or write your own. Save when it’s ready.</p>
<div id="presets" class="presets" aria-label="Message presets"></div>
<form id="message-form"><label for="message">Message for the boys</label><textarea id="message" rows="4" maxlength="280" placeholder="Game’s on. Bring your questionable opinions."></textarea><small id="length">0 / 280</small>
<div class="actions"><button type="submit" class="primary">Save message</button><button id="clear" type="button">Clear message</button><button id="logout" type="button">Lock</button></div></form>
<p>The message appears while the GarageMahal is open. It stays saved until you change or clear it.</p></section>
<p id="feedback" role="status" aria-live="polite"></p><a href="/">Back to GarageMahal</a>
</main><script>
const login=document.getElementById('login'),editor=document.getElementById('editor'),pin=document.getElementById('pin'),message=document.getElementById('message'),feedback=document.getElementById('feedback');
let busy=false;
let garage=null,coverOpen=false,garageFetchedAt=0;
const backup=document.getElementById('backup'),cover=document.getElementById('garage-cover'),toggle=document.getElementById('garage-toggle'),garageFeedback=document.getElementById('garage-feedback');
function renderGarage(){
 const allowed=!editor.hidden&&garage&&!garage.deviceAvailable&&Date.now()-garageFetchedAt<30000;
 backup.hidden=!allowed;
 if(!allowed){coverOpen=false;toggle.disabled=true;return;}
 const open=garage.state==='OPEN';
 if(open)coverOpen=true;
 document.getElementById('switch-panel').classList.toggle('uncovered',coverOpen);
 cover.setAttribute('aria-expanded',String(coverOpen));cover.tabIndex=coverOpen?-1:0;
 toggle.tabIndex=coverOpen?0:-1;toggle.disabled=busy||!coverOpen;
 toggle.setAttribute('aria-checked',String(open));toggle.setAttribute('aria-label',open?'Close garage':'Open garage');
 cover.disabled=busy;
 document.getElementById('garage-state').textContent=open?'ON · Garage open':garage.state==='CLOSED'?'OFF · Garage closed':'Garage status unconfirmed';
 document.getElementById('garage-help').textContent=open?'Flip OFF to close the garage and lower the cover.':coverOpen?'Flip ON to open the garage.':'Lift the cover, then flip the switch to open.';
}
async function refreshGarage(){
 if(editor.hidden||busy)return;
 try{const next=await request('/api/motd/garage');if(next.state==='CLOSED'&&garage?.state==='OPEN')coverOpen=false;garage=next;garageFetchedAt=Date.now();garageFeedback.textContent=next.deviceAvailable?'MiPi is online. The physical switch has control.':'';}
 catch(error){garage=null;garageFeedback.textContent=error.message;}
 renderGarage();
}
cover.addEventListener('click',()=>{if(busy||!garage||garage.deviceAvailable)return;coverOpen=true;renderGarage();toggle.focus();});
toggle.addEventListener('click',async()=>{
 if(busy||toggle.disabled||!coverOpen)return;
 const target=garage.state==='OPEN'?'CLOSED':'OPEN';pending(true);garageFeedback.textContent='Updating garage…';
 try{garage=await request('/api/motd/garage','PUT',{state:target});garageFetchedAt=Date.now();coverOpen=garage.state==='OPEN';garageFeedback.textContent=coverOpen?'Garage open. The BOYZ can check in.':'Garage closed. Safety cover down.';}
 catch(error){garage=null;coverOpen=false;garageFeedback.textContent=error.message+' Refreshing status…';}
 finally{pending(false);await refreshCounts();if(!garage)await refreshGarage();else if(!coverOpen)cover.focus();}
});
setInterval(()=>{if(!busy)refreshGarage();},5000);
setInterval(renderGarage,1000);
const presets=[['🏈 Football','Football’s on. Bring your expert commentary.'],['⚽ Soccer','Soccer’s on. Yes, we’re calling it football for the next 90 minutes.'],['🎯 Darts','Darts are flying. Accuracy is optional.'],['🔥 Grilling','Grill’s fired up. Come supervise.'],['🍔 Bring food','Bring food. We have mouths to feed and questionable planning skills.']];
function length(){document.getElementById('length').textContent=message.value.length+' / 280';}
function locked(value){login.hidden=!value;editor.hidden=value;if(value){message.value='';length();garage=null;coverOpen=false;renderGarage();}else{refreshCounts();refreshGarage();}}
function pending(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);renderGarage();if(!value&&!editor.hidden&&!garage)refreshGarage();}
async function request(path,method='GET',body){
 const response=await fetch(path,{method,cache:'no-store',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await response.json();
 if(!response.ok){if(response.status===401)locked(true);throw Error(data.error||'Please try again.');}
 return data;
}
const dirtyCounts=new Set();
function renderCounts(data){
 for(const [kind,total,actual,manual] of [['checked',data.count,data.browserCount,data.manualCount],['coming',data.comingCount,data.browserComingCount,data.manualComingCount]]){
  document.getElementById(kind+'-total').textContent=total+' buddies';
  document.getElementById(kind+'-breakdown').textContent=actual+' browser + '+manual+' manual'+(kind==='checked'&&data.hostCount?' + 1 host (PorkChop)':'');
  if(!dirtyCounts.has(kind))document.getElementById(kind+'-manual').value=manual;
 }
 document.getElementById('count-feedback').textContent=data.canAdjust?'':'Counts can be adjusted when the garage is open and online.';
}
async function refreshCounts(){
 if(editor.hidden)return;
 try{renderCounts(await request('/api/motd/counts'));}
 catch(error){document.getElementById('count-feedback').textContent=error.message;}
}
document.querySelectorAll('.count-form').forEach(form=>{
 const kind=form.dataset.kind;
 document.getElementById(kind+'-manual').addEventListener('input',()=>dirtyCounts.add(kind));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;pending(true);
  try{
   const data=await request('/api/motd/counts','PUT',{kind,count:Number(document.getElementById(kind+'-manual').value)});
   dirtyCounts.delete(kind);renderCounts(data);document.getElementById('count-feedback').textContent='Headcount saved.';
  }catch(error){document.getElementById('count-feedback').textContent=error.message;}
  finally{pending(false);}
 });
});
setInterval(()=>{if(!busy)refreshCounts();},15000);
for(const [label,text] of presets){const button=document.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',()=>{message.value=text;length();feedback.textContent='Ready to save — edit it if you like.';});document.getElementById('presets').append(button);}
message.addEventListener('input',length);
login.addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;pending(true);feedback.textContent='Unlocking…';
 try{const data=await request('/api/motd/session','POST',{pin:pin.value});locked(false);message.value=data.message;length();feedback.textContent='Unlocked.';}
 catch(error){feedback.textContent=error.message;}finally{pin.value='';pending(false);}
});
async function save(text){
 if(busy)return;pending(true);feedback.textContent='Saving…';
 try{const data=await request('/api/motd','PUT',{message:text});message.value=data.message;length();feedback.textContent=data.message?'Saved. The boys will see it when the GarageMahal is open.':'Message cleared.';}
 catch(error){feedback.textContent=error.message||'Could not save. Try again.';}finally{pending(false);}
}
document.getElementById('message-form').addEventListener('submit',event=>{event.preventDefault();save(message.value);});
document.getElementById('clear').addEventListener('click',()=>save(''));
document.getElementById('logout').addEventListener('click',async()=>{if(busy)return;pending(true);try{await request('/api/motd/session','DELETE');locked(true);feedback.textContent='Locked.';}catch(error){feedback.textContent=error.message;}finally{pending(false);}});
(async()=>{pending(true);try{const data=await request('/api/motd/session');locked(false);message.value=data.message;length();}catch(error){if(error.message!=='Please enter your PIN')feedback.textContent=error.message;}finally{pending(false);}})();
</script></body></html>`;

