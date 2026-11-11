/* SIMULATED operations model. Deterministic (seeded) so every load shows the same story.
   Everything produced here is fictitious demo data: volumes, audits, performance, tasks and vault entries.
   No browser dependencies except the optional localStorage overlay in `store`. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const gauss = r => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sum = a => a.reduce((s, x) => s + x, 0);
  const avg = a => a.length ? sum(a) / a.length : 0;
  const r1 = v => Math.round(v * 10) / 10;
  const iso = d => d.toISOString().slice(0, 10);
  const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
  const dow = s => (new Date(s + 'T00:00:00Z').getUTCDay() + 6) % 7; // Monday = 0
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const TOWERS = [
    { id: 'Infra Voice', channel: 'Calls' }, { id: 'Infra Chat', channel: 'Chats' }, { id: 'Infra Web', channel: 'Tickets' },
    { id: 'EUCS L2', channel: 'Tickets' }, { id: 'Gdoc&Vip', channel: 'Calls' }, { id: 'ITSAM', channel: 'Tickets' }, { id: 'Gsuite', channel: 'Tickets' },
  ];
  const INFRA_SD = ['Infra Voice', 'Infra Chat', 'Infra Web'];
  const CHANNELS = ['Calls', 'Chats', 'Tickets'];
  const CH = { Calls: { aht: 9.5, conc: 1, base: 1500, prof: [1, 1, 1, 1, 1, 2, 4, 7, 10, 12, 12, 10, 8, 8, 9, 9, 8, 6, 5, 4, 3, 2, 2, 1] },
    Chats: { aht: 12, conc: 2.2, base: 1050, prof: [1, 1, 1, 1, 1, 1, 3, 6, 9, 11, 12, 11, 9, 8, 9, 9, 8, 6, 5, 4, 3, 2, 1, 1] },
    Tickets: { aht: 11, conc: 1.7, base: 1700, prof: [2, 1, 1, 1, 1, 2, 4, 7, 9, 10, 10, 9, 8, 8, 8, 8, 7, 6, 5, 4, 3, 3, 2, 2] } };
  for (const c of CHANNELS) { const t = sum(CH[c].prof); CH[c].share = CH[c].prof.map(x => x / t); }
  const WEEKDAY = [1.18, 1.05, 1.0, 0.98, 0.95, 0.38, 0.3];
  const SHIFTS = { M: { name: 'Morning', start: 6, len: 9 }, G: { name: 'General', start: 9, len: 9 }, A: { name: 'Afternoon', start: 12, len: 9 }, E: { name: 'Evening', start: 15, len: 9 }, N: { name: 'Night', start: 21, len: 9 } };
  const covers = (code, h) => { const s = SHIFTS[code]; return ((h - s.start + 24) % 24) < s.len; };
  const label = code => { const s = SHIFTS[code]; const f = x => String(x % 24).padStart(2, '0') + ':00'; return `${f(s.start)}–${f(s.start + s.len)}`; };
  const SHRINK = 0.2, OCC = 0.82;

  const ISSUES = [
    ['Password Reset', 16, ['Expired password', 'Forgot password', 'Sync failure', 'Domain password']],
    ['MFA / Authenticator', 11, ['New device enrolment', 'Token not received', 'Authenticator reset', 'Number matching issue']],
    ['Account Lock', 9, ['Failed attempts', 'Security lock', 'Inactive account']],
    ['VPN / Remote Access', 8, ['VPN not connecting', 'Certificate error', 'Slow VPN', 'Split tunnel']],
    ['Outlook / Email', 10, ['Mailbox full', 'Sync issue', 'Calendar', 'Shared mailbox']],
    ['Teams / Zoom', 7, ['Audio / video', 'Sign-in', 'Meeting add-in']],
    ['Printer', 5, ['Driver', 'Queue stuck', 'Printer offline']],
    ['Laptop / Hardware', 7, ['Battery', 'Slow performance', 'Peripheral', 'Blue screen']],
    ['Software Install', 8, ['Request approval', 'Licence', 'Install failure']],
    ['Wi-Fi / Network', 6, ['Cannot connect', 'Frequent drops', 'Guest Wi-Fi']],
    ['Access Request', 13, ['Shared drive', 'Application role', 'Distribution list']],
  ].map(([name, weight, subs]) => ({ name, weight, subs }));
  const CAUSES = [['USR-01', 'User error / training gap'], ['SW-02', 'Software defect'], ['HW-03', 'Hardware failure'], ['NW-04', 'Network / connectivity'], ['ACC-05', 'Access or permission'], ['CFG-06', 'Misconfiguration'], ['KNW-07', 'Knowledge gap (agent)'], ['EXT-08', 'Vendor / third party'], ['NRC-09', 'No root cause found']];
  const SCRIPTS = ['NX-Reset-Outlook-Profile', 'NX-VPN-Health-Check', 'NX-Clear-Teams-Cache', 'NX-Disk-Cleanup', 'NX-Printer-Spooler-Restart', 'NX-MFA-Device-Check', 'NX-WiFi-Diagnostics', 'NX-Battery-Report'];

  const AUDIT_PARAMS = [
    { k: 'greet', n: 'Greeting & Opening', w: 0.08, target: 90 }, { k: 'idv', n: 'ID&V / Security', w: 0.17, target: 95 },
    { k: 'listen', n: 'Listening & Empathy', w: 0.12, target: 90 }, { k: 'probe', n: 'Probing & Troubleshooting', w: 0.18, target: 90 },
    { k: 'process', n: 'Process & KB Adherence', w: 0.15, target: 90 }, { k: 'doc', n: 'Ticket Documentation', w: 0.12, target: 90 },
    { k: 'comms', n: 'Hold & Soft Skills', w: 0.08, target: 90 }, { k: 'close', n: 'Closure & Survey Pitch', w: 0.10, target: 90 },
  ];
  const AUDIT_TARGET = 90;
  const COACH = { greet: 'Refresh opening script; 10-minute huddle with call snippets.', idv: 'Re-certify on identity verification; add a 3-step ID&V checklist to the call flow.', listen: 'Empathy micro-learning; role-play de-escalation phrases.', probe: 'Troubleshooting drills and KB walkthroughs on the top 5 issue types.', process: 'KB adherence refresher; calibrate with process owners.', doc: 'Ticket-notes template with mandatory fields; peer review of 5 tickets per agent.', comms: 'Hold-etiquette and dead-air coaching using recorded samples.', close: 'Closure script and CSS pitch practice.' };

  const PERF = [
    { k: 'quality', n: 'Quality score', unit: '%', dir: 1, target: 92, w: 0.16, cat: 'Quality' },
    { k: 'csat', n: 'CSAT', unit: '%', dir: 1, target: 94, w: 0.10, cat: 'Customer' },
    { k: 'fcr', n: 'First-contact resolution', unit: '%', dir: 1, target: 78, w: 0.10, cat: 'Resolution' },
    { k: 'sdr', n: 'Same-day resolution', unit: '%', dir: 1, target: 85, w: 0.08, cat: 'Resolution' },
    { k: 'sla', n: 'Response & resolution SLA', unit: '%', dir: 1, target: 95, w: 0.10, cat: 'SLA' },
    { k: 'aht', n: 'Avg handle time', unit: 'min', dir: -1, target: 9.5, w: 0.08, cat: 'Efficiency' },
    { k: 'asa', n: 'Avg speed of answer', unit: 's', dir: -1, target: 20, w: 0.04, cat: 'Efficiency' },
    { k: 'reopen', n: 'Re-open rate', unit: '%', dir: -1, target: 4, w: 0.06, cat: 'Resolution' },
    { k: 'esc', n: 'Escalation rate', unit: '%', dir: -1, target: 12, w: 0.04, cat: 'Resolution' },
    { k: 'adh', n: 'Schedule adherence', unit: '%', dir: 1, target: 95, w: 0.06, cat: 'Workforce' },
    { k: 'vault', n: 'Data Vault compliance', unit: '%', dir: 1, target: 95, w: 0.06, cat: 'Compliance' },
    { k: 'logging', n: 'Call / chat logging', unit: '%', dir: 1, target: 98, w: 0.04, cat: 'Compliance' },
    { k: 'handled', n: 'Items handled (month)', unit: '', dir: 1, target: 380, w: 0.08, cat: 'Volume' },
  ];
  const TEAM_LEVEL = { 'Infra Voice': 0.3, 'Infra Chat': -0.25, 'Infra Web': 0.1, 'EUCS L2': -0.6, 'Gdoc&Vip': 0.55, ITSAM: -1.0, Gsuite: 0.0 };
  const TEAM_WEAK = { 'Infra Chat': { aht: -2.2, csat: -1 }, 'Infra Voice': { asa: -2.5 }, 'EUCS L2': { fcr: -2.4, reopen: -2 }, ITSAM: { sla: -2.2, vault: -2.2 }, 'Gdoc&Vip': { esc: -1.5 }, 'Infra Web': { sdr: -1.6 }, Gsuite: { quality: -1.2 } };

  function perfScore(vals) {
    let tot = 0;
    for (const m of PERF) { const v = vals[m.k]; const att = m.dir > 0 ? v / m.target : m.target / Math.max(v, 0.01); tot += m.w * clamp(att, 0, 1.05); }
    return tot * 100 / 1.05;
  }
  const attain = (m, v) => clamp(m.dir > 0 ? v / m.target : m.target / Math.max(v, 0.01), 0, 1.5);

  /* ------------------------------------------------------------------ build */
  function build(sample, opts = {}) {
    const now = opts.now || new Date();
    const today = opts.today || iso(new Date(now.getTime() - now.getTimezoneOffset() * 60000));
    let nowHour = opts.hour ?? now.getHours(); if (nowHour < 9 || nowHour > 20) nowHour = 14;
    const R = rng(20261111);

    // ---- people
    const emps = (sample.employees || []).filter(e => e.active !== 'no' && TOWERS.some(t => t.id === e.team.split(' - ')[0]));
    const people = emps.map((e, i) => {
      const tower = e.team.split(' - ')[0], t = TOWERS.find(x => x.id === tower), h = hash(e.id);
      const isLead = /Lead/.test(e.role), code = ['M', 'M', 'M', 'G', 'G', 'G', 'G', 'A', 'A', 'E', 'N', 'M', 'G', 'A'][h % 14];
      return { id: e.id, name: e.name.includes(',') ? e.name.split(',').reverse().map(s => s.trim()).join(' ') : e.name, team: e.team, tower, channel: t.channel, role: e.role, isLead, manager: e.manager, shift: code, offStart: h % 7, skill: gauss(rng(h)), loc: e.location };
    });
    const agents = people.filter(p => !p.isLead);
    const leads = people.filter(p => p.isLead);

    // ---- volume history: 35 days ending yesterday plus today up to nowHour
    const days = []; for (let i = 35; i >= 0; i--) days.push(addDays(today, -i));
    const hourly = {}, issueDaily = {}, issueToday = ISSUES.map(() => Array(24).fill(0));
    const surge = { 'MFA / Authenticator': 2.8, 'VPN / Remote Access': 1.9, 'Outlook / Email': 1.3 };
    const totalW = sum(ISSUES.map(i => i.weight));
    for (const d of days) {
      hourly[d] = {};
      const isToday = d === today, uplift = isToday ? { Calls: 1.12, Chats: 1.07, Tickets: 1.05 } : { Calls: 1, Chats: 1, Tickets: 1 };
      for (const c of CHANNELS) {
        const dayTotal = CH[c].base * WEEKDAY[dow(d)] * (1 + 0.05 * gauss(R));
        hourly[d][c] = CH[c].share.map((s, h) => {
          if (isToday && h > nowHour) return null;
          let v = dayTotal * s * (1 + 0.09 * gauss(R));
          if (isToday && h >= 8) v *= uplift[c] * (1 + (h >= 10 ? 0.04 : 0));
          return Math.max(0, Math.round(v));
        });
      }
      const total = sum(CHANNELS.map(c => sum(hourly[d][c].filter(x => x !== null))));
      issueDaily[d] = {};
      const mult = ISSUES.map(i => isToday ? (surge[i.name] || 1) : (d === addDays(today, -1) && i.name === 'MFA / Authenticator' ? 1.35 : 1));
      const w = ISSUES.map((i, k) => i.weight * mult[k] * (1 + 0.1 * gauss(R))), ws = sum(w);
      ISSUES.forEach((i, k) => { issueDaily[d][i.name] = Math.round(total * w[k] / ws); });
      if (isToday) {
        for (let h = 0; h <= nowHour; h++) {
          const ht = sum(CHANNELS.map(c => hourly[d][c][h] || 0));
          const hm = ISSUES.map((i, k) => i.weight * (h >= 8 ? mult[k] * (1 + Math.min(1, (h - 7) / 3) * 0) : 1) * (surge[i.name] && h >= 8 ? 1 : 1));
          const hs = sum(hm); ISSUES.forEach((i, k) => { issueToday[k][h] = Math.round(ht * hm[k] / hs); });
        }
      }
    }
    const dayTotals = d => CHANNELS.map(c => sum(hourly[d][c].filter(x => x !== null)));
    const history = days.slice(0, -1);
    const daily = days.map(d => { const [calls, chats, tickets] = dayTotals(d); return { date: d, calls, chats, tickets, total: calls + chats + tickets, partial: d === today }; });
    const last30 = daily.filter(x => !x.partial).slice(-30);
    const monthlyAvg = { calls: avg(last30.map(x => x.calls)), chats: avg(last30.map(x => x.chats)), tickets: avg(last30.map(x => x.tickets)), total: avg(last30.map(x => x.total)) };
    const sameDow = history.filter(d => dow(d) === dow(today)).slice(-4);
    const byNow = (c, h = nowHour) => sum(hourly[today][c].slice(0, h + 1));
    const usualByNow = c => avg(sameDow.map(d => sum(hourly[d][c].slice(0, nowHour + 1))));
    const todayVol = Object.fromEntries(CHANNELS.map(c => [c, { now: byNow(c), usual: usualByNow(c), monthAvgDay: monthlyAvg[c.toLowerCase()], spark: hourly[today][c].slice(0, nowHour + 1), history: last30.map(x => x[c.toLowerCase()]) }]));

    // ---- issue surge detector (today by-now vs usual same-weekday by-now)
    const cumNow = sum(CHANNELS.map(c => CH[c].base * sum(CH[c].share.slice(0, nowHour + 1)))) / sum(CHANNELS.map(c => CH[c].base));
    const totalToday = sum(CHANNELS.map(c => byNow(c)));
    const issues = ISSUES.map((i, k) => {
      const hist = history.slice(-28).filter(d => dow(d) === dow(today) || (dow(d) < 5) === (dow(today) < 5));
      const dailyHist = hist.map(d => issueDaily[d][i.name]);
      const expected = avg(dailyHist) * cumNow, sd = Math.sqrt(avg(dailyHist.map(x => (x - avg(dailyHist)) ** 2))) * cumNow || 1;
      const actual = Math.round(issueDaily[today][i.name] * (totalToday / sum(CHANNELS.map(c => sum(hourly[today][c].filter(x => x !== null))))));
      const ratio = expected ? actual / expected : 1, z = (actual - expected) / sd;
      const status = ratio >= 1.5 && actual - expected >= 40 ? 'surge' : ratio >= 1.25 ? 'watch' : 'normal';
      const monthAvgDay = avg(last30.map(x => issueDaily[x.date][i.name]));
      return { name: i.name, actual, expected: Math.round(expected), ratio, z, status, monthAvgDay, spark: issueDaily && last30.slice(-14).map(x => issueDaily[x.date][i.name]).concat([Math.round(issueDaily[today][i.name])]), share: actual / totalToday };
    }).sort((a, b) => b.ratio - a.ratio);

    // ---- staffing model
    const absentToday = new Set(agents.filter(a => rng(hash(a.id + today))() < 0.06).map(a => a.id));
    const poolAgents = c => agents.filter(a => a.channel === c);
    const works = (a, d) => { const o = a.offStart, x = dow(d); return !(x === o || x === (o + 1) % 7); };
    const sched = (c, d, h, ag = null, withAbsent = false) => {
      let n = 0; for (const a of (ag || poolAgents(c))) { if (!works(a, d)) continue; if (withAbsent && d === today && absentToday.has(a.id)) continue; const code = a.shift; // night shift crosses midnight: previous-day rule ignored for brevity
        if (covers(code, h)) n++; } return n * (1 - SHRINK);
    };
    // forecast = average of same weekday hourly volumes (last 4 weeks)
    const forecast = {}; // forecast[c][dow][h]
    for (const c of CHANNELS) { forecast[c] = []; for (let x = 0; x < 7; x++) { const ds = history.filter(d => dow(d) === x).slice(-4); forecast[c].push(Array.from({ length: 24 }, (_, h) => avg(ds.map(d => hourly[d][c][h])))); } }
    const required = (c, vol) => vol * CH[c].aht / 60 / CH[c].conc / OCC;

    // ---- audits
    const mkAudits = (seed, bias, count, span, agentsPool) => {
      const r = rng(seed), out = [];
      agentsPool.forEach(a => {
        const n = Math.max(1, Math.round(count + (r() * 2 - 1)));
        for (let k = 0; k < n; k++) {
          const scores = {}; let overall = 0;
          for (const p of AUDIT_PARAMS) { const b = (bias[a.tower] || {})[p.k] || 0; scores[p.k] = Math.round(clamp(92 + b + 2.5 * (TEAM_LEVEL[a.tower] || 0) + 2.6 * a.skill + 5 * gauss(r), 45, 100)); overall += scores[p.k] * p.w; }
          out.push({ id: `AUD-${seed}-${out.length + 1}`, date: addDays(today, -Math.floor(r() * span)), agentId: a.id, agent: a.name, team: a.tower, subTeam: a.team, channel: a.channel === 'Calls' ? 'Call' : a.channel === 'Chats' ? 'Chat' : 'Ticket', scores, overall: Math.round(overall * 10) / 10, fatal: scores.idv < 62 && r() < 0.6 });
        }
      });
      return out;
    };
    const baseBias = { 'Infra Chat': { listen: -9, comms: -4 }, 'Gdoc&Vip': { idv: -8 }, ITSAM: { doc: -11 }, 'EUCS L2': { probe: -8, process: -4 }, 'Infra Voice': { close: -6 }, 'Infra Web': { doc: -4, process: -3 }, Gsuite: { idv: -3 } };
    const sampleBias = { 'Infra Voice': { idv: -12, greet: -3 }, 'Infra Web': { probe: -10 }, 'Infra Chat': { listen: 3 }, 'Gdoc&Vip': { doc: -6 }, ITSAM: { doc: -5, close: -5 }, 'EUCS L2': { probe: 2 } };
    const audits = mkAudits(11, baseBias, 3, 30, agents);
    const sampleAudits = () => mkAudits(77, sampleBias, 2, 14, agents).map(a => ({ ...a, sample: true }));

    // ---- performance
    const perfAgents = people.map(p => {
      const r = rng(hash('perf' + p.id)), lvl = TEAM_LEVEL[p.tower] || 0, weak = TEAM_WEAK[p.tower] || {};
      const vals = {};
      for (const m of PERF) {
        const dev = 0.011 * p.skill + 0.02 * lvl + 0.022 * gauss(r) + (weak[m.k] || 0) * 0.011;
        let v = m.target * (1 + m.dir * dev * (m.k === 'handled' ? 3 : 1));
        if (m.k === 'handled') v = m.target * (1 + dev * 3) * (p.channel === 'Chats' ? 1.25 : p.channel === 'Calls' ? 1.1 : 1) * (p.isLead ? 0.4 : 1);
        if (m.unit === '%') v = clamp(v, 0, 100);
        vals[m.k] = m.k === 'handled' ? Math.round(v) : r1(v);
      }
      return { ...p, vals, score: perfScore(vals), css: r1(clamp(26 + 4 * gauss(r), 8, 60)) };
    });
    const rank = (arr, key = 'score') => { const s = [...arr].sort((a, b) => b[key] - a[key]); s.forEach((x, i) => { x.rank = i + 1; }); return s; };
    rank(perfAgents.filter(a => !a.isLead));
    const teamPerf = TOWERS.map(t => {
      const ag = perfAgents.filter(a => a.tower === t.id && !a.isLead), vals = {};
      for (const m of PERF) vals[m.k] = m.k === 'handled' ? Math.round(sum(ag.map(a => a.vals[m.k]))) : r1(avg(ag.map(a => a.vals[m.k])));
      const volumeTarget = ag.length * 380;
      const v2 = { ...vals, handled: Math.round(vals.handled / Math.max(ag.length, 1)) };
      return { id: t.id, channel: t.channel, size: ag.length, vals, perAgent: v2, score: avg(ag.map(a => a.score)), abandon: r1(clamp(3.2 - 1.1 * (TEAM_LEVEL[t.id] || 0) + 0.6 * gauss(rng(hash(t.id))), 0.8, 12)), volumeTarget };
    });
    rank(teamPerf);
    const leadPerf = leads.map(l => {
      const ag = perfAgents.filter(a => a.team === l.team && !a.isLead);
      const own = perfAgents.find(a => a.id === l.id);
      const teamScore = ag.length ? avg(ag.map(a => a.score)) : own.score;
      const r = rng(hash('lead' + l.id)), coverage = clamp(88 + 4 * (TEAM_LEVEL[l.tower] || 0) + 6 * gauss(r), 55, 100), vault = ag.length ? avg(ag.map(a => a.vals.vault)) : own.vals.vault;
      const score = 0.7 * teamScore + 0.15 * coverage + 0.15 * vault;
      return { ...l, team: l.team, size: ag.length, teamScore, coverage: r1(coverage), vault: r1(vault), score, weakest: weakestMetric(ag.length ? ag : [own]) };
    });
    rank(leadPerf);
    function weakestMetric(ag) { let worst = null; for (const m of PERF) { if (m.w < 0.04) continue; const att = avg(ag.map(a => attain(m, a.vals[m.k]))); if (!worst || att < worst.att) worst = { m, att }; } return worst ? worst.m.n : '—'; }

    // ---- tasks
    const me = { id: 'ME', name: 'You (Operations Lead)' };
    const owners = [me, ...leads.slice(0, 7).map(l => ({ id: l.id, name: l.name }))];
    const T = (title, team, pri, status, due, owner, tags, progress, created) => ({ title, team, priority: pri, status, due: addDays(today, due), owner: owners[owner].id, ownerName: owners[owner].name, tags, progress, created: addDays(today, created), sim: true });
    const tasks = [
      T('Investigate MFA / Authenticator surge and publish a quick KB', 'Infra Voice', 'Urgent', 'In progress', 0, 0, ['Surge', 'KB'], 40, -1),
      T('Approve Monday shift plan (AI draft)', 'Infra SD', 'High', 'Open', 1, 0, ['Shifts'], 0, -1),
      T('Calibrate weekly audit scores with QA', 'Infra Chat', 'Normal', 'Open', 2, 0, ['Audit'], 0, -2),
      T('Coach agents on ID&V checklist (Gdoc&Vip)', 'Gdoc&Vip', 'High', 'In progress', 3, 0, ['Coaching', 'Audit'], 55, -4),
      T('Review VPN certificate error trend', 'Infra Web', 'High', 'Open', -1, 0, ['Surge'], 0, -5),
      T('Publish Oct stack ranking', 'Infra SD', 'Normal', 'Done', -2, 0, ['Ranking'], 100, -9),
      T('Send daily Data Vault compliance reminder', 'ITSAM', 'Normal', 'Open', 0, 0, ['Vault'], 0, -2),
      T('Update CSS response-rate action plan', 'Infra Chat', 'Normal', 'Blocked', 4, 0, ['CSS'], 20, -6),
      T('Nexthink script for VPN health check — validation', 'Infra Web', 'High', 'In progress', 2, 1, ['Nexthink'], 70, -7),
      T('Refresh KB: Outlook profile rebuild', 'EUCS L2', 'Normal', 'Open', 5, 2, ['KB'], 0, -3),
      T('Coach on documentation quality (ITSAM)', 'ITSAM', 'High', 'In progress', 1, 3, ['Coaching', 'Audit'], 35, -5),
      T('Weekend roster gap fill — Calls', 'Infra Voice', 'Urgent', 'Open', 0, 1, ['Shifts'], 0, -1),
      T('Quarterly leave plan consolidation', 'Infra SD', 'Low', 'Open', 12, 2, ['Shifts'], 0, -8),
      T('Escalation reduction review — Gdoc&Vip', 'Gdoc&Vip', 'Normal', 'In progress', 3, 4, ['Quality'], 45, -6),
      T('Re-open rate deep dive — EUCS L2', 'EUCS L2', 'High', 'Open', -2, 4, ['Quality'], 0, -9),
      T('Onboard 3 new analysts — Infra Chat', 'Infra Chat', 'Normal', 'In progress', 6, 5, ['People'], 60, -12),
      T('Peer-review 5 tickets per agent (docs)', 'Infra Web', 'Normal', 'Done', -3, 5, ['Audit'], 100, -10),
      T('Data Vault dropdown cleanup (issue sub-categories)', 'Infra SD', 'Low', 'Done', -4, 6, ['Vault'], 100, -11),
      T('SLA breach RCA — week 44', 'ITSAM', 'High', 'Blocked', 2, 6, ['SLA'], 30, -7),
      T('Cross-skill Chat agents for Calls overflow', 'Infra Chat', 'Normal', 'Open', 7, 3, ['Shifts', 'People'], 0, -2),
      T('Update escalation matrix', 'Gsuite', 'Low', 'Done', -5, 7, ['Process'], 100, -14),
      T('Prepare monthly business review deck', 'Infra SD', 'High', 'In progress', 4, 0, ['Reporting'], 50, -6),
      T('Fix Teams audio KB screenshots', 'Infra Voice', 'Low', 'Open', 8, 2, ['KB'], 0, -3),
      T('Create MFA self-service IVR option proposal', 'Infra Voice', 'Normal', 'Open', 9, 0, ['Surge', 'Automation'], 0, -1),
      T('Audit sample: 20 chats for empathy parameter', 'Infra Chat', 'High', 'In progress', 1, 0, ['Audit'], 65, -3),
      T('Closed-loop CSAT detractor follow-ups', 'Infra Chat', 'Normal', 'Done', -1, 3, ['CSS'], 100, -6),
      T('Shrinkage review — leave vs. attrition', 'Infra SD', 'Normal', 'Open', 10, 1, ['Shifts'], 0, -2),
      T('Lead 1:1s — October performance', 'Infra Web', 'Normal', 'Done', -6, 7, ['People'], 100, -15),
      T('Nexthink: auto-remediation for printer spooler', 'EUCS L2', 'Normal', 'In progress', 6, 1, ['Nexthink'], 25, -4),
    ].map((t, i) => ({ id: 'SIM-T' + String(i + 1).padStart(3, '0'), ...t }));

    // ---- vault entries
    const vr = rng(404), vault = [];
    const resolutions = ['Resolved on contact', 'Resolved on contact', 'Resolved on contact', 'Escalated to L2', 'Callback scheduled'];
    for (let i = 0; i < 180; i++) {
      const a = agents[Math.floor(vr() * agents.length)], issue = ISSUES[Math.floor(vr() * ISSUES.length)];
      const forced = vr() < 0.18 ? ISSUES[1 + Math.floor(vr() * 3)] : issue; // MFA/Account/VPN heavier
      const nx = vr() < 0.58 ? 'Yes' : vr() < 0.75 ? 'No' : 'Not applicable';
      vault.push({ id: 'VLT-' + (9000 + i), ts: addDays(today, -Math.floor(vr() * 7)) + 'T' + String(8 + Math.floor(vr() * 10)).padStart(2, '0') + ':' + String(Math.floor(vr() * 60)).padStart(2, '0'), agentId: a.id, agent: a.name, team: a.team, ticket: 'INC' + (7000000 + Math.floor(vr() * 999999)), channel: a.channel === 'Calls' ? 'Call' : a.channel === 'Chats' ? 'Chat' : 'Ticket', issue: forced.name, sub: forced.subs[Math.floor(vr() * forced.subs.length)], nexthink: nx, script: nx === 'Yes' ? SCRIPTS[Math.floor(vr() * SCRIPTS.length)] : '', cause: CAUSES[Math.floor(vr() * CAUSES.length)][0], resolution: resolutions[Math.floor(vr() * resolutions.length)], sim: true });
    }
    vault.sort((a, b) => b.ts.localeCompare(a.ts));

    return { today, nowHour, days, daily, hourly, monthlyAvg, todayVol, issues, issueToday, issueDaily, people, agents, leads, me, owners, forecast, sched, works, required, poolAgents, absentToday, totalToday, cumNow,
      audits, sampleAudits, perfAgents, teamPerf, leadPerf, tasks, vault, notice: 'SIMULATED demo data. All people, IDs and numbers are fictitious.' };
  }

  /* ------------------------------------------------------------ audits */
  function summariseAudits(rows) {
    const teams = [...new Set(rows.map(r => r.team))];
    const teamStats = teams.map(t => {
      const rs = rows.filter(r => r.team === t), params = {};
      for (const p of AUDIT_PARAMS) { const v = rs.map(r => r.scores[p.k]).filter(x => x !== undefined && x !== null && !Number.isNaN(x)); params[p.k] = v.length ? avg(v) : null; }
      const overall = avg(rs.map(r => r.overall));
      const gaps = AUDIT_PARAMS.filter(p => params[p.k] !== null).map(p => ({ p, gap: params[p.k] - p.target })).sort((a, b) => a.gap - b.gap);
      return { team: t, count: rs.length, overall, pass: rs.filter(r => r.overall >= AUDIT_TARGET).length / rs.length * 100, fatal: rs.filter(r => r.fatal).length, params, weakest: gaps[0] };
    }).sort((a, b) => b.overall - a.overall);
    const paramAvg = AUDIT_PARAMS.map(p => { const v = rows.map(r => r.scores[p.k]).filter(x => x !== undefined && x !== null); return { ...p, avg: v.length ? avg(v) : null }; });
    const overall = avg(rows.map(r => r.overall));
    const weeks = {}; rows.forEach(r => { const d = new Date(r.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); const k = iso(d); (weeks[k] = weeks[k] || []).push(r.overall); });
    const trend = Object.keys(weeks).sort().map(k => ({ label: k.slice(5), value: avg(weeks[k]), n: weeks[k].length }));
    const byAgent = {}; rows.forEach(r => { (byAgent[r.agentId] = byAgent[r.agentId] || { id: r.agentId, name: r.agent, team: r.team, v: [] }).v.push(r.overall); });
    const agentList = Object.values(byAgent).map(a => ({ ...a, avg: avg(a.v), n: a.v.length })).sort((a, b) => a.avg - b.avg);
    const insights = [];
    const lowTeam = teamStats[teamStats.length - 1], topTeam = teamStats[0];
    if (teamStats.length > 1) insights.push({ tone: 'warn', text: `${lowTeam.team} is the lowest scoring team at ${r1(lowTeam.overall)}%${lowTeam.weakest ? `, lagging most on ${lowTeam.weakest.p.n} (${r1(lowTeam.params[lowTeam.weakest.p.k])}% vs ${lowTeam.weakest.p.target}% target)` : ''}.` }, { tone: 'good', text: `${topTeam.team} leads with ${r1(topTeam.overall)}% and ${r1(topTeam.pass)}% of audits at or above the ${AUDIT_TARGET}% pass mark.` });
    const worstParam = [...paramAvg].filter(p => p.avg !== null).sort((a, b) => (a.avg - a.target) - (b.avg - b.target))[0];
    if (worstParam) insights.push({ tone: 'warn', text: `Across all teams the weakest parameter is ${worstParam.n} at ${r1(worstParam.avg)}% (target ${worstParam.target}%). ${COACH[worstParam.k] || ''}` });
    const fatal = rows.filter(r => r.fatal).length; if (fatal) insights.push({ tone: 'warn', text: `${fatal} audit(s) carry a fatal ID&V / security flag. Review these first.` });
    if (trend.length >= 2) { const d = trend[trend.length - 1].value - trend[trend.length - 2].value; insights.push({ tone: d >= 0 ? 'good' : 'warn', text: `Latest week is ${d >= 0 ? 'up' : 'down'} ${Math.abs(r1(d))} pts versus the week before.` }); }
    const actions = teamStats.filter(t => t.weakest && t.weakest.gap < 0).sort((a, b) => a.weakest.gap - b.weakest.gap).slice(0, 4).map(t => ({ team: t.team, param: t.weakest.p.n, gap: t.weakest.gap, text: COACH[t.weakest.p.k] }));
    return { rows, overall, passRate: rows.filter(r => r.overall >= AUDIT_TARGET).length / (rows.length || 1) * 100, fatal, teamStats, paramAvg, trend, agentList, insights, actions };
  }

  /* ------------------------------------------------------------ shifts */
  function coverageGrid(sim, channel, getCov, fc) {
    // returns grid[dow][h] = {req, cov, gap}
    const f = fc || sim.forecast[channel];
    return DAYS.map((_, x) => Array.from({ length: 24 }, (_, h) => { const req = sim.required(channel, f[x][h]), cov = getCov(x, h); return { req, cov, gap: cov - req }; }));
  }
  function currentCoverage(sim, channel, fc) { const ag = sim.poolAgents(channel); return coverageGrid(sim, channel, (x, h) => { let n = 0; for (const a of ag) { if (!(x === a.offStart || x === (a.offStart + 1) % 7) && covers(a.shift, h)) n++; } return n * (1 - SHRINK); }, fc); }
  function gridStats(grid) {
    let under = 0, over = 0, gapHrs = 0, worst = null; const byDay = DAYS.map(() => ({ under: 0, gap: 0, req: 0, cov: 0 }));
    grid.forEach((row, x) => row.forEach((c, h) => { byDay[x].req += c.req; byDay[x].cov += c.cov; if (c.gap < -0.5) { under++; gapHrs += -c.gap; byDay[x].under++; byDay[x].gap += -c.gap; if (!worst || c.gap < worst.gap) worst = { x, h, gap: c.gap, req: c.req, cov: c.cov }; } else if (c.gap > 3) over++; }));
    return { under, over, gapHrs, worst, byDay };
  }
  function windows(grid, minGap = 0.8) { // contiguous understaffed windows per weekday
    const out = []; grid.forEach((row, x) => { let s = null, mx = 0; for (let h = 0; h <= 24; h++) { const g = h < 24 ? row[h].gap : 0; if (g < -minGap) { if (s === null) { s = h; mx = 0; } mx = Math.max(mx, -g); } else if (s !== null) { out.push({ x, from: s, to: h, max: mx }); s = null; } } }); return out.sort((a, b) => b.max - a.max);
  }
  // Greedy optimiser: assigns each agent a shift code and a pair of consecutive days off so the weekly
  // deficit (required - covered) is minimised. Rest between shifts stays >= 15 h because the code is fixed for the week.
  function planShifts(sim, channel, opts = {}) {
    const fc = opts.forecast || sim.forecast[channel], ag = sim.poolAgents(channel);
    const codes = opts.codes || Object.keys(SHIFTS), shrink = opts.shrink ?? SHRINK;
    const req = DAYS.map((_, x) => Array.from({ length: 24 }, (_, h) => sim.required(channel, fc[x][h])));
    const cov = DAYS.map(() => Array(24).fill(0));
    const plan = [];
    const order = [...ag].sort((a, b) => a.id.localeCompare(b.id));
    for (const a of order) {
      let best = null;
      for (const code of codes) for (let off = 0; off < 7; off++) {
        let score = 0;
        for (let x = 0; x < 7; x++) { if (x === off || x === (off + 1) % 7) continue; for (let h = 0; h < 24; h++) if (covers(code, h)) { const need = req[x][h] - cov[x][h]; score += need > 0 ? Math.min(need, 1 - shrink) * 1 : -0.15; } }
        if (!best || score > best.score) best = { code, off, score };
      }
      for (let x = 0; x < 7; x++) { if (x === best.off || x === (best.off + 1) % 7) continue; for (let h = 0; h < 24; h++) if (covers(best.code, h)) cov[x][h] += 1 - shrink; }
      plan.push({ id: a.id, name: a.name, team: a.team, shift: best.code, offStart: best.off });
    }
    const grid = req.map((row, x) => row.map((r, h) => ({ req: r, cov: cov[x][h], gap: cov[x][h] - r })));
    return { plan, grid, channel };
  }
  // Build a forecast override from uploaded rows [{dow|date, hour, calls, chats, tickets}]
  function forecastFromRows(rows) {
    const acc = {}; CHANNELS.forEach(c => { acc[c] = DAYS.map(() => Array.from({ length: 24 }, () => ({ s: 0, n: 0 }))); });
    const keys = { Calls: /^(calls?|voice|offered)$/i, Chats: /^(chats?)$/i, Tickets: /^(tickets?|web|incidents?)$/i };
    const seen = new Map();
    for (const r of rows) {
      const n = {}; for (const k of Object.keys(r)) n[String(k).trim().toLowerCase()] = r[k];
      let x = null;
      const dv = n.date ?? n.day; if (dv !== undefined && dv !== '') { const t = String(dv); const wd = DAYS.findIndex(d => t.toLowerCase().startsWith(d.toLowerCase())); if (wd >= 0) x = wd; else { const dt = new Date(t); if (!isNaN(dt)) x = (dt.getDay() + 6) % 7; } }
      const hv = n.hour ?? n.interval ?? n['interval start']; let h = hv === undefined ? NaN : parseInt(String(hv), 10);
      if (x === null || !(h >= 0 && h < 24)) continue;
      for (const c of CHANNELS) { const col = Object.keys(n).find(k => keys[c].test(k)); if (col === undefined) continue; const v = Number(n[col]); if (!isNaN(v)) { const cell = acc[c][x][h]; cell.s += v; cell.n++; seen.set(c, true); } }
      seen.set('rows', (seen.get('rows') || 0) + 1);
    }
    if (!seen.get('rows')) throw Error('No usable rows. Expected columns: Date (or Day), Hour, and Calls / Chats / Tickets.');
    const fc = {}; for (const c of CHANNELS) fc[c] = acc[c].map(row => row.map(cell => cell.n ? cell.s / cell.n : null));
    return { fc, rows: seen.get('rows'), channels: CHANNELS.filter(c => seen.get(c)) };
  }
  function sampleForecastRows(sim) { // "Monday campaign" sample: +30% Mon/Tue 10–13 and a late-evening ramp
    const rows = []; for (let x = 0; x < 7; x++) for (let h = 0; h < 24; h++) { const row = { Day: DAYS[x], Hour: h }; for (const c of CHANNELS) { let v = sim.forecast[c][x][h]; if (x < 2 && h >= 10 && h <= 13) v *= 1.3; if (h >= 18 && h <= 21) v *= 1.15; row[c] = Math.round(v); } rows.push(row); } return rows;
  }
  function sampleAuditRows(sim) {
    return sim.sampleAudits().map(a => ({ Date: a.date, Team: a.team, Agent: a.agent, 'Agent ID': a.agentId, Channel: a.channel, ...Object.fromEntries(AUDIT_PARAMS.map(p => [p.n, a.scores[p.k]])), Overall: a.overall }));
  }
  function auditRowsFromSheet(rows, sim) {
    const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const out = []; let accepted = 0;
    const match = { greet: /greet|open/, idv: /idv|secur|verif/, listen: /listen|empath/, probe: /prob|troubl/, process: /process|kb|adher/, doc: /doc|notes|logging/, comms: /hold|soft|comm/, close: /clos|survey|css/ };
    for (const r of rows) {
      const keys = Object.keys(r); const g = re => { const k = keys.find(x => re.test(norm(x))); return k === undefined ? undefined : r[k]; };
      const team = String(g(/^team|tower|queue/) ?? '').trim(), agent = String(g(/^agent(name)?$|^name|analyst/) ?? '').trim();
      const date = (() => { const v = g(/^date/); if (v instanceof Date) return iso(v); const d = new Date(v); return isNaN(d) ? iso(new Date()) : iso(d); })();
      const scores = {}; let any = 0;
      for (const p of AUDIT_PARAMS) { const k = keys.find(x => match[p.k].test(norm(x)) && !/^(overall|total|score)/.test(norm(x))); if (k !== undefined && r[k] !== '' && !isNaN(Number(r[k]))) { scores[p.k] = Number(r[k]); any++; } }
      let overall = g(/^(overall|total|score|quality)/); overall = overall === undefined || overall === '' ? NaN : Number(overall);
      if (isNaN(overall) && any) overall = sum(AUDIT_PARAMS.filter(p => scores[p.k] !== undefined).map(p => scores[p.k] * p.w)) / sum(AUDIT_PARAMS.filter(p => scores[p.k] !== undefined).map(p => p.w));
      if (!team || isNaN(overall)) continue;
      accepted++; out.push({ id: 'UP-' + accepted, date, agentId: String(g(/^(agentid|empid|id)$/) ?? agent), agent: agent || 'Unknown', team, channel: String(g(/channel/) ?? ''), scores, overall: r1(overall), fatal: /^(y|yes|true|1)$/i.test(String(g(/fatal/) ?? '')) || (scores.idv !== undefined && scores.idv < 60) });
    }
    if (!out.length) throw Error('No usable rows. Expected columns: Team, Agent, Date, an Overall score and/or the parameter columns.');
    return out;
  }

  /* ------------------------------------------------------------ local overlay */
  const memory = {};
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem('SD_OS_sim_' + key); if (v !== null) return JSON.parse(v); } catch (_) {} return key in memory ? memory[key] : fallback; },
    set(key, value) { memory[key] = value; try { localStorage.setItem('SD_OS_sim_' + key, JSON.stringify(value)); } catch (_) {} },
    remove(key) { delete memory[key]; try { localStorage.removeItem('SD_OS_sim_' + key); } catch (_) {} },
  };

  return { build, summariseAudits, coverageGrid, currentCoverage, gridStats, windows, planShifts, forecastFromRows, sampleForecastRows, sampleAuditRows, auditRowsFromSheet, store,
    TOWERS, INFRA_SD, CHANNELS, CH, DAYS, SHIFTS, covers, label, ISSUES, CAUSES, SCRIPTS, AUDIT_PARAMS, AUDIT_TARGET, COACH, PERF, attain, perfScore, SHRINK, OCC, r1, avg, sum, iso, addDays, dow, hash };
});
