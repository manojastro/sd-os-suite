(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDRoster = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Local wall times are used deliberately: shift durations represent the roster's declared local time.
  // DST regions need offset-aware scheduling before this validation can be used for them.
  function localTime(value) {
    const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)$/.exec(value || '');
    if (!m) throw new Error('Use a local timestamp in YYYY-MM-DD HH:MM format.');
    const [,y,mo,d,h,mi] = m.map((v,i) => i ? Number(v) : v);
    const date = new Date(Date.UTC(y,mo-1,d,h,mi));
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo-1 || date.getUTCDate() !== d || h>23 || mi>59) throw new Error('Invalid roster timestamp.');
    return date.getTime();
  }
  function validate(shifts, leave, policy) {
    const rest = Number(policy.minRestHours), maxWeek = Number(policy.maxWeeklyWorkingDays), maxRun = Number(policy.maxConsecutiveDays);
    if (!Number.isFinite(rest) || rest < 0 || !Number.isInteger(maxWeek) || maxWeek < 1 || maxWeek > 7 || !Number.isInteger(maxRun) || maxRun < 1) throw new Error('Invalid roster policy.');
    const problems = [], employees = new Map();
    for (const shift of shifts) {
      try {
        if (!shift.id || !shift.employeeId) throw new Error('Shift ID and employee ID are required.');
        const start = localTime(shift.start), end = localTime(shift.end);
        if (end <= start || end-start > 24*3600000) throw new Error('End must follow start by at most 24 hours.');
        const row = {...shift,startMs:start,endMs:end,day:new Date(start).toISOString().slice(0,10)};
        if (!employees.has(shift.employeeId)) employees.set(shift.employeeId,[]);
        employees.get(shift.employeeId).push(row);
        for (const l of leave.filter(l => l.employeeId === shift.employeeId)) {
          const a = localTime(l.start), b = localTime(l.end);
          if (a >= b) throw new Error('Invalid leave period.');
          if (start < b && end > a) problems.push({code:'leave', ids:[shift.id,l.id], message:'Shift overlaps leave.'});
        }
      } catch (e) { problems.push({code:'invalid',ids:[shift.id].filter(Boolean),message:e.message}); }
    }
    for (const rows of employees.values()) {
      rows.sort((a,b)=>a.startMs-b.startMs);
      let latest=rows[0];for (let i=1;i<rows.length;i++) { if (rows[i].startMs - latest.endMs < rest*3600000) problems.push({code:'rest',ids:[latest.id,rows[i].id],message:`Less than ${rest} hours rest.`}); if(rows[i].endMs>latest.endMs)latest=rows[i]; }
      const days = [...new Set(rows.map(r=>r.day))].sort(), weekly = new Map();
      let run = 0, previous = null;
      for (const day of days) {
        const date = new Date(day+'T00:00:00Z'), ms=date.getTime();
        run = previous !== null && ms-previous===86400000 ? run+1 : 1; previous=ms;
        if (run>maxRun) problems.push({code:'consecutive',ids:rows.filter(r=>r.day===day).map(r=>r.id),message:`More than ${maxRun} consecutive working days.`});
        const weekday=(date.getUTCDay()+6)%7; date.setUTCDate(date.getUTCDate()-weekday);
        const week=date.toISOString().slice(0,10); weekly.set(week,(weekly.get(week)||0)+1);
        if (weekly.get(week)>maxWeek) problems.push({code:'weekly',ids:rows.filter(r=>r.day===day).map(r=>r.id),message:`More than ${maxWeek} days in week beginning ${week}.`});
      }
    }
    return {valid:problems.length===0,problems};
  }
  return {validate};
});
