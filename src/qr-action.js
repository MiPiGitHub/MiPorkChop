// Dedicated QR landing pages share the main viewer's browser cookie and API.
export function qrActionPage(action) {
 if (!['in', 'out'].includes(action)) throw new Error('Invalid QR action');
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GarageMahal • Check ${action}</title>
<style>:root{color-scheme:dark;font-family:system-ui,sans-serif}body{margin:0;min-height:100svh;display:grid;place-items:center;background:#111827;color:#fff;text-align:center}main{max-width:28rem;padding:2rem}h1{font-size:1.2rem;letter-spacing:.1em}#result{font-size:1.8rem}p{line-height:1.5}</style>
</head><body><main><h1>GARAGEMAHAL</h1><p id="result" role="status">Checking ${action}…</p><p id="detail"></p><noscript>JavaScript is needed to check ${action}. Please enable it and reload.</noscript></main>
<script>
(async()=>{
 const result=document.getElementById('result'),detail=document.getElementById('detail');
 const action=${JSON.stringify(action)};
 try{
  // Initialize/read the secure cookie before the write, including first-time visitors.
  const initial=await fetch('/api/attendance',{cache:'no-store',credentials:'same-origin'});
  if(!initial.ok)throw Error();
  const response=await fetch('/api/attendance',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  if(response.status===409){result.textContent='Check-in unavailable';detail.textContent='The GarageMahal must be open and online to check in.';return;}
  if(response.status===400){result.textContent='Cookies are needed';detail.textContent='Allow cookies in this browser, then scan again.';return;}
  if(!response.ok)throw Error();
  const data=await response.json();
  if(data.checkedIn!==(action==='in'))throw Error();
  result.textContent=action==='in'?'You’re checked in 🐷':'You’re checked out';
  detail.textContent='You can close this page.';
 }catch{
  result.textContent='Could not confirm the change';
  detail.textContent='Check your connection and scan this code again using the same browser.';
 }
})();
</script></body></html>`;
}
