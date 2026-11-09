/* Shared domain calculations and validated mutations. No browser dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SDDomain = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 1;
  const collections = ['employees', 'tickets', 'demand', 'roster', 'performance', 'baselines', 'tasks', 'audits', 'imports', 'activity', 'legacy'];
  const defaults = () => ({ version: VERSION, revision: 0, settings: { timezone: 'Asia/Kolkata', cutoffHour: 7, theme: 'light', minRestHours:10, maxWeeklyWorkingDays:5, maxConsecutiveDays:6 }, ...Object.fromEntries(collections.map(k => [k, []])) });
  const clone = x => JSON.parse(JSON.stringify(x));
  const id = () => {
    if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
    throw new Error('A secure random ID generator is required.');
  };
  function validateState(s) {
    if (!s || typeof s !== 'object' || s.version !== VERSION || !Number.isSafeInteger(s.revision) || s.revision < 0 || !s.settings || typeof s.settings !== 'object') throw new Error('Unsupported or invalid backup schema.');
    const allowed = new Set(['version','revision','settings',...collections]);
    for (const key of Object.keys(s)) if (!allowed.has(key)) throw new Error(`Unknown workspace field: ${key}.`);
    for (const key of collections) {
      if (!Array.isArray(s[key])) throw new Error(`Invalid collection: ${key}.`);
      const ids = new Set();
      for (const item of s[key]) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim()) throw new Error(`Invalid ${key} record.`);
        const id = item.id.trim().toLowerCase();
        if (ids.has(id)) throw new Error(`Duplicate ID in ${key}.`);
        ids.add(id);
      }
    }
    for(const e of s.employees)if(typeof e.name!=='string'||!e.name.trim())throw Error('Invalid employee record.');
    for(const t of s.tasks)if(typeof t.title!=='string'||!t.title.trim()||!['Open','In progress','Blocked','Done'].includes(t.status)||!['Low','Normal','High','Urgent'].includes(t.priority))throw Error('Invalid task record.');
    for(const t of s.tickets)if(typeof t.status!=='string'||typeof t.openedAt!=='string')throw Error('Invalid ticket record.');
    for(const a of s.audits)if(!a.result||!Array.isArray(a.result.findings))throw Error('Invalid audit record.');
    if (!Number.isInteger(s.settings.cutoffHour) || s.settings.cutoffHour < 0 || s.settings.cutoffHour > 23) throw new Error('Invalid cutoff hour.');
    try { new Intl.DateTimeFormat('en', {timeZone: s.settings.timezone}); } catch (_) { throw new Error('Invalid time zone.'); }
    for (const [k,min,max] of [['minRestHours',0,168],['maxWeeklyWorkingDays',1,7],['maxConsecutiveDays',1,365]]) if (s.settings[k] !== undefined && (!Number.isFinite(s.settings[k]) || s.settings[k]<min || s.settings[k]>max || (k!=='minRestHours'&&!Number.isInteger(s.settings[k])))) throw new Error(`Invalid ${k}.`);
    if (s.settings.rosterDraft !== undefined && s.settings.rosterDraft !== null && (typeof s.settings.rosterDraft!=='object' || !Array.isArray(s.settings.rosterDraft.roster) || !Number.isInteger(s.settings.rosterDraft.revision))) throw Error('Invalid roster draft.');
    if (s.settings.rubric !== undefined) {const r=s.settings.rubric;if(!Array.isArray(r)||!r.length||r.length>100)throw Error('Invalid rubric.');const ids=new Set();let weights=0;for(const x of r){if(!x||typeof x.id!=='string'||ids.has(x.id)||!Number.isFinite(x.weight)||x.weight<0||typeof x.higherBetter!=='boolean'||!Array.isArray(x.bands)||x.bands.length!==4||x.bands.some(n=>!Number.isFinite(n)))throw Error('Invalid rubric.');for(let i=1;i<4;i++)if(x.higherBetter?x.bands[i]<=x.bands[i-1]:x.bands[i]>=x.bands[i-1])throw Error('Invalid rubric bands.');ids.add(x.id);weights+=x.weight;}if(Math.abs(weights-1)>0.000001)throw Error('Rubric weights must total one.');}
    if (s.settings.rubricVersion !== undefined && (!Number.isInteger(s.settings.rubricVersion)||s.settings.rubricVersion<1)) throw Error('Invalid rubric version.');
    return s;
  }
  function dateParts(value, timezone) {
    if (typeof value !== 'string') throw new Error('Date must be text.');
    const local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
    if (local) {
      const [, y, m, d, h = '00', min = '00', sec = '00'] = local;
      const dt = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
      if (dt.getUTCFullYear() !== +y || dt.getUTCMonth() !== +m - 1 || dt.getUTCDate() !== +d || +h > 23 || +min > 59 || +sec > 59) throw new Error('Invalid date or time.');
      return { year:+y, month:+m, day:+d, hour:+h, dateOnly: !local[4] };
    }
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)) throw new Error('Timestamp must be ISO 8601 with an explicit offset.');
    const components = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(value);
    const check = new Date(Date.UTC(+components[1], +components[2]-1, +components[3]));
    if (check.getUTCFullYear() !== +components[1] || check.getUTCMonth() !== +components[2]-1 || check.getUTCDate() !== +components[3] || +components[4]>23 || +components[5]>59) throw new Error('Invalid timestamp.');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid timestamp.');
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23'}).formatToParts(parsed).map(v => [v.type, v.value]));
    return { year:+p.year, month:+p.month, day:+p.day, hour:+p.hour, dateOnly:false };
  }
  function operationalDay(value, timezone = 'Asia/Kolkata', cutoff = 7) {
    if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 23) throw new Error('Invalid cutoff hour.');
    const p = dateParts(value, timezone);
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day - (!p.dateOnly && p.hour < cutoff ? 1 : 0)));
    return d.toISOString().slice(0, 10);
  }
  function ticketMetrics(tickets, timezone = 'Asia/Kolkata', cutoff = 7) {
    let resolved = 0, open = 0, statusExcluded = 0, slaEligible = 0, slaMet = 0, sdrEligible = 0, sameDay = 0, durationEligible = 0, totalHours = 0;
    for (const t of tickets) {
      const status = String(t.status || '').trim().toLowerCase();
      if (status !== 'resolved') { if (['open','new','pending','in progress'].includes(status)) open++; else statusExcluded++; continue; }
      resolved++;
      if (typeof t.slaMet === 'boolean') { slaEligible++; if (t.slaMet) slaMet++; }
      if (t.openedAt && t.resolvedAt) {
        try {
          const a = operationalDay(t.openedAt, timezone, cutoff), b = operationalDay(t.resolvedAt, timezone, cutoff);
          const offset = v => /(?:Z|[+-]\d\d:\d\d)$/.test(v);
          // Mixed local/offset formats cannot be ordered safely without an explicit timezone conversion.
          const time = v => Date.parse(offset(v) ? v : v.replace(' ','T')+'Z');
          if (offset(t.openedAt)===offset(t.resolvedAt) && (offset(t.openedAt)||['UTC','Etc/UTC','Asia/Kolkata'].includes(timezone)) && Number.isFinite(time(t.openedAt)) && Number.isFinite(time(t.resolvedAt)) && time(t.resolvedAt)>=time(t.openedAt)) { sdrEligible++; if (a === b) sameDay++; if(/[T ]\d\d:\d\d/.test(t.openedAt)&&/[T ]\d\d:\d\d/.test(t.resolvedAt)){durationEligible++;totalHours+=(time(t.resolvedAt)-time(t.openedAt))/3600000;} }
        } catch (_) { /* excluded */ }
      }
    }
    return { total:tickets.length, resolved, open, statusExcluded, statusEligible:resolved+open, resolutionRate:(resolved+open) ? resolved/(resolved+open)*100 : null, slaRate:slaEligible ? slaMet/slaEligible*100 : null, slaEligible, sdrRate:sdrEligible ? sameDay/sdrEligible*100 : null, sdrEligible, averageResolutionHours:durationEligible?totalHours/durationEligible:null, durationEligible };
  }
  function createTask(state, input, options = {}) {
    if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300) throw new Error('Task title is required (maximum 300 characters).');
    if (input.dueDate && !/^\d{4}-\d\d-\d\d$/.test(input.dueDate)) throw new Error('Due date must be YYYY-MM-DD.');
    if (input.dueDate) dateParts(input.dueDate, 'UTC');
    if (input.ownerId && !state.employees.some(e => e.id === input.ownerId)) throw new Error('Unknown employee ID.');
    if (input.sourceId && !options.allowDuplicate) { const existing = state.tasks.find(t => t.sourceId === input.sourceId && !t.archived); if (existing) return {record:existing, duplicate:true}; }
    if (options.idempotencyKey) { const existing = state.tasks.find(t => t.idempotencyKey === options.idempotencyKey); if (existing) return {record:existing, duplicate:true}; }
    const task = { id:id(), title:input.title.trim(), ownerId:input.ownerId || '', status:'Open', priority:input.priority || 'Normal', dueDate:input.dueDate || '', sourceId:input.sourceId || '', idempotencyKey:options.idempotencyKey || '', archived:false, createdAt:new Date().toISOString() };
    if (!['Low','Normal','High','Urgent'].includes(task.priority)) throw new Error('Invalid priority.');
    state.tasks.push(task); return {record:task, duplicate:false};
  }
  function updateTask(state,id,patch) {
    const task=state.tasks.find(t=>t.id===id);if(!task)throw Error('Task not found.');
    const allowed=['title','ownerId','priority','dueDate','status','archived','dependsOn','subtasks'];for(const k of Object.keys(patch))if(!allowed.includes(k))throw Error('Unsupported task field.');
    const next={...task,...patch};if(typeof next.title!=='string'||!next.title.trim()||next.title.length>300)throw Error('Task title is required.');
    if(!['Open','In progress','Blocked','Done'].includes(next.status))throw Error('Invalid task status.');
    if(!['Low','Normal','High','Urgent'].includes(next.priority))throw Error('Invalid task priority.');
    if(next.ownerId&&!state.employees.some(e=>e.id===next.ownerId))throw Error('Unknown employee ID.');
    if(next.dueDate)dateParts(next.dueDate,'UTC');
    if(next.dependsOn!==undefined){if(!Array.isArray(next.dependsOn)||new Set(next.dependsOn).size!==next.dependsOn.length||next.dependsOn.some(x=>x===id||!state.tasks.some(t=>t.id===x)))throw Error('Invalid task dependency.');const visit=(x,seen)=>{if(x===id)return true;if(seen.has(x))return false;seen.add(x);return (state.tasks.find(t=>t.id===x)?.dependsOn||[]).some(y=>visit(y,seen));};if(next.dependsOn.some(x=>visit(x,new Set())))throw Error('Dependencies cannot form a cycle.');}
    if(next.subtasks!==undefined&&(!Array.isArray(next.subtasks)||next.subtasks.some(x=>!x||typeof x.id!=='string'||typeof x.title!=='string'||!x.title.trim()||typeof x.done!=='boolean')))throw Error('Invalid subtasks.');
    if(next.status==='Done'&&(next.dependsOn||[]).some(x=>state.tasks.find(t=>t.id===x)?.status!=='Done'))throw Error('Complete prerequisite tasks first.');
    Object.assign(task,next);return task;
  }
  return { VERSION, collections, defaults, clone, validateState, operationalDay, ticketMetrics, createTask, updateTask };
});
