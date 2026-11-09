/* Shared import planning. A plan is immutable input to a revision-checked transaction. */
(function (root, factory) {
  const D = typeof module === 'object' && module.exports ? require('./domain.js') : root.SDDomain;
  const api = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDImports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const schemas = {
    employees:{required:['id','name'], fields:['id','name','team','role','manager','location','active']},
    tickets:{required:['id','status','openedAt'], fields:['id','status','openedAt','resolvedAt','team','ownerId','slaMet']},
    demand:{required:['id','team','start','volume'], fields:['id','team','start','volume','intervalMinutes','ahtSeconds','concurrency','mode']},
    roster:{required:['id','employeeId','start','end'], fields:['id','employeeId','start','end','team','kind']},
    performance:{required:['id','employeeId','period','metric','value'], fields:['id','employeeId','period','metric','value']},
    baselines:{required:['id','metric','period','expected'], fields:['id','metric','period','expected','team','employeeId']}
  };
  function preview(state, input) {
    const schema = schemas[input.kind];
    if (!schema) throw new Error('Unsupported dataset.');
    if (!['append','upsert','replace'].includes(input.mode)) throw new Error('Invalid import mode.');
    if (!Array.isArray(input.rows) || input.rows.length > 100000) throw new Error('Import must contain at most 100,000 rows.');
    if (!input.mapping || typeof input.mapping !== 'object') throw new Error('Column mapping is required.');
    for (const key of schema.required) if (!input.mapping[key]) throw new Error(`Map the ${key} column.`);
    const existing = new Set(state[input.kind].map(r => String(r.id).trim().toLowerCase()));
    const seen = new Set(), accepted = [], rejected = [];
    input.rows.forEach((raw, i) => {
      const row = {}, errors = [];
      const sourceData=Object.fromEntries(Object.entries(raw).map(([k,v])=>[String(k),String(v??'')]));
      for (const f of schema.fields) {
        const value = raw[input.mapping[f]];
        if (value !== undefined && value !== null) row[f] = String(value).trim();
      }
      for (const f of schema.required) if (!row[f]) errors.push(`${f} is required`);
      const key = (row.id || '').toLowerCase();
      if (key && seen.has(key)) errors.push('duplicate ID in import');
      if (key) seen.add(key);
      if (key && existing.has(key) && input.mode === 'append') errors.push('ID already exists');
      if (input.kind==='employees' && input.mode==='upsert' && key) {const previous=state.employees.find(e=>String(e.id).toLowerCase()===key);if(previous && String(previous.name).trim().toLowerCase()!==String(row.name||'').trim().toLowerCase()) errors.push('employee identity conflicts with existing ID');}
      for (const f of ['openedAt','resolvedAt','start','end']) if (row[f]) { try { D.operationalDay(row[f], state.settings.timezone, state.settings.cutoffHour); } catch (_) { errors.push(`${f} is invalid`); } }
      for (const f of ['volume','intervalMinutes','ahtSeconds','concurrency','value','expected']) if (row[f] !== undefined && row[f] !== '') {
        const n = Number(row[f]); if (!Number.isFinite(n) || (f !== 'value' && n < 0)) errors.push(`${f} must be a valid number`); else row[f]=n;
      }
      if (input.kind === 'tickets' && row.status && !['resolved','open','new','pending','in progress'].includes(row.status.toLowerCase())) errors.push('status must be resolved, open, new, pending or in progress');
      if (row.slaMet) { const v=row.slaMet.toLowerCase(); if (['true','yes','1'].includes(v)) row.slaMet=true; else if (['false','no','0'].includes(v)) row.slaMet=false; else errors.push('slaMet must be yes or no'); }
      if (row.active) { const v=row.active.toLowerCase(); if (['true','yes','1'].includes(v)) row.active=true; else if (['false','no','0'].includes(v)) row.active=false; else errors.push('active must be yes or no'); }
      if (['roster','performance','baselines'].includes(input.kind) && row.employeeId) {const employee=state.employees.find(e=>String(e.id).toLowerCase()===row.employeeId.toLowerCase());if(!employee)errors.push('unknown employee ID');else row.employeeId=employee.id;}
      if (input.kind==='tickets'&&row.ownerId){const employee=state.employees.find(e=>String(e.id).toLowerCase()===row.ownerId.toLowerCase());if(!employee)errors.push('unknown owner ID');else row.ownerId=employee.id;}
      if (input.kind==='roster'&&row.kind&&!['shift','leave'].includes(row.kind))errors.push('kind must be shift or leave');
      if (errors.length) rejected.push({sourceRow:i+2, errors}); else accepted.push({...row, sourceRow:i+2, sourceData});
    });
    const affectedExistingIds=input.mode==='replace'?state[input.kind].map(r=>r.id):input.mode==='upsert'?accepted.filter(r=>existing.has(r.id.toLowerCase())).map(r=>r.id):[];
    return {kind:input.kind, mode:input.mode, filename:String(input.filename || ''), sheet:String(input.sheet || ''), revision:state.revision, accepted, rejected, existingCount:state[input.kind].length, affectedExisting:affectedExistingIds.length, affectedExistingIds};
  }
  function apply(state, plan) {
    if (state.revision !== plan.revision) throw new Error('Import preview is stale. Review it again.');
    if (!schemas[plan.kind] || !['append','upsert','replace'].includes(plan.mode)) throw new Error('Invalid import plan.');
    if (!Array.isArray(plan.accepted) || !Array.isArray(plan.rejected) || plan.rejected.length) throw new Error('Resolve rejected rows before import.');
    if (plan.kind === 'employees' && plan.mode === 'replace') {
      const retained = new Set(plan.accepted.map(r => String(r.id).toLowerCase()));
      const referenced = [...state.roster.map(r=>r.employeeId), ...state.performance.map(r=>r.employeeId), ...state.tasks.map(r=>r.ownerId)].filter(Boolean);
      if (referenced.some(id=>!retained.has(String(id).toLowerCase()))) throw new Error('Replacement would orphan existing assignments. Keep those employees or update their assignments first.');
    }
    const importId = globalThis.crypto.randomUUID(), timestamp = new Date().toISOString();
    const rows = plan.accepted.map(r => {const existing=plan.kind==='employees'?state.employees.find(e=>String(e.id).toLowerCase()===r.id.toLowerCase()):null;return {...r,importId,...(plan.kind==='employees'?{memberships:[...new Set([...(existing?.memberships||[]),plan.sheet].filter(Boolean))]}:{})};});
    const keys = new Set(rows.map(r => r.id.toLowerCase()));
    if (plan.mode === 'replace') state[plan.kind] = rows;
    else if (plan.mode === 'upsert') state[plan.kind] = state[plan.kind].filter(r => !keys.has(String(r.id).toLowerCase())).concat(rows);
    else state[plan.kind].push(...rows);
    state.imports.push({id:importId, kind:plan.kind, filename:plan.filename, sheet:plan.sheet, importedAt:timestamp, rowIds:rows.map(r => r.id), sourceRows:plan.accepted.map(r=>({sourceRow:r.sourceRow,data:r.sourceData})), revision:state.revision+1, mode:plan.mode});
    return {importId, affectedIds:rows.map(r => r.id)};
  }
  return {schemas, preview, apply};
});
