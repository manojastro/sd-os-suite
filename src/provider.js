/* OpenAI-compatible chat completions adapter. No key is stored by this module. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SDProvider=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
async function run({endpoint,model,key,consent,messages,tools,execute,signal,fetcher=fetch}){
 if(!consent)throw Error('External AI consent is required. No request was sent.');
 if(!key||!model)throw Error('A session key and model are required.');
 let url;try{url=new URL(endpoint);}catch(_){throw Error('Invalid provider endpoint.');}
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw Error('Provider endpoint must use HTTPS or localhost.');
 if(url.username||url.password||url.search||url.hash)throw Error('Provider endpoint must not contain credentials, query or fragment.');
 url.pathname=url.pathname.replace(/\/$/,'')+'/chat/completions';
 const history=messages.slice(-12).map(m=>({role:m.role,content:String(m.content).slice(0,8000)}));
 const schema=Object.entries(tools).map(([name,t])=>({type:'function',function:{name,description:`Application tool: ${name}`,parameters:t.schema}}));
 for(let step=0;step<4;step++){
  if(signal?.aborted)throw Error('Request cancelled.');
  const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),30000), onAbort=()=>timeout.abort();
  if(signal)signal.addEventListener('abort',onAbort,{once:true});
  let response,text;
  try{response=await fetcher(url.href,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:history,tools:schema,tool_choice:'auto',max_tokens:800,stream:false}),signal:timeout.signal});
   if(!response.ok)throw Error(`Provider returned HTTP ${response.status}.`);
   text=await response.text();
  }catch(e){if(timeout.signal.aborted)throw Error(signal?.aborted?'Request cancelled.':'Provider request timed out.');if(/^Provider returned HTTP/.test(e.message))throw e;throw Error('Provider request failed. Check network access and CORS.');}
  finally{clearTimeout(timer);if(signal)signal.removeEventListener('abort',onAbort);}
  if(text.length>200000)throw Error('Provider response exceeded size limit.');let json;try{json=JSON.parse(text);}catch(_){throw Error('Provider returned malformed JSON.');}
  const m=json?.choices?.[0]?.message;if(!m||m.role!=='assistant')throw Error('Provider returned an invalid response.');
  if(!m.tool_calls?.length){if(typeof m.content!=='string')throw Error('Provider returned no text or supported tool call.');return m.content.slice(0,16000);}
  if(!Array.isArray(m.tool_calls)||m.tool_calls.length>5)throw Error('Provider requested too many tool calls.');
  history.push({role:'assistant',content:typeof m.content==='string'?m.content:null,tool_calls:m.tool_calls});
  for(const call of m.tool_calls){
   if(call.type!=='function'||typeof call.id!=='string'||!call.function||typeof call.function.name!=='string'||typeof call.function.arguments!=='string'||call.function.arguments.length>10000)throw Error('Provider returned a malformed tool call.');
   let args;try{args=JSON.parse(call.function.arguments);}catch(_){throw Error('Provider returned malformed tool arguments.');}
   const result=await execute(call.function.name,args);history.push({role:'tool',tool_call_id:call.id,content:JSON.stringify(result).slice(0,20000)});
  }
 }
 throw Error('Provider tool-call limit reached.');
}
return {run};
});
