(function(root,factory){const D=typeof module==='object'&&module.exports?require('./domain.js'):root.SDDomain;const api=factory(D);if(typeof module==='object'&&module.exports)module.exports=api;else root.SDReconciliation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
function reconcile(baselines,tickets,settings){return baselines.map(b=>{
 const metric=String(b.metric||'').toLowerCase().trim(), period=String(b.period||'');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||!['total','resolved','open'].includes(metric)||!Number.isFinite(b.expected))return {id:b.id,status:'Unresolved',reason:'Use a YYYY-MM period and metric total, resolved or open.'};
 const selected=[],excluded=[];for(const t of tickets){if(b.team&&t.team!==b.team)continue;if(b.employeeId&&t.ownerId!==b.employeeId)continue;try{if(D.operationalDay(t.openedAt,settings.timezone,settings.cutoffHour).startsWith(period))selected.push(t);}catch(_){excluded.push(t.id);}}
 const m=D.ticketMetrics(selected,settings.timezone,settings.cutoffHour),actual=metric==='total'?m.total:metric==='resolved'?m.resolved:m.open;
 return {id:b.id,status:actual===b.expected?'Match':'Mismatch',expected:b.expected,actual,sourceIds:selected.map(t=>t.id),excludedIds:excluded,definition:`${metric} tickets opened in operational month ${period}${b.team?' for '+b.team:''}${b.employeeId?' assigned to '+b.employeeId:''}`};
});}
return {reconcile};
});
