export const MOTD_HTML=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dave’s Message Board • GarageMahal</title><meta name="robots" content="noindex,nofollow">
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box}[hidden]{display:none!important}
body{margin:0;background:#111827;color:#f8fafc;padding:24px 16px}main{max-width:520px;margin:auto;background:#1f2937;border:1px solid #374151;border-radius:22px;padding:24px}h1{font-size:1.6rem;margin-top:0}p{line-height:1.5;color:#cbd5e1}label{display:block;margin:16px 0 8px}input,textarea,button{font:inherit;border-radius:10px;border:1px solid #64748b;padding:12px;min-height:44px}input,textarea{width:100%;background:#111827;color:white}textarea{resize:vertical}button{cursor:pointer;background:#334155;color:white}button:disabled{opacity:.55;cursor:wait}.primary{background:#166534;border-color:#4ade80}.presets{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}small{color:#cbd5e1}#feedback{min-height:1.5em}a{color:#86efac}
</style></head><body><main><h1>Dave’s message board</h1><p>Give the boys a reason to show up.</p>
<form id="login"><label for="pin">PIN</label><input id="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="current-password" required><div class="actions"><button class="primary" type="submit">Unlock</button></div></form>
<section id="editor" hidden>
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
const presets=[['🏈 Football','Football’s on. Bring your expert commentary.'],['⚽ Soccer','Soccer’s on. Yes, we’re calling it football for the next 90 minutes.'],['🎯 Darts','Darts are flying. Accuracy is optional.'],['🔥 Grilling','Grill’s fired up. Come supervise.'],['🍔 Bring food','Bring food. We have mouths to feed and questionable planning skills.']];
function length(){document.getElementById('length').textContent=message.value.length+' / 280';}
function locked(value){login.hidden=!value;editor.hidden=value;if(value){message.value='';length();}else{refreshCounts();}}
function pending(value){busy=value;document.querySelectorAll('button').forEach(b=>b.disabled=value);}
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

