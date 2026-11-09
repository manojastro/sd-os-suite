(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SDCapacity=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function estimate({volume,intervalMinutes,ahtSeconds,mode='voice',concurrency=1,target=80,waitSeconds=20,occupancy=85,shrinkage=25}){
 const nums=[volume,intervalMinutes,ahtSeconds,concurrency,target,waitSeconds,occupancy,shrinkage];if(nums.some(n=>!Number.isFinite(Number(n))))throw Error('All model inputs must be numeric.');
 [volume,intervalMinutes,ahtSeconds,concurrency,target,waitSeconds,occupancy,shrinkage]=nums.map(Number);
 if(volume<0||intervalMinutes<=0||ahtSeconds<=0||concurrency<=0||target<=0||target>=100||waitSeconds<0||occupancy<=0||occupancy>=100||shrinkage<0||shrinkage>=100)throw Error('Model inputs are outside supported ranges.');
 if(!['voice','chat','throughput'].includes(mode))throw Error('Unsupported demand model.');
 if(volume===0)return {net:0,gross:0,offered:0,assumptions:'Zero demand.'};
 const offered=volume*ahtSeconds/(intervalMinutes*60);
 let net;
 if(mode==='voice'){
  // Erlang B recursion avoids factorial overflow; Erlang C follows from B.
  let b=1,found=false;for(let n=1;n<=1000;n++){
   b=offered*b/(n+offered*b);if(n<=offered)continue;
   const pw=b/(1-(offered/n)*(1-b));
   const sl=(1-pw*Math.exp(-(n-offered)*waitSeconds/ahtSeconds))*100;
   if(sl>=target&&offered/n<=occupancy/100){net=n;found=true;break;}
  }if(!found)throw Error('Demand exceeds supported model capacity.');
 }else net=Math.ceil(offered/(mode==='chat'?concurrency:1)/(occupancy/100));
 return {net,gross:Math.ceil(net/(1-shrinkage/100)),offered,assumptions:`${mode} model; ${intervalMinutes} minute interval, ${occupancy}% occupancy, ${shrinkage}% shrinkage${mode==='voice'?`, ${target}% answered within ${waitSeconds}s`:mode==='chat'?`, concurrency ${concurrency}`:''}. Planning estimate.`};
}
function coverage(demand,roster){
 const startText=String(demand.start||'').replace(' ','T');if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(startText))throw Error('Coverage requires a local interval timestamp.');
 const start=Date.parse(startText+'Z'),end=start+Number(demand.intervalMinutes)*60000;if(!Number.isFinite(start)||!Number.isFinite(end))throw Error('Invalid interval.');
 const parse=v=>{const t=String(v||'').replace(' ','T');return /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(t)?Date.parse(t+'Z'):NaN;};
 const leave=roster.filter(r=>r.kind==='leave'),active=new Set();for(const r of roster){if(r.kind==='leave'||r.team!==demand.team)continue;const a=parse(r.start),b=parse(r.end);if(a<=start&&b>=end&&!leave.some(l=>l.employeeId===r.employeeId&&parse(l.start)<end&&parse(l.end)>start))active.add(r.employeeId);}
 return active.size;
}
return {estimate,coverage};
});
