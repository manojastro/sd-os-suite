(function(root,factory){const D=typeof module==='object'&&module.exports?require('./domain.js'):root.SDDomain;const api=factory(D);if(typeof module==='object'&&module.exports)module.exports=api;else root.SDInsights=api;})(typeof globalThis!=='undefined'?globalThis:this,function(D){
'use strict';
function day(value){if(!/^\d{4}-\d\d-\d\d$/.test(value))throw Error('Choose valid dates.');D.operationalDay(value);return Date.parse(value+'T00:00:00Z');}
function trend(tickets,settings){const counts=new Map();let excluded=0;for(const t of tickets){try{const d=D.operationalDay(t.openedAt,settings.timezone,settings.cutoffHour);counts.set(d,(counts.get(d)||0)+1);}catch(_){excluded++;}}return {days:[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count})),excluded};}
function compare(tickets,settings,from,to,comparisonFrom,today=new Date().toISOString().slice(0,10)){
 const a=day(from),b=day(to),c=day(comparisonFrom);if(b<a||b-a>365*86400000)throw Error('Select a valid window of at most 366 days.');const end=new Date(c+b-a).toISOString().slice(0,10),series=trend(tickets,settings);const count=(start,stop)=>series.days.filter(x=>x.date>=start&&x.date<=stop).reduce((sum,x)=>sum+x.count,0);const current=count(from,to),previous=count(comparisonFrom,end);return {current,previous,change:previous?((current-previous)/previous*100):null,from,to,comparisonFrom,comparisonTo:end,excluded:series.excluded,incomplete:to>today||end>today,coverage:'Source coverage is not independently verified.'};
}
function anomalies(tickets,settings){const series=trend(tickets,settings);const median=a=>{const s=[...a].sort((x,y)=>x-y),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};let insufficient=0;const result=[];for(let i=0;i<series.days.length;i++){const item=series.days[i],weekday=new Date(item.date+'T00:00:00Z').getUTCDay(),weekend=weekday===0||weekday===6;const baseline=series.days.slice(0,i).filter(x=>{const d=new Date(x.date+'T00:00:00Z').getUTCDay();return (d===0||d===6)===weekend;}).map(x=>x.count);if(baseline.length<6){insufficient++;continue;}const med=median(baseline),mad=median(baseline.map(x=>Math.abs(x-med)));if(mad===0)continue;const z=0.6745*(item.count-med)/mad;if(Math.abs(z)>=3.2)result.push({...item,median:med,z,baselineDays:baseline.length});}return {candidates:result,insufficient,excluded:series.excluded,disclosure:'Observed days only; coverage is unverified and zero-MAD baselines are not scored.'};}
// Dashboard selector: one pass over the same calculations the tables use, with plain-language insights.
// Days with no tickets are shown as zero so the line chart does not hide quiet periods.
function dashboard(tickets,settings){
 const m=D.ticketMetrics(tickets,settings.timezone,settings.cutoffHour);const tr=trend(tickets,settings);
 const daily=[];if(tr.days.length){const map=new Map(tr.days.map(x=>[x.date,x.count]));const end=Date.parse(tr.days[tr.days.length-1].date+'T00:00:00Z');for(let t=Date.parse(tr.days[0].date+'T00:00:00Z');t<=end;t+=86400000){const k=new Date(t).toISOString().slice(0,10);daily.push({date:k,count:map.get(k)||0});}}
 const sum=a=>a.reduce((s,x)=>s+x.count,0);
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label,i)=>({label,value:0,days:0}));
 for(const x of daily){const w=weekdays[new Date(x.date+'T00:00:00Z').getUTCDay()];w.value+=x.count;w.days++;}
 const weekday=[1,2,3,4,5,6,0].map(i=>({label:weekdays[i].label,value:weekdays[i].days?weekdays[i].value/weekdays[i].days:0}));
 let weekly=null;if(daily.length>=14){const cur=sum(daily.slice(-7)),prev=sum(daily.slice(-14,-7));weekly={current:cur,previous:prev,currentAvg:cur/7,previousAvg:prev/7,change:prev?(cur-prev)/prev*100:null,to:daily[daily.length-1].date};}
 const byTeam=new Map();for(const t of tickets){const k=t.team||'Unassigned';if(!byTeam.has(k))byTeam.set(k,[]);byTeam.get(k).push(t);}
 const teams=[...byTeam].map(([team,list])=>({team,...D.ticketMetrics(list,settings.timezone,settings.cutoffHour),volume:list.length})).sort((a,b)=>b.volume-a.volume);
 const an=anomalies(tickets,settings);const insights=[];
 if(daily.length){const peak=daily.reduce((a,b)=>b.count>a.count?b:a);insights.push({tone:'info',text:`Busiest day was ${peak.date} with ${peak.count} tickets. The average is ${(sum(daily)/daily.length).toFixed(1)} tickets per day over ${daily.length} calendar days.`});}
 const busiest=weekday.reduce((a,b)=>b.value>a.value?b:a,weekday[0]);if(busiest.value>0)insights.push({tone:'info',text:`${busiest.label} has the highest average volume (${busiest.value.toFixed(1)} tickets).`});
 if(weekly&&weekly.change!==null)insights.push({tone:'info',text:`The last 7 days averaged ${weekly.currentAvg.toFixed(1)} tickets per day, ${weekly.change>=0?'up':'down'} ${Math.abs(weekly.change).toFixed(1)}% from the 7 days before (to ${weekly.to}).`});
 if(an.candidates.length)insights.push({tone:'warn',text:`${an.candidates.length} day(s) differ sharply from their usual volume (robust score ≥ 3.2). Largest: ${an.candidates.slice().sort((a,b)=>Math.abs(b.z)-Math.abs(a.z)).slice(0,3).map(x=>`${x.date} (${x.count})`).join(', ')}.`});
 const rated=teams.filter(t=>t.slaEligible>=20&&t.slaRate!==null);if(rated.length>1){const low=rated.reduce((a,b)=>b.slaRate<a.slaRate?b:a);insights.push({tone:'warn',text:`Lowest SLA compliance: ${low.team} at ${low.slaRate.toFixed(1)}% across ${low.slaEligible} eligible tickets.`});}
 if(teams.length>1)insights.push({tone:'info',text:`${teams[0].team} handles ${(teams[0].volume/tickets.length*100).toFixed(1)}% of tickets.`});
 if(m.statusExcluded)insights.push({tone:'warn',text:`${m.statusExcluded} ticket(s) have a status outside Resolved/open and are excluded from resolution rate.`});
 if(tr.excluded)insights.push({tone:'warn',text:`${tr.excluded} ticket(s) have an unparseable opening date and are excluded from trends.`});
 return {metrics:m,daily,weekday,weekly,teams,anomalies:an,excluded:tr.excluded,from:daily[0]?.date||null,to:daily[daily.length-1]?.date||null,insights};
}
return {trend,compare,anomalies,dashboard};
});
