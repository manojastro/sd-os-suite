// Optional local-only static server. The standalone file does not require it.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname), port = Number(process.env.PORT || 3456);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
// AI proxy: the OpenRouter key stays on this server (env var or ~/.sd-os-secret, never in the page or repo).
const os=require('node:os');
function loadKey(){if(process.env.OPENROUTER_API_KEY)return process.env.OPENROUTER_API_KEY.trim();try{const m=/^OPENROUTER_API_KEY=(.+)$/m.exec(fs.readFileSync(path.join(os.homedir(),'.sd-os-secret'),'utf8'));return m?m[1].trim():'';}catch(_){return '';}}
const AI_KEY=loadKey(), AI_MODEL=process.env.SD_AI_MODEL||'deepseek/deepseek-v4.1-flash', AI_CODE=process.env.SD_AI_ACCESS_CODE||'';
const hits=new Map(); let hourStart=Date.now(), hourCount=0;
function limited(ip){const now=Date.now();if(now-hourStart>3600000){hourStart=now;hourCount=0;}if(++hourCount>300)return true;const a=(hits.get(ip)||[]).filter(t=>now-t<60000);a.push(now);hits.set(ip,a);return a.length>15;}
async function aiProxy(req,res){
  const send=(code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
  if(req.method==='GET'){return send(200,{enabled:!!AI_KEY,model:AI_MODEL,needsCode:!!AI_CODE});}
  if(req.method!=='POST')return send(405,{error:'Method not allowed'});
  if(!AI_KEY)return send(503,{error:'AI is not configured on the server.'});
  if(AI_CODE&&(req.headers.authorization||'')!=='Bearer '+AI_CODE)return send(401,{error:'Access code required.'});
  const ip=req.headers['cf-connecting-ip']||req.socket.remoteAddress||'?';
  if(limited(ip))return send(429,{error:'Rate limit reached. Try again in a minute.'});
  let body='';for await(const c of req){body+=c;if(body.length>400000)return send(413,{error:'Request too large.'});}
  let j;try{j=JSON.parse(body);}catch(_){return send(400,{error:'Invalid JSON.'});}
  if(!Array.isArray(j.messages)||!j.messages.length)return send(400,{error:'messages required.'});
  const out={model:AI_MODEL,messages:j.messages.slice(-14),max_tokens:Math.min(Math.max(Number(j.max_tokens)||1500,1500),3000),stream:false,reasoning:{enabled:false}};
  if(Array.isArray(j.tools)&&j.tools.length<=20){out.tools=j.tools;out.tool_choice='auto';}
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),45000);
  try{const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+AI_KEY,'X-Title':'SD OS Suite'},body:JSON.stringify(out),signal:ac.signal});const t=await r.text();res.writeHead(r.status,{'Content-Type':'application/json','X-Content-Type-Options':'nosniff'});res.end(t);}
  catch(e){send(502,{error:'AI provider unreachable.'});}finally{clearTimeout(timer);}
}
http.createServer((req,res)=>{
  const pn=(req.url||'').split('?')[0];
  if(pn==='/api/ai/chat/completions'||pn==='/api/ai/status'){aiProxy(req,res).catch(()=>{try{res.writeHead(500);res.end();}catch(_){}});return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch(_){res.writeHead(400);res.end('Bad request');return;}
  if(name==='/')name='/SD_OS_Suite.html';
  const file=path.resolve(root,'.'+name);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}).listen(port,'127.0.0.1',()=>console.log(`SD OS Suite: http://127.0.0.1:${port}/ · AI proxy ${AI_KEY?'enabled ('+AI_MODEL+')':'disabled (no key)'}`));
