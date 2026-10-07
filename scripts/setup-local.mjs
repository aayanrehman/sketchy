import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
const provider = process.env.SETUP_PROVIDER === 'openai' ? 'openai' : 'fal';
const providerName = provider === 'fal' ? 'fal.ai' : 'OpenAI';
const port = Number(process.env.SETUP_PORT || 3001);
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(32).toString('hex');
const envPath = path.resolve('.env');
let saved = false;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sketchy · Private setup</title><style>
*{box-sizing:border-box}body{margin:0;background:#bde5fc;color:#29283e;font:17px/1.5 system-ui;display:grid;place-items:center;min-height:100vh;padding:24px}main{max-width:520px;background:#fffdf4;border:3px solid #29283e;border-radius:24px;padding:28px;box-shadow:0 7px 0 #29283e}h1{margin:0;font-size:36px}p{margin:12px 0}label{display:block;font-weight:750;margin-top:18px}input{width:100%;padding:13px;border:2px solid #29283e;border-radius:10px;font:inherit;margin-top:7px}button{width:100%;padding:14px;background:#ffd95c;border:2px solid #29283e;border-radius:12px;font:750 17px system-ui;margin-top:22px;cursor:pointer}small{display:block;color:#565466;margin-top:8px}#status{font-weight:750}a{color:#194e82}input:focus,button:focus{outline:3px solid #4389c2;outline-offset:3px}</style>
<main><small>LOCAL SETUP · THIS COMPUTER ONLY</small><h1>Connect Sketchy</h1><p>Paste your ${providerName} API key below. It goes directly to a private server file on this Mac. It is never returned to the page, saved in browser storage, or included in the game bundle.</p>
<form id="form"><label for="key">${providerName} API key</label><input id="key" type="password" autocomplete="off" spellcheck="false" required placeholder="${provider === 'fal' ? 'Paste your fal key' : 'sk-…'}"><small>${provider === 'fal' ? 'fal.ai · gpt-image-1-mini edits, low quality<br>GPT-4.1 mini ratings through fal’s vision router' : 'Image model: gpt-image-1-mini · Low quality, 1024 × 1024<br>Judge: gpt-4.1-mini · Original sketches only'}</small>
<label for="limit">Daily request cap, for each AI job type</label><input id="limit" type="number" min="1" max="1000" step="1" value="48" required><small>48 allows up to 48 image edits and 48 ratings per UTC day across this server. An eight-player, three-round game uses up to 24 of each. This caps requests, not the provider's dollar billing.</small>
<button id="save">Save key & enable live testing</button><p id="status" role="status" aria-live="polite"></p></form><small>The key stays in the git-ignored .env file with owner-only permissions. Public hosting will use the host's secret manager.</small></main>
<script>const form=document.getElementById('form');form.addEventListener('submit',async e=>{e.preventDefault();const input=document.getElementById('key');const status=document.getElementById('status');const button=document.getElementById('save');button.disabled=true;status.textContent='Saving locally…';let key=input.value.trim();input.value='';try{const res=await fetch('/save',{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Token':'${csrf}'},body:JSON.stringify({key,limit:Number(document.getElementById('limit').value)})});key='';const body=await res.json();if(!res.ok)throw Error(body.error||'Could not save');status.textContent='Saved securely. You can close this tab. Codex can now restart the game and test the live pipeline.';form.reset();button.textContent='Key saved';}catch(e){key='';status.textContent=e.message;button.disabled=false;}});</script></html>`;
const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end();}
  if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(saved?'<!doctype html><p>Key saved. You may close this tab.</p>':html);}
  if(req.method!=='POST'||req.url!=='/save'||req.headers.origin!==origin||req.headers['x-setup-token']!==csrf||saved){res.writeHead(403);return res.end();}
  res.setHeader('Content-Type','application/json');
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('Request too large');}
    const {key,limit}=JSON.parse(body);body='';
    if(typeof key!=='string'||!(provider === 'fal' ? /^[A-Za-z0-9_:-]{20,500}$/ : /^sk-[A-Za-z0-9_-]{20,500}$/).test(key))throw Error('Please enter a valid API key.');
    if(!Number.isInteger(limit)||limit<1||limit>1000)throw Error('Choose a daily request cap from 1 to 1000.');
    const values=provider === 'fal' ? {FAL_KEY:key,AI_MODE:'fal',LIVE_AI_ENABLED:'true',AI_DAILY_JOB_LIMIT:String(limit),AI_CONCURRENCY:'8'} : {OPENAI_API_KEY:key,OPENAI_IMAGE_MODEL:'gpt-image-1-mini',OPENAI_IMAGE_QUALITY:'low',OPENAI_JUDGE_MODEL:'gpt-4.1-mini',JUDGE_BASE_URL:'https://api.openai.com/v1',JUDGE_API_KEY:'',AI_MODE:'openai',LIVE_AI_ENABLED:'true',AI_DAILY_JOB_LIMIT:String(limit),AI_CONCURRENCY:'8'};
    const existing=await fs.readFile(envPath,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
    const retained=existing.split('\n').filter(line=>!Object.keys(values).some(k=>line.startsWith(k+'=')));
    const contents=[...retained,...Object.entries(values).map(([k,v])=>k+'='+v),''].join('\n');
    const temp=envPath+'.setup-tmp';await fs.writeFile(temp,contents,{mode:0o600,flag:'wx'});await fs.rename(temp,envPath);await fs.chmod(envPath,0o600);
    saved=true;res.end(JSON.stringify({ok:true}));console.log('SETUP_SAVED: '+providerName+' configured; secret omitted.');
  }catch(e){res.statusCode=400;res.end(JSON.stringify({error: ['Please enter a valid API key.','Choose a daily request cap from 1 to 1000.','Request too large'].includes(e.message)?e.message:'Could not save configuration. Please retry.'}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`Private setup: ${origin}`));
