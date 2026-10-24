export const WHOIS_HTML=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Who’s buzzin’? • GarageMahal</title><meta name="robots" content="noindex,nofollow">
<style>
:root{color-scheme:dark;font-family:system-ui,-apple-system,sans-serif}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(ellipse at top,#243444,#101720 70%);color:#f1f5f9;padding:40px 16px}
main{max-width:820px;margin:auto}.eyebrow{color:#a3b5c5;font-size:.75rem;letter-spacing:.2em;font-weight:700}
header{margin:24px 0 30px}h1{font-size:clamp(2rem,7vw,3.5rem);margin:10px 0;letter-spacing:-.045em}header p{color:#b6c5d3;line-height:1.6}
.status{display:inline-block;border:1px solid #495766;border-radius:24px;padding:7px 12px;color:#cbd5e1;font-size:.85rem}
.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
section{background:#1c2835;border:1px solid #354554;border-radius:20px;padding:24px;min-height:230px;box-shadow:0 12px 30px #0002}
section:first-child{border-top:3px solid #86efac}section:last-child{border-top:3px solid #fbbf24}
h2{font-size:1.05rem;margin:0 0 8px}.total{font-size:2.7rem;line-height:1.2;font-weight:750;margin:12px 0 20px}
#here-total{color:#86efac}#coming-total{color:#fcd34d}ul{list-style:none;padding:0;margin:0}
li{padding:12px 0;border-top:1px solid #344252;overflow-wrap:anywhere;font-size:1.05rem}
.empty,.unnamed{color:#acbdcc;font-size:.9rem;line-height:1.6}.unnamed{margin-top:16px}
footer{margin-top:24px;color:#9eafbf;font-size:.85rem;line-height:1.7}a{color:#a7f3d0;text-decoration:none}a:hover{text-decoration:underline}
@media(max-width:460px){body{padding:22px 12px}.columns{gap:10px}section{padding:16px 12px}h2{font-size:.9rem}.total{font-size:2.2rem}li{font-size:.95rem}}
</style></head><body><main>
<div class="eyebrow">GARAGEMAHAL / THE ROLL CALL</div>
<header><h1>Who’s buzzin’?</h1><p>The usual suspects. And a few who know better.</p><span class="status" id="status" role="status">Checking the garage…</span></header>
<div class="columns">
<section aria-labelledby="here-heading"><h2 id="here-heading">At the GarageMahal</h2><div class="total" id="here-total">—</div><ul id="here-list"></ul><p class="unnamed" id="here-unnamed"></p><p class="empty" id="here-empty">Checking attendance…</p></section>
<section aria-labelledby="coming-heading"><h2 id="coming-heading">On the way</h2><div class="total" id="coming-total">—</div><ul id="coming-list"></ul><p class="unnamed" id="coming-unnamed"></p><p class="empty" id="coming-empty">Checking attendance…</p></section>
</div>
<footer><a href="/">← Back to GarageMahal</a><p>Nicknames are supplied by the buddies. King of the Hill names marked “incognito” are playful browser aliases, not real identities; repeats are possible. Unnamed buddies are Dave’s manual additions. No attendance history.</p></footer>
</main><script>
let roster=null;
function render(){
 const now=Date.now(),fresh=roster&&Number.isFinite(roster.lastSeen)&&now-roster.lastSeen<=450000;
 const state=fresh?roster.state:'UNKNOWN';
 document.getElementById('status').textContent=state==='OPEN'?'OPEN · Boys are buzzin’':state==='CLOSED'?'CLOSED · The garage is taking a breather':'SERVICE UNAVAILABLE · Attendance unconfirmed';
 for(const key of ['here','coming']){
  const rows=state==='OPEN'?(roster[key]??[]).filter(row=>row.expiresAt>now):[];
  const named=rows.filter(row=>row.name),unnamed=rows.filter(row=>!row.name).reduce((n,row)=>n+(row.count??1),0);
  document.getElementById(key+'-total').textContent=state==='UNKNOWN'?'—':named.length+unnamed;
  const list=document.getElementById(key+'-list');list.replaceChildren();
  for(const row of named){const li=document.createElement('li');li.textContent=row.name;list.append(li);}
  document.getElementById(key+'-unnamed').textContent=unnamed?(named.length?'Plus ':'')+unnamed+' unnamed '+(unnamed===1?'buddy':'buddies'):'';
  document.getElementById(key+'-empty').textContent=state==='UNKNOWN'?'Waiting for a confirmed garage status.':state==='CLOSED'?'See you next time.':rows.length?'':key==='here'?'No buddies checked in yet.':'Nobody inbound. Yet.';
 }
}
async function refresh(){
 try{const response=await fetch('/api/whois',{cache:'no-store'});if(!response.ok)throw Error();roster=await response.json();}
 catch{roster=null;}render();
}
refresh();setInterval(refresh,15000);setInterval(render,1000);
</script></body></html>`;
