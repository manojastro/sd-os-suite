(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDAudit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Flags identify text for a reviewer; they are not determinations of a security violation.
  const rules = [
    {id:'password_request',label:'Possible password request',pattern:/\b(?:send|share|tell|provide)\s+(?:me\s+)?(?:your|the)\s+password\b/ig},
    {id:'verification_skipped',label:'Possible skipped verification',pattern:/\b(?:skip(?:ped)?|bypass(?:ed)?)\s+(?:the\s+)?(?:identity\s+)?verification\b/ig},
    {id:'one_time_code_request',label:'Possible one-time code request',pattern:/\b(?:send|share|read|tell|provide|give)\s+(?:me\s+)?(?:the\s+|your\s+)?(?:one[- ]time|otp|verification|security|6[- ]digit)\s+(?:code|passcode|pin)\b/ig},
    {id:'card_detail_request',label:'Possible card detail request',pattern:/\b(?:send|share|read|tell|provide|give)\s+(?:me\s+)?(?:your|the)\s+(?:full\s+)?(?:card\s+number|cvv|cvc|card\s+security\s+code)\b/ig},
    {id:'government_id_request',label:'Possible government ID request',pattern:/\b(?:send|share|read|tell|provide|give)\s+(?:me\s+)?(?:your|the)\s+(?:social\s+security|ssn|aadhaar|passport|national\s+id)(?:\s+number)?\b/ig}
  ];
  function run(transcript) {
    if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('A transcript is required.');
    if (transcript.length > 500000) throw new Error('Transcript exceeds 500,000 characters.');
    const findings=[];
    for (const rule of rules) {
      rule.pattern.lastIndex=0; let match;
      while ((match=rule.pattern.exec(transcript)) && findings.length<100) {
        const start=match.index,end=start+match[0].length;
        findings.push({rule:rule.id,label:rule.label,status:'Needs review',evidence:transcript.slice(start,end),start,end,line:transcript.slice(0,start).split('\n').length});
      }
    }
    return {method:'Keyword flags for human review',score:null,verdict:'Not assessed',findings,criteria:[{name:'Communication',status:'Not assessed'},{name:'Resolution',status:'Not assessed'},{name:'Process adherence',status:'Not assessed'},{name:'Security',status:'Not assessed'}]};
  }
  function override(finding, status, reason, at = new Date().toISOString()) {
    if (!['Confirmed','Dismissed','Needs review'].includes(status)) throw new Error('Invalid review status.');
    if (typeof reason !== 'string' || !reason.trim()) throw new Error('A review reason is required.');
    const review={status,reason:reason.trim(),at};
    return {...finding,status,override:{originalStatus:finding.override?.originalStatus || finding.status,reason:reason.trim(),at},reviewHistory:[...(finding.reviewHistory||[]),review]};
  }
  function reviewCriterion(result,index,transcript,status,evidence,reason,at=new Date().toISOString()) {
    if(!Number.isInteger(index)||!result.criteria[index])throw Error('Criterion not found.');
    if(!['Pass','Needs improvement','Fail','Not assessed'].includes(status))throw Error('Invalid assessment.');
    if(typeof reason!=='string'||!reason.trim())throw Error('A review reason is required.');
    let start=null,end=null;if(status!=='Not assessed'){if(typeof evidence!=='string'||!evidence)throw Error('Exact evidence is required.');start=transcript.indexOf(evidence);if(start<0)throw Error('Evidence must be an exact substring of the transcript.');end=start+evidence.length;}
    const old=result.criteria[index],entry={status,evidence:status==='Not assessed'?'':evidence,start,end,reason:reason.trim(),at};
    result.criteria[index]={...old,status,reviewHistory:[...(old.reviewHistory||[]),entry]};
    const points={'Pass':100,'Needs improvement':50,'Fail':0};if(result.criteria.every(c=>c.status in points)){result.score=result.criteria.reduce((sum,c)=>sum+points[c.status],0)/result.criteria.length;result.verdict=result.fatal?'Fatal – reviewer confirmed':result.score>=80?'Pass':'Needs improvement';}else{result.score=null;result.verdict=result.fatal?'Fatal – reviewer confirmed':'Not assessed';}
    return result;
  }
  function confirmFatal(result,reason,at=new Date().toISOString()){if(!result.findings.length)throw Error('A flagged finding is required.');if(typeof reason!=='string'||!reason.trim())throw Error('Fatal justification is required.');result.fatal={reason:reason.trim(),at,originalVerdict:result.verdict};result.verdict='Fatal – reviewer confirmed';return result;}
  return {run,override,reviewCriterion,confirmFatal};
});
