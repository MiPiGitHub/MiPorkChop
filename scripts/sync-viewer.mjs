// Keep the readable viewer and the Worker's embedded copy byte-for-byte equal.
import fs from 'node:fs';
const workerPath=new URL('../src/worker.js',import.meta.url);
const html=fs.readFileSync(new URL('../src/viewer.html',import.meta.url),'utf8');
const worker=fs.readFileSync(workerPath,'utf8');
const start=worker.indexOf('const VIEWER_HTML='),end=worker.indexOf('\n',start);
if(start<0||end<0)throw Error('Embedded viewer not found');
fs.writeFileSync(workerPath,worker.slice(0,start)+'const VIEWER_HTML='+JSON.stringify(html)+';'+worker.slice(end));
