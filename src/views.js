/* Page renderers and interactions for the redesigned workspace. Renders HTML strings from the SIMULATED
   model (SDSim) and from any uploads the user adds. Event wiring lives at the bottom (data-v attributes). */
(function () {
'use strict';
const C = SDCharts, C2 = SDCharts2, S = SDSim, esc = C.esc, fmt = C.fmt;
let sim = null;
const getSim = () => sim || (sim = S.build(SD_SAMPLE_DATA));
const ui = {
  tab: { audits: 'Dashboard', shifts: 'Coverage', tasks: 'Board', performance: 'Teams', datavault: 'Enter data' },
  auditUp: S.store.get('auditUp', null), forecast: S.store.get('forecast', null), plans: {}, channel: 'Calls', day: null, aiShrink: 20, aiNight: true,
  who: 'all', pri: '', team: '', q: '', scope: 'infra', rankBy: 'score', agentTeam: '', vaultTeam: '', vaultIssue: '', vaultSub: '', published: S.store.get('published', {}),
};
const TABS = { audits: ['Dashboard', 'Transcript audit'], shifts: ['Coverage', 'AI planner', 'Roster tools'], tasks: ['Board', 'List', 'Workload'], performance: ['Teams', 'Agents', 'Leads', 'Parameters', 'Rubric scoring'], datavault: ['Enter data', 'Entries & insights'] };
const LEGACY = { audits: 'Transcript audit', shifts: 'Roster tools', performance: 'Rubric scoring' };
const hh = h => String(h).padStart(2, '0') + ':00';
const pct = v => v === null || v === undefined || Number.isNaN(v) ? '—' : fmt(v) + '%';
const sgn = v => (v >= 0 ? '+' : '') + fmt(v);
const initials = n => /^You\b/.test(String(n)) ? 'ME' : String(n).split(/[\s,]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const ICON = {
  check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2l6.5 11.5h-13z M8 6.5v3.2 M8 11.6v.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  spark: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.6 4.4 4.4 1.6-4.4 1.6L8 13.5l-1.6-4.4L2 7.5l4.4-1.6z" fill="currentColor"/></svg>',
  alert: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 4.8v4 M8 11v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
const pill = (tone, text) => `<span class="pill ${tone}"><i class="pill-ic">${tone === 'good' ? ICON.check : tone === 'bad' ? ICON.alert : tone === 'warn' ? ICON.warn : ICON.spark}</i>${esc(text)}</span>`;
const stat = (label, value, sub = '', { tone = '', spark = '', visual = '', icon = '' } = {}) => `<article class="stat ${tone}"><div class="stat-top"><span class="stat-label">${esc(label)}</span>${icon ? `<span class="stat-ic">${icon}</span>` : ''}</div><div class="stat-row"><div><div class="stat-value">${value}</div><div class="stat-sub">${sub}</div></div><div class="stat-vis">${visual || spark}</div></div></article>`;
const panel = (title, body, { wide = false, note = '', right = '', cls = '' } = {}) => `<section class="panel ${wide ? 'wide' : ''} ${cls}"><div class="panel-head"><h2>${esc(title)}</h2>${right ? `<div class="panel-right">${right}</div>` : ''}</div>${note ? `<p class="panel-note muted">${note}</p>` : ''}${body}</section>`;
const insights = items => items.length ? `<ul class="insights">${items.map(i => `<li class="insight ${i.tone || 'info'}"><span class="insight-ic">${i.tone === 'warn' ? ICON.warn : i.tone === 'good' ? ICON.check : i.tone === 'bad' ? ICON.alert : ICON.spark}</span><span>${i.text}</span></li>`).join('')}</ul>` : '<p class="muted">Nothing unusual to report.</p>';
const simBadge = '<span class="sim-badge" title="All numbers on this page are simulated for demonstration">Simulated data</span>';
const head = (title, sub, actions = '') => `<div class="page-head"><div><h1>${esc(title)} ${simBadge}</h1><p class="muted">${sub}</p></div><div class="page-actions">${actions}</div></div><div id="inline-status" role="status" class="muted"></div>`;
const btn = (label, v, extra = '', cls = '') => `<button type="button" class="${cls}" data-v="${v}" ${extra}>${esc(label)}</button>`;
const chips = (page, names, current, key = 'tab') => `<div class="chips" role="tablist">${names.map(n => `<button type="button" role="tab" data-v="${key}" data-page="${page}" data-val="${esc(n)}" aria-selected="${n === current}">${esc(n)}</button>`).join('')}</div>`;
const avatar = n => `<span class="avatar" title="${esc(n)}">${esc(initials(n))}</span>`;
const dueText = (due, today) => { const d = Math.round((Date.parse(due) - Date.parse(today)) / 86400000); return d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : d < 0 ? `${-d}d overdue` : `Due in ${d}d`; };
const table = (hdr, rows, empty = 'No data.') => rows.length ? `<div class="table-wrap"><table><thead><tr>${hdr.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<p class="muted">${esc(empty)}</p>`;

/* ================================================================ OVERVIEW */
function hourVol(sim, c, h) { return h <= sim.nowHour ? (sim.hourly[sim.today][c][h] || 0) : sim.forecast[c][S.dow(sim.today)][h] * 1.08; }
function avail(sim, h) { let a = 0, r = 0; for (const c of S.CHANNELS) { a += sim.sched(c, sim.today, h, null, true); r += sim.required(c, hourVol(sim, c, h)); } return { a, r }; }
function overview(ctx) {
  const sim = getSim(), td = sim.today, tdow = S.dow(td), nh = sim.nowHour;
  const taskView = tasksModel(ctx), mine = taskView.filter(t => t.owner === 'ME' && t.status !== 'Done');
  const overdueMine = mine.filter(t => t.due < td);
  // volume
  const proj = c => sim.todayVol[c].now / sim.cumNow, vol = sim.todayVol;
  const delta = c => (vol[c].now / vol[c].usual - 1) * 100;
  const dTone = d => d > 15 ? 'warn' : '';
  const totalNow = sum3(c => vol[c].now), totalUsual = sum3(c => vol[c].usual), totalProj = totalNow / sim.cumNow, mAvg = sim.monthlyAvg.total;
  const mk = (c, tone) => stat(`${c} so far`, fmt(vol[c].now), `<span class="delta ${delta(c) >= 0 ? 'up' : 'down'}">${delta(c) >= 0 ? '▲' : '▼'} ${Math.abs(delta(c)).toFixed(0)}%</span> vs usual by ${hh(nh)} · avg ${fmt(Math.round(vol[c].monthAvgDay))}/day`, { tone: dTone(delta(c)), spark: C2.sparkline(vol[c].spark, { tone }) });
  // staffing now
  const ag = sim.agents, sched = ag.filter(a => sim.works(a, td)), present = sched.filter(a => S.covers(a.shift, nh) && !sim.absentToday.has(a.id));
  const onLeave = sched.filter(a => sim.absentToday.has(a.id)).length, off = ag.length - sched.length;
  const av = avail(sim, nh), ratio = av.a / av.r * 100;
  // audits
  const au = S.summariseAudits(ui.auditUp || sim.audits), lowTeams = [...au.teamStats].reverse().slice(0, 3);
  const worstParam = [...au.paramAvg].filter(p => p.avg !== null).sort((a, b) => (a.avg - a.target) - (b.avg - b.target))[0];
  // SD metrics (Infra SD weighted)
  const infra = sim.teamPerf.filter(t => S.INFRA_SD.includes(t.id));
  const m = k => S.r1(S.avg(infra.map(t => t.vals[k])));
  const abandon = S.r1(S.avg(infra.map(t => t.abandon)));
  const strip = [['SLA', m('sla') + '%', S.PERF.find(p => p.k === 'sla'), m('sla')], ['ASA', m('asa') + ' s', S.PERF.find(p => p.k === 'asa'), m('asa')], ['AHT', m('aht') + ' min', S.PERF.find(p => p.k === 'aht'), m('aht')], ['Abandon', abandon + '%', { dir: -1, target: 5 }, abandon], ['FCR', m('fcr') + '%', S.PERF.find(p => p.k === 'fcr'), m('fcr')], ['CSAT', m('csat') + '%', S.PERF.find(p => p.k === 'csat'), m('csat')], ['Same-day res.', m('sdr') + '%', S.PERF.find(p => p.k === 'sdr'), m('sdr')], ['Re-open', m('reopen') + '%', S.PERF.find(p => p.k === 'reopen'), m('reopen')], ['Escalation', m('esc') + '%', S.PERF.find(p => p.k === 'esc'), m('esc')]];
  const stripHtml = `<div class="sdstrip">${strip.map(([n, v, def, val]) => { const att = def.dir > 0 ? val / def.target : def.target / val; const t = att >= 1 ? 'good' : att >= 0.95 ? 'warn' : 'bad'; return `<div class="sdm ${t}"><span class="sdm-n">${esc(n)}</span><b>${esc(v)}</b><small>target ${def.dir < 0 ? '≤' : '≥'} ${def.target}${def.unit === 'min' ? ' min' : def.unit === 's' ? ' s' : n === 'Abandon' ? '%' : '%'}</small></div>`; }).join('')}</div>`;
  // surges
  const surges = sim.issues.filter(i => i.status === 'surge'), watch = sim.issues.filter(i => i.status === 'watch');
  // understaffed window next hours
  let worstNext = null; for (let h = nh; h < Math.min(24, nh + 5); h++) { const x = avail(sim, h); if (!worstNext || x.a - x.r < worstNext.gap) worstNext = { h, gap: x.a - x.r, a: x.a, r: x.r }; }
  // brief
  const brief = [];
  if (surges.length) { const s = surges[0]; brief.push({ tone: 'bad', text: `<b>${esc(s.name)}</b> is surging: ${s.actual} contacts so far vs ${s.expected} expected by ${hh(nh)} (${s.ratio.toFixed(1)}×). Publish a KB banner and brief agents.` }); }
  if (watch.length) brief.push({ tone: 'warn', text: `Watch <b>${esc(watch.map(w => w.name).join(', '))}</b> — ${watch[0].ratio.toFixed(2)}× normal and rising.` });
  brief.push(worstNext && worstNext.gap < -1 ? { tone: 'warn', text: `Tightest slot is <b>${hh(worstNext.h)}</b>: ${fmt(worstNext.a)} effective agents available vs ${fmt(worstNext.r)} needed. Consider pulling cross-skilled agents or delaying breaks.` } : { tone: 'good', text: 'Staffing covers forecast demand for the next 5 hours.' });
  if (worstParam) brief.push({ tone: 'warn', text: `Audit watch-out: <b>${esc(lowTeams[0].team)}</b> is lowest (${S.r1(lowTeams[0].overall)}%); the weakest parameter overall is <b>${esc(worstParam.n)}</b>.` });
  brief.push(overdueMine.length ? { tone: 'warn', text: `You have <b>${overdueMine.length}</b> overdue task(s) and ${mine.length} open in total.` } : { tone: 'good', text: `You have ${mine.length} open task(s); none overdue.` });
  // charts
  const hrs = []; for (let h = 6; h <= 22; h++) hrs.push(h);
  const usualH = h => S.sum(S.CHANNELS.map(c => S.avg(Array.from({ length: 4 }, (_, k) => { const d = S.addDays(td, -7 * (k + 1)); return sim.hourly[d] ? sim.hourly[d][c][h] : 0; }))));
  const cols = hrs.map(h => ({ label: String(h).padStart(2, '0'), parts: S.CHANNELS.map(c => ({ name: c, value: h <= nh ? sim.hourly[td][c][h] : 0 })) }));
  const hourChart = C2.stackedColumns(cols, S.CHANNELS, { label: 'Hourly volume today by channel', marker: hrs.map(usualH), markerLabel: 'Usual total for this weekday', height: 190 });
  const labels30 = sim.daily.map(d => d.date.slice(5));
  const dailyTotals = sim.daily.map(d => d.partial ? Math.round(totalProj) : d.total);
  const trendChart = C2.multiLine(labels30, [{ name: 'Daily total (today projected)', values: dailyTotals, area: true, mark: true }, { name: 'Monthly average', values: sim.daily.map(() => Math.round(mAvg)), dash: true, tone: 'c3' }], { label: 'Daily volume versus monthly average', hlIndex: labels30.length - 1 });
  const cmp = C2.compareBars(S.CHANNELS.map(c => ({ label: c, a: Math.round(proj(c)), b: Math.round(vol[c].monthAvgDay) })), { aName: 'Today (projected full day)', bName: 'Monthly daily average' });
  const surgeRows = sim.issues.slice(0, 8).map(i => `<tr class="${i.status}"><td><b>${esc(i.name)}</b></td><td>${i.status === 'surge' ? pill('bad', 'Unusual surge') : i.status === 'watch' ? pill('warn', 'Watch') : pill('good', 'Normal')}</td><td class="num">${i.actual}</td><td class="num muted">${i.expected}</td><td class="num"><b class="${i.status === 'surge' ? 'bad-text' : i.status === 'watch' ? 'warn-text' : ''}">${i.ratio.toFixed(2)}×</b></td><td>${C2.sparkline(i.spark, { tone: i.status === 'surge' ? 'bad' : i.status === 'watch' ? 'c3' : 'c1', w: 84 })}</td><td class="num muted">${fmt(Math.round(i.monthAvgDay))}</td></tr>`);
  const surgeTable = table(['Issue type', 'Status', 'Today', 'Expected by now', 'vs usual', '14-day trend', 'Monthly avg / day'], surgeRows);
  // shift presence
  const shiftRows = Object.keys(S.SHIFTS).map(code => { const sc = sched.filter(a => a.shift === code); const pr = sc.filter(a => S.covers(a.shift, nh) && !sim.absentToday.has(a.id)); return { code, label: `${S.SHIFTS[code].name} ${S.label(code)}`, n: sc.length, now: pr.length }; });
  const shiftBars = C.hBars(shiftRows.map(r => ({ label: r.label, value: r.n, display: `${r.n} rostered${r.now ? ` · ${r.now} on now` : ''}` })), {});
  const teamRows = S.TOWERS.map(t => { const a = ag.filter(x => x.tower === t.id), s = a.filter(x => sim.works(x, td)), p = s.filter(x => S.covers(x.shift, nh) && !sim.absentToday.has(x.id)); return { label: t.id, value: p.length, display: `${p.length} present of ${a.length} associates` }; });
  const hoursRange = []; for (let h = 6; h <= 23; h++) hoursRange.push(h);
  const availChart = C2.multiLine(hoursRange.map(hh), [{ name: 'Agents required', values: hoursRange.map(h => S.r1(avail(sim, h).r)), tone: 'c3', dash: true }, { name: 'Agents available (after shrinkage)', values: hoursRange.map(h => S.r1(avail(sim, h).a)), area: true }], { label: 'Agents available versus required by hour', unit: ' agents', w: 560, height: 250 });
  const auditBlock = `<div class="split"><div class="gauge-wrap">${C2.gauge(au.overall, { label: 'Overall audit score', target: S.AUDIT_TARGET, text: S.r1(au.overall) + '%' })}<small class="muted">target ${S.AUDIT_TARGET}%</small></div><div class="grow">${C.hBars(lowTeams.map(t => ({ label: t.team, value: t.overall, display: S.r1(t.overall) + '%' })), { max: 100 })}<p class="muted small">Lowest teams · weakest parameter: <b>${esc(worstParam?.n || '—')}</b> (${pct(S.r1(worstParam?.avg))})</p></div></div>${btn('Open audit dashboard', 'go', 'data-page="audits"', 'linkbtn')}`;
  const taskBlock = `<ul class="tasklist">${mine.sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5).map(t => `<li><span class="prio ${t.priority.toLowerCase()}" title="${esc(t.priority)}"></span><span class="grow">${esc(t.title)}<small class="muted">${esc(t.team)}</small></span><span class="due ${t.due < td ? 'late' : ''}">${dueText(t.due, td)}</span></li>`).join('') || '<li class="muted">No open tasks assigned to you.</li>'}</ul>${btn('Open task board', 'go', 'data-page="tasks"', 'linkbtn')}`;
  const recos = [
    surges[0] && { tone: 'bad', text: `Pre-load a <b>${esc(surges[0].name)}</b> macro and add an IVR announcement.`, a: ['Create task', 'task-from', `data-title="Handle ${esc(surges[0].name)} surge"`] },
    worstNext && worstNext.gap < -1 && { tone: 'warn', text: `Generate an optimised roster to close the ${hh(worstNext.h)} gap.`, a: ['Open AI planner', 'go', 'data-page="shifts" data-tab="AI planner"'] },
    { tone: 'info', text: `Coach <b>${esc(lowTeams[0].team)}</b> on ${esc(lowTeams[0].weakest?.p.n || 'their lowest parameter')}.`, a: ['See audit insights', 'go', 'data-page="audits"'] },
    { tone: 'info', text: 'Remind agents to log Nexthink scripts and cause codes in the Data Vault.', a: ['Open Data Vault', 'go', 'data-page="datavault"'] },
  ].filter(Boolean);
  const recoHtml = `<ul class="recos">${recos.map(r => `<li class="reco ${r.tone}"><span>${r.text}</span>${btn(r.a[0], r.a[1], r.a[2])}</li>`).join('')}</ul>`;
  return `<div class="hero"><div><p class="eyebrow">${new Date(td + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })} · snapshot as of ${hh(nh)}</p><h1>Good day, here is your service desk right now ${simBadge}</h1><p class="muted">AI-assisted operations brief across calls, chats and tickets. Simulated model — connect real feeds via Settings → Data management.</p></div><div class="hero-actions">${btn('Upload sample data', 'go', 'data-page="audits"', 'primary')}${btn('Ask SD OS', 'open-chat')}</div></div>
  <section class="aibrief"><div class="aibrief-head"><span class="ai-dot"></span><h2>AI Ops brief</h2><span class="muted small">auto-generated · simulated model</span></div>${insights(brief)}</section>
  <div class="stats">${mk('Calls', 'c1')}${mk('Chats', 'c2')}${mk('Tickets', 'c4')}${stat('Total vs monthly average', fmt(totalNow), `Projected ${fmt(Math.round(totalProj))} today · monthly avg ${fmt(Math.round(mAvg))}/day <span class="delta ${totalProj >= mAvg ? 'up' : 'down'}">${totalProj >= mAvg ? '▲' : '▼'} ${Math.abs((totalProj / mAvg - 1) * 100).toFixed(0)}%</span>`, { spark: C2.sparkline(sim.daily.map(d => d.partial ? Math.round(totalProj) : d.total).slice(-14), { tone: 'c5' }) })}</div>
  <div class="stats">${stat('Associates present in shift', `${present.length}<span class="of"> / ${ag.length}</span>`, `${sched.length} rostered today · ${onLeave} absent/leave · ${off} weekly off`, { visual: C2.gauge(present.length / ag.length * 100, { label: 'Associates present', text: Math.round(present.length / ag.length * 100) + '%', tone: 'c2' }) })}${stat('Availability vs demand', `${fmt(S.r1(av.a))}<span class="of"> / ${fmt(S.r1(av.r))} needed</span>`, ratio >= 100 ? pill('good', 'Covered') : ratio >= 90 ? pill('warn', 'Tight') : pill('bad', 'Understaffed'), { tone: ratio < 90 ? 'bad' : ratio < 100 ? 'warn' : '', visual: C2.gauge(Math.min(100, ratio), { label: 'Availability vs demand', text: Math.round(ratio) + '%', tone: ratio >= 100 ? 'good' : ratio >= 90 ? 'c3' : 'bad' }) })}${stat('Audit score', pct(S.r1(au.overall)), `${au.rows.length} audits · pass rate ${pct(S.r1(au.passRate))}`, { visual: C2.gauge(au.overall, { label: 'Audit score', target: S.AUDIT_TARGET, text: Math.round(au.overall) + '', tone: 'c4' }) })}${stat('My assigned tasks', String(mine.length), `${overdueMine.length ? `<span class="bad-text">${overdueMine.length} overdue</span>` : 'none overdue'} · ${taskView.filter(t => t.owner === 'ME' && t.status === 'Done').length} done`, { tone: overdueMine.length ? 'warn' : '' })}</div>
  <h2 class="section-title">Service desk health <small class="muted">Infra SD (Voice · Chat · Web) · month to date · target shown under each metric</small></h2>${stripHtml}
  <div class="dash-grid">
  ${panel('Today by hour vs usual', hourChart, { wide: true, note: `Bars show volume so far; the dot marks the usual total for a ${S.DAYS[tdow]} at that hour (4-week average).` })}
  ${panel('Issue-type surge detector', surgeTable, { wide: true, note: 'Compares each issue type with its usual volume by this time of day. A surge needs ≥1.5× and at least 40 extra contacts.', right: surges.length ? pill('bad', `${surges.length} surge`) : pill('good', 'No surge') })}
  ${panel('Every day vs monthly average', trendChart, { wide: true, note: 'Last 30 days. The dashed line is the 30-day average; the last point is today projected from the pace so far.' })}
  ${panel('Today vs monthly average, by channel', cmp)}
  ${panel('Availability vs demand', availChart, { note: 'Same unit (agents) on one axis. Available = scheduled × (1 − 20% shrinkage); required from volume, AHT and 82% occupancy.' })}
  ${panel('Who is in shift', `<h3 class="mini">By shift</h3>${shiftBars}<h3 class="mini">By team (present now)</h3>${C.hBars(teamRows, {})}`)}
  ${panel('Audit snapshot', auditBlock)}
  ${panel('My assigned tasks', taskBlock)}
  ${panel('AI recommendations', recoHtml)}
  </div>`;
}
const sum3 = f => S.sum(S.CHANNELS.map(f));

/* ================================================================ AUDITS */
function audits(ctx) {
  const sim = getSim(), up = ui.auditUp, rows = up ? up.rows : sim.audits, au = S.summariseAudits(rows), base = S.summariseAudits(sim.audits);
  const uploadCard = `<section class="card upload"><div class="upload-main"><div><h2>Upload audit results</h2><p class="muted">Excel or CSV with <b>Team, Agent, Date</b> and an <b>Overall</b> score and/or the 8 parameter columns (${S.AUDIT_PARAMS.map(p => esc(p.n)).join(', ')}). The dashboard rebuilds instantly.</p></div><div class="upload-actions"><label class="filebtn primary">Choose file<input id="audit-file" type="file" accept=".xlsx,.xls,.csv" hidden></label>${btn('Use sample upload', 'audit-sample', '', 'accent')}${btn('Download sample file', 'audit-template')}${up ? btn('Reset to demo data', 'audit-reset') : ''}</div></div><p class="muted small">${up ? `Showing <b>${esc(up.name)}</b> · ${rows.length} audits${up.sample ? ' (simulated sample upload)' : ''}` : `Showing the simulated month · ${rows.length} audits`}</p></section>`;
  const teamBars = C2.rankBars(au.teamStats.map(t => ({ label: t.team, value: S.r1(t.overall), sub: `${t.count} audits · ${pct(S.r1(t.pass))} pass`, tone: t.overall >= S.AUDIT_TARGET ? 'good' : t.overall >= S.AUDIT_TARGET - 3 ? 'c3' : 'bad' })), { min: 75, max: 100, target: S.AUDIT_TARGET });
  const hm = C2.heatmap(au.teamStats.map(t => ({ label: t.team, cells: S.AUDIT_PARAMS.map(p => ({ v: t.params[p.k], text: t.params[p.k] === null ? '—' : Math.round(t.params[p.k]), title: `${t.team} · ${p.n}: ${t.params[p.k] === null ? 'n/a' : S.r1(t.params[p.k])}% (target ${p.target}%)` })) })), S.AUDIT_PARAMS.map(p => p.n.split(/ [&/] | /)[0] === 'ID&V' ? 'ID&V' : p.n.split(' ')[0]), v => C2.scoreColour(v, 90, 12), { label: 'Audit score by team and parameter' });
  const paramBars = C2.rankBars([...au.paramAvg].filter(p => p.avg !== null).sort((a, b) => (a.avg - a.target) - (b.avg - b.target)).map(p => ({ label: p.n, value: S.r1(p.avg), sub: `target ${p.target}% · weight ${Math.round(p.w * 100)}%`, tone: p.avg >= p.target ? 'good' : p.avg >= p.target - 3 ? 'c3' : 'bad' })), { min: 75, max: 100, target: 90 });
  const trend = au.trend.length ? C2.multiLine(au.trend.map(t => t.label), [{ name: 'Weekly average score', values: au.trend.map(t => S.r1(t.value)), area: true }, { name: `Target ${S.AUDIT_TARGET}%`, values: au.trend.map(() => S.AUDIT_TARGET), dash: true, tone: 'c3' }], { label: 'Weekly audit score trend', unit: '%', height: 220, w: 560 }) : '<p class="muted">No dated rows.</p>';
  const worstParam = [...au.paramAvg].filter(p => p.avg !== null).sort((a, b) => (a.avg - a.target) - (b.avg - b.target))[0];
  const delta = up ? (au.overall - base.overall) : null;
  const kp = `<div class="stats">${stat('Overall score', pct(S.r1(au.overall)), delta === null ? `${au.rows.length} audits` : `<span class="delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} pts</span> vs demo baseline`, { visual: C2.gauge(au.overall, { label: 'Overall', target: S.AUDIT_TARGET, text: Math.round(au.overall) + '' }) })}${stat('Pass rate', pct(S.r1(au.passRate)), `audits ≥ ${S.AUDIT_TARGET}%`)}${stat('Fatal flags', String(au.fatal), au.fatal ? pill('bad', 'Review first') : pill('good', 'None'), { tone: au.fatal ? 'bad' : '' })}${stat('Lowest team', esc(au.teamStats[au.teamStats.length - 1].team), `${pct(S.r1(au.teamStats[au.teamStats.length - 1].overall))} · lags on ${esc(au.teamStats[au.teamStats.length - 1].weakest?.p.n || '—')}`, { tone: 'warn' })}${stat('Weakest parameter', esc(worstParam?.n || '—'), `${pct(S.r1(worstParam?.avg))} vs ${worstParam?.target}% target`, { tone: 'warn' })}</div>`;
  const agentTbl = n => table(['Agent', 'Team', 'Audits', 'Avg score'], n.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.team)}</td><td class="num">${a.n}</td><td class="num"><b>${S.r1(a.avg)}%</b></td></tr>`));
  const coach = au.actions.length ? `<ul class="recos">${au.actions.map(a => `<li class="reco warn"><span><b>${esc(a.team)}</b> · ${esc(a.param)} (${sgn(S.r1(a.gap))} pts vs target)<br><span class="muted">${esc(a.text)}</span></span>${btn('Create task', 'task-from', `data-title="Coach ${esc(a.team)} on ${esc(a.param)}"`)}</li>`).join('')}</ul>` : '<p class="muted">No team is below target on any parameter.</p>';
  return head('Audits', 'Quality scores by team and parameter, what is lagging and what to coach.') + chips('audits', TABS.audits, 'Dashboard') + uploadCard + kp
    + `<div class="dash-grid">${panel('Team scoreboard', teamBars, { note: `Overall quality score per team. The tick marks the ${S.AUDIT_TARGET}% target.` })}${panel('Where we lag — parameter averages', paramBars, { note: 'Sorted from furthest below target.' })}${panel('Team × parameter heatmap', hm + '<div class="heat-legend"><span>Below target</span><i></i><span>At target</span><i class="g"></i><span>Above</span></div>', { wide: true, note: 'Each cell is the average score. Red = below the parameter target, green = above. Read across a row to see what a team must improve.' })}${panel('Weekly trend', trend)}${panel('AI insights', insights(au.insights))}${panel('Coaching plan (AI-suggested)', coach, { wide: true })}${panel('Agents needing coaching', agentTbl(au.agentList.slice(0, 8)))}${panel('Top performers', agentTbl([...au.agentList].reverse().slice(0, 8)))}</div>`;
}

/* ================================================================ SHIFTS */
function chanChips() { return `<div class="chips">${S.CHANNELS.map(c => `<button type="button" data-v="channel" data-val="${c}" aria-selected="${ui.channel === c}">${c}<small>${getSim().poolAgents(c).length} agents</small></button>`).join('')}</div>`; }
function effectiveForecast(ch) { const sim = getSim(); if (!ui.forecast || !ui.forecast.fc[ch] || ui.forecast.channels.indexOf(ch) < 0) return sim.forecast[ch]; return ui.forecast.fc[ch].map((row, x) => row.map((v, h) => v === null ? sim.forecast[ch][x][h] : v)); }
function gapHeat(grid, label) { return C2.heatmap(grid.map((row, x) => ({ label: S.DAYS[x], cells: row.map((c, h) => ({ v: c.gap, text: c.gap < -0.5 || c.gap > 0.5 ? (c.gap > 0 ? '+' : '') + Math.round(c.gap) : '', title: `${S.DAYS[x]} ${hh(h)} · need ${S.r1(c.req)}, have ${S.r1(c.cov)}` })) })), Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')), v => C2.diverging(v, 6), { label, compact: true }); }
function shifts(ctx) {
  const sim = getSim(), ch = ui.channel, fc = effectiveForecast(ch), grid = S.currentCoverage(sim, ch, fc), st = S.gridStats(grid), wins = S.windows(grid), tdow = S.dow(sim.today);
  if (ui.day === null) ui.day = tdow;
  const reqH = S.sum(st.byDay.map(d => d.req)), covH = S.sum(st.byDay.map(d => d.cov));
  const uploaded = ui.forecast && ui.forecast.channels.includes(ch);
  const upCard = `<section class="card upload"><div class="upload-main"><div><h2>Upload forecast / volume</h2><p class="muted">Excel or CSV with <b>Day</b> (Mon… or a date), <b>Hour</b> (0–23) and <b>Calls / Chats / Tickets</b>. Coverage and the AI planner recalculate from it.</p></div><div class="upload-actions"><label class="filebtn primary">Choose file<input id="forecast-file" type="file" accept=".xlsx,.xls,.csv" hidden></label>${btn('Use sample upload', 'forecast-sample', '', 'accent')}${btn('Download sample file', 'forecast-template')}${ui.forecast ? btn('Reset to demo forecast', 'forecast-reset') : ''}</div></div><p class="muted small">${ui.forecast ? `Using <b>${esc(ui.forecast.name)}</b> (${ui.forecast.rows} rows; ${esc(ui.forecast.channels.join(', '))})${ui.forecast.sample ? ' — simulated sample with a Mon/Tue late-morning campaign peak' : ''}` : 'Using the simulated 4-week average forecast.'}</p></section>`;
  const head2 = head('Shifts', 'Are we staffed for the volume we get — by hour and by day — and what should the roster be?') + chips('shifts', TABS.shifts, ui.tab.shifts) + (ui.tab.shifts === 'Coverage' ? upCard : '') + chanChips();
  if (ui.tab.shifts === 'AI planner') return head2 + aiPlanner(sim, ch, fc, grid, st);
  // coverage
  const dayChips = `<div class="chips small">${S.DAYS.map((d, x) => `<button type="button" data-v="day" data-val="${x}" aria-selected="${ui.day === x}">${d}${x === tdow ? ' · today' : ''}</button>`).join('')}</div>`;
  const x = ui.day, hrs = Array.from({ length: 24 }, (_, h) => h);
  const dayChart = C2.multiLine(hrs.map(h => String(h).padStart(2, '0')), [{ name: 'Agents required', values: grid[x].map(c => S.r1(c.req)), dash: true, tone: 'c3' }, { name: 'Agents scheduled (after shrinkage)', values: grid[x].map(c => S.r1(c.cov)), area: true }], { label: `Required versus scheduled agents, ${S.DAYS[x]}`, unit: ' agents', height: 240 });
  const volChart = C2.stackedColumns(hrs.filter(h => h >= 5 && h <= 23).map(h => ({ label: String(h).padStart(2, '0'), parts: [{ name: ch, value: Math.round(fc[x][h]) }] })), [ch], { label: `Forecast ${ch} volume`, height: 120, unit: ' contacts' });
  const dayCmp = C2.compareBars(st.byDay.map((d, i) => ({ label: S.DAYS[i], a: Math.round(d.req), b: Math.round(d.cov) })), { aName: 'Required agent-hours', bName: 'Scheduled agent-hours' });
  const ins = [];
  const topW = wins.slice(0, 4);
  topW.forEach(w => ins.push({ tone: w.max >= 4 ? 'bad' : 'warn', text: `<b>${S.DAYS[w.x]} ${hh(w.from)}–${hh(w.to)}</b>: short by up to <b>${Math.ceil(w.max)}</b> agent(s) on ${esc(ch)}.` }));
  const worstDay = st.byDay.map((d, i) => ({ i, g: d.gap })).sort((a, b) => b.g - a.g)[0];
  if (worstDay.g > 0) ins.push({ tone: 'warn', text: `${S.DAYS[worstDay.i]} has the largest shortfall (${Math.round(worstDay.g)} agent-hours across ${st.byDay[worstDay.i].under} hours).` });
  const overDay = st.byDay.map((d, i) => ({ i, o: d.cov - d.req })).sort((a, b) => b.o - a.o)[0];
  if (st.over) ins.push({ tone: 'info', text: `${st.over} hour-slots are over-staffed by more than 3 agents (largest surplus on ${S.DAYS[overDay.i]}) — candidates for moving breaks, training or cross-skilling.` });
  if (uploaded) ins.push({ tone: 'info', text: 'Results above use your uploaded forecast.' });
  ins.push({ tone: 'good', text: `Open the <b>AI planner</b> tab to generate a roster that closes these gaps.` });
  const kp = `<div class="stats">${stat('Understaffed hours / week', String(st.under), `of ${24 * 7} hour-slots (${(st.under / 168 * 100).toFixed(0)}%)`, { tone: st.under > 24 ? 'bad' : st.under > 8 ? 'warn' : '' })}${stat('Shortfall', `${Math.round(st.gapHrs)}<span class="of"> agent-hrs</span>`, 'summed over understaffed hours', { tone: st.gapHrs > 40 ? 'warn' : '' })}${stat('Worst slot', st.worst ? `${S.DAYS[st.worst.x]} ${hh(st.worst.h)}` : '—', st.worst ? `need ${S.r1(st.worst.req)} · have ${S.r1(st.worst.cov)}` : 'fully covered', { tone: st.worst ? 'bad' : '' })}${stat('Coverage ratio', pct(S.r1(covH / reqH * 100)), 'scheduled ÷ required hours', { visual: C2.gauge(Math.min(100, covH / reqH * 100), { label: 'Coverage', text: Math.round(covH / reqH * 100) + '%', tone: covH >= reqH ? 'good' : 'c3' }) })}${stat('Over-staffed slots', String(st.over), 'surplus > 3 agents')}</div>`;
  return head2 + kp + `<div class="dash-grid">${panel('Gap heatmap — day × hour', gapHeat(grid, 'Staffing gap by day and hour') + '<div class="heat-legend"><span>Understaffed</span><i class="r"></i><span>Balanced</span><i class="n"></i><span>Surplus</span><i class="b"></i></div>', { wide: true, note: `Cell = scheduled − required agents for <b>${esc(ch)}</b>. Red hours are where volume outruns the roster.` })}${panel('Insights', insights(ins))}${panel('Daily required vs scheduled', dayCmp)}${panel(`Hour by hour — ${S.DAYS[x]}`, dayChips + dayChart + '<h3 class="mini">Forecast volume</h3>' + volChart, { wide: true })}</div>`;
}
function aiPlanner(sim, ch, fc, grid, st) {
  let plan = ui.plans[ch];
  const gen = () => { const codes = ui.aiNight ? Object.keys(S.SHIFTS) : Object.keys(S.SHIFTS).filter(c => c !== 'N'); return S.planShifts(sim, ch, { forecast: fc, codes, shrink: ui.aiShrink / 100 }); };
  if (!plan) plan = ui.plans[ch] = gen();
  const ps = S.gridStats(plan.grid);
  const mix = code => ({ cur: sim.poolAgents(ch).filter(a => a.shift === code).length, ai: plan.plan.filter(p => p.shift === code).length });
  const mixRows = Object.keys(S.SHIFTS).map(c => ({ code: c, ...mix(c) }));
  const mixChart = C2.compareBars(mixRows.map(m => ({ label: `${S.SHIFTS[m.code].name} ${S.label(m.code)}`, a: m.ai, b: m.cur })), { aName: 'AI plan', bName: 'Current roster' });
  const published = ui.published[ch];
  const rowsHtml = plan.plan.slice(0, 60).map(p => { const cells = S.DAYS.map((_, x) => x === p.offStart || x === (p.offStart + 1) % 7 ? '<td class="off">OFF</td>' : `<td class="sh sh-${p.shift}">${p.shift}</td>`).join(''); return `<tr><td>${esc(p.name)}</td><td class="muted">${esc(p.team)}</td>${cells}</tr>`; });
  const improved = st.gapHrs - ps.gapHrs;
  const ins = [{ tone: 'good', text: `AI plan cuts understaffed hours from <b>${st.under}</b> to <b>${ps.under}</b> and the shortfall from <b>${Math.round(st.gapHrs)}</b> to <b>${Math.round(ps.gapHrs)}</b> agent-hours (${improved > 0 ? Math.round(improved / Math.max(st.gapHrs, 1) * 100) : 0}% better).` }];
  const dMix = mixRows.map(m => ({ code: m.code, d: m.ai - m.cur })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  if (dMix && dMix.d) ins.push({ tone: 'info', text: `Biggest change: ${dMix.d > 0 ? 'move' : 'take'} ${Math.abs(dMix.d)} agent(s) ${dMix.d > 0 ? 'into' : 'out of'} the ${S.SHIFTS[dMix.code].name} shift (${S.label(dMix.code)}).` });
  if (ps.worst) ins.push({ tone: 'warn', text: `Remaining gap: ${S.DAYS[ps.worst.x]} ${hh(ps.worst.h)} (${S.r1(-ps.worst.gap)} agents). The pool is too small to fully cover it — plan overtime, cross-skill another team or move breaks.` });
  else ins.push({ tone: 'good', text: 'Every hour of the week is covered.' });
  ins.push({ tone: 'info', text: `Rules applied: ${ui.aiShrink}% shrinkage, 82% occupancy, 9-hour shifts, 2 consecutive days off, one shift code per agent per week (so rest between shifts is ≥ 15 h; policy minimum is ${10} h).` });
  const kp = `<div class="stats">${stat('Understaffed hours', `${ps.under}<span class="of"> from ${st.under}</span>`, pill(ps.under < st.under ? 'good' : 'warn', ps.under < st.under ? 'Improved' : 'No change'), { tone: ps.under < st.under ? '' : 'warn' })}${stat('Shortfall', `${Math.round(ps.gapHrs)}<span class="of"> agent-hrs</span>`, `was ${Math.round(st.gapHrs)}`)}${stat('Agents planned', String(plan.plan.length), `${esc(ch)} pool`)}${stat('Status', published ? 'Published' : 'Draft', published ? `Approved ${esc(published.slice(0, 16).replace('T', ' '))}` : 'Review and approve below', { tone: published ? '' : 'warn' })}</div>`;
  const controls = `<section class="card"><div class="planner-controls"><label>Shrinkage % <input id="ai-shrink" type="number" min="0" max="45" value="${ui.aiShrink}" style="width:90px"></label><label class="inline"><input id="ai-night" type="checkbox" ${ui.aiNight ? 'checked' : ''}> Include night shift</label>${btn('Generate AI shift plan', 'plan-gen', '', 'primary')}${btn('Download plan (CSV)', 'plan-csv')}${btn(published ? 'Re-publish to roster' : 'Approve & publish', 'plan-publish', '', 'accent')}</div><p class="muted small">AI-assisted heuristic planner (simulated model): assigns every agent a shift and two days off to minimise the weekly deficit against the forecast${ui.forecast ? ' you uploaded' : ''}.</p></section>`;
  return kp + controls + `<div class="dash-grid">${panel('Before: current roster', gapHeat(S.currentCoverage(sim, ch, fc), 'Current roster gap'), { wide: true, note: 'Red = understaffed. Same scale as the plan below.' })}${panel('After: AI plan', gapHeat(plan.grid, 'AI plan gap'), { wide: true, note: 'Gap after the AI shift plan.' })}${panel('AI insights', insights(ins))}${panel('Shift mix: AI plan vs current', mixChart)}${panel('Proposed roster', `<div class="table-wrap roster"><table><thead><tr><th>Agent</th><th>Team</th>${S.DAYS.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${rowsHtml.join('')}</tbody></table></div><p class="muted small">Showing ${Math.min(60, plan.plan.length)} of ${plan.plan.length} agents. ${Object.keys(S.SHIFTS).map(c => `<span class="sh sh-${c} chip-sh">${c}</span> ${S.SHIFTS[c].name} ${S.label(c)}`).join(' · ')}</p>`, { wide: true })}</div>`;
}

/* ================================================================ TASKS */
function tasksModel(ctx) {
  const sim = getSim(), ov = S.store.get('taskStatus', {});
  const simTasks = sim.tasks.map(t => ({ ...t, status: ov[t.id] || t.status, progress: (ov[t.id] || t.status) === 'Done' ? 100 : t.progress }));
  const real = (ctx.state.tasks || []).filter(t => !t.archived).map(t => { const emp = ctx.state.employees.find(e => e.id === t.ownerId); return { id: t.id, title: t.title, team: emp?.team || 'Workspace', priority: t.priority === 'Normal' ? 'Normal' : t.priority, status: t.status, due: t.dueDate || sim.today, owner: t.ownerId || 'REAL', ownerName: emp?.name || 'Unassigned', tags: ['Workspace'], progress: t.status === 'Done' ? 100 : 0, created: (t.createdAt || sim.today).slice(0, 10), real: true }; });
  return [...real, ...simTasks];
}
function tasks(ctx) {
  const sim = getSim(), td = sim.today, all = tasksModel(ctx), f = ui;
  let list = all.filter(t => (f.who === 'me' ? t.owner === 'ME' : true) && (!f.pri || t.priority === f.pri) && (!f.team || t.team === f.team) && (!f.q || (t.title + ' ' + t.ownerName + ' ' + t.tags.join(' ')).toLowerCase().includes(f.q.toLowerCase())));
  const mine = all.filter(t => t.owner === 'ME'), open = all.filter(t => t.status !== 'Done'), pend = all.filter(t => t.status === 'Open' || t.status === 'Blocked'), od = open.filter(t => t.due < td), done = all.filter(t => t.status === 'Done');
  const filters = `<div class="filters"><div class="chips small"><button type="button" data-v="who" data-val="all" aria-selected="${f.who === 'all'}">All tasks</button><button type="button" data-v="who" data-val="me" aria-selected="${f.who === 'me'}">Assigned to me</button></div><select id="task-pri" aria-label="Priority"><option value="">Any priority</option>${['Urgent', 'High', 'Normal', 'Low'].map(p => `<option ${f.pri === p ? 'selected' : ''}>${p}</option>`).join('')}</select><select id="task-team" aria-label="Team"><option value="">All teams</option>${[...new Set(all.map(t => t.team))].sort().map(t => `<option ${f.team === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><input id="task-q" placeholder="Search tasks, people, tags…" value="${esc(f.q)}" aria-label="Search tasks"></div>`;
  const kp = `<div class="stats five">${stat('Assigned to me', String(mine.filter(t => t.status !== 'Done').length), `${mine.length} total · ${mine.filter(t => t.status === 'Done').length} done`, { tone: '' })}${stat('In progress', String(all.filter(t => t.status === 'In progress').length), 'being worked on now')}${stat('Pending', String(pend.length), `${all.filter(t => t.status === 'Blocked').length} blocked · ${all.filter(t => t.status === 'Open').length} not started`, { tone: 'warn' })}${stat('Overdue', String(od.length), od.length ? pill('bad', 'Needs attention') : pill('good', 'On time'), { tone: od.length ? 'bad' : '' })}${stat('Completion rate', pct(S.r1(done.length / all.length * 100)), `${done.length} of ${all.length} tasks`, { visual: C2.gauge(done.length / all.length * 100, { label: 'Completion', text: Math.round(done.length / all.length * 100) + '%', tone: 'good' }) })}</div>`;
  const card = t => `<article class="tcard ${t.due < td && t.status !== 'Done' ? 'late' : ''}"><div class="tcard-top"><span class="prio-tag ${t.priority.toLowerCase()}">${esc(t.priority)}</span>${t.sim ? '<span class="tag sim">sim</span>' : ''}<span class="due ${t.due < td && t.status !== 'Done' ? 'late' : ''}">${t.status === 'Done' ? 'Done' : dueText(t.due, td)}</span></div><h3>${esc(t.title)}</h3><div class="tags">${(t.tags || []).map(x => `<span class="tag">${esc(x)}</span>`).join('')}<span class="tag team">${esc(t.team)}</span></div>${t.progress ? `<div class="track"><i style="width:${t.progress}%;background:var(--c2)"></i></div>` : ''}<div class="tcard-foot">${avatar(t.ownerName)}<span class="muted small" title="${esc(t.ownerName)}">${esc(t.ownerName.replace(/^You .*/, 'You'))}</span>${t.real ? `<button type="button" data-task-edit="${esc(t.id)}" class="mini-btn">Edit</button>` : `<select class="mini-sel" data-v="task-status" data-id="${esc(t.id)}" aria-label="Status for ${esc(t.title)}">${['Open', 'In progress', 'Blocked', 'Done'].map(s => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`}</div></article>`;
  const stCols = ['Open', 'In progress', 'Blocked', 'Done'];
  const tab = ui.tab.tasks;
  let body;
  if (tab === 'Board') body = `<div class="board">${stCols.map(s => { const items = list.filter(t => t.status === s); return `<div class="col col-${s.replace(' ', '')}"><div class="col-head"><h2>${s}</h2><span class="count">${items.length}</span></div>${items.map(card).join('') || '<p class="muted small">Nothing here.</p>'}</div>`; }).join('')}</div>`;
  else if (tab === 'List') body = panel('All tasks', table(['Task', 'Owner', 'Team', 'Priority', 'Status', 'Due'], [...list].sort((a, b) => a.due.localeCompare(b.due)).map(t => `<tr class="${t.due < td && t.status !== 'Done' ? 'late-row' : ''}"><td><b>${esc(t.title)}</b><br><small class="muted">${t.tags.map(esc).join(' · ')}</small></td><td>${esc(t.ownerName)}</td><td>${esc(t.team)}</td><td><span class="prio-tag ${t.priority.toLowerCase()}">${esc(t.priority)}</span></td><td>${esc(t.status)}</td><td>${t.status === 'Done' ? '—' : dueText(t.due, td)}</td></tr>`)), { wide: true });
  else { const owners = [...new Map(all.map(t => [t.owner, t.ownerName])).entries()]; body = `<div class="dash-grid">${panel('Workload by owner', C2.stackedColumns(owners.map(([id, n]) => ({ label: initials(n), parts: ['Open', 'In progress', 'Blocked'].map(s => ({ name: s, value: all.filter(t => t.owner === id && t.status === s).length })) })), ['Open', 'In progress', 'Blocked'], { label: 'Open tasks by owner', height: 170 }), { wide: true, note: 'Open, in-progress and blocked tasks per person.' })}${panel('Overdue by owner', C.hBars(owners.map(([id, n]) => ({ label: n, value: od.filter(t => t.owner === id).length })).filter(x => x.value).sort((a, b) => b.value - a.value), { emptyText: 'No overdue tasks.' }))}</div>`; }
  const charts = `<div class="dash-grid">${panel('Status mix', C.donut(stCols.map(s => ({ label: s, value: all.filter(t => t.status === s).length })), { label: 'Task status', centre: String(all.length) }))}${panel('By priority', C.hBars(['Urgent', 'High', 'Normal', 'Low'].map(p => ({ label: p, value: open.filter(t => t.priority === p).length })), {}), { note: 'Open tasks only.' })}${panel('Due soon', `<ul class="tasklist">${[...open].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6).map(t => `<li><span class="prio ${t.priority.toLowerCase()}"></span><span class="grow">${esc(t.title)}<small class="muted">${esc(t.ownerName)}</small></span><span class="due ${t.due < td ? 'late' : ''}">${dueText(t.due, td)}</span></li>`).join('')}</ul>`)}</div>`;
  return head('Tasks', 'Who owns what, what is pending and what is overdue.', `${btn('New task', 'new-task-real', '', 'primary')}`) + chips('tasks', TABS.tasks, tab) + kp + filters + body + (tab === 'Board' ? charts : '');
}

/* ================================================================ PERFORMANCE */
function perfTeams() { const sim = getSim(); return ui.scope === 'infra' ? sim.teamPerf.filter(t => S.INFRA_SD.includes(t.id)) : sim.teamPerf; }
const attTone = (m, v) => { const a = S.attain(m, v); return a >= 1 ? 'good' : a >= 0.95 ? 'warn' : 'bad'; };
const mcell = (m, v) => `<td class="num m-${attTone(m, v)}">${m.k === 'handled' ? fmt(v) : fmt(v)}</td>`;
const KEY = ['quality', 'csat', 'fcr', 'sdr', 'sla', 'aht', 'asa', 'reopen', 'esc', 'vault'];
function scopeChips() { return `<div class="chips small"><button type="button" data-v="scope" data-val="infra" aria-selected="${ui.scope === 'infra'}">Infra SD only</button><button type="button" data-v="scope" data-val="all" aria-selected="${ui.scope === 'all'}">All teams</button></div>`; }
function performance(ctx) {
  const sim = getSim(), tab = ui.tab.performance, teams = perfTeams(), PM = Object.fromEntries(S.PERF.map(m => [m.k, m]));
  let body = '';
  const ranked = [...teams].sort((a, b) => b.score - a.score);
  if (tab === 'Teams') {
    const best = ranked[0], worst = ranked[ranked.length - 1];
    const gaps = t => S.PERF.filter(m => m.w >= 0.04).map(m => ({ m, a: S.attain(m, t.perAgent[m.k]) })).sort((a, b) => a.a - b.a);
    const ins = [{ tone: 'good', text: `<b>${esc(best.id)}</b> performs best (score ${S.r1(best.score)}), strongest on ${esc(gaps(best).slice(-1)[0].m.n)}.` }, { tone: 'bad', text: `<b>${esc(worst.id)}</b> is lowest (${S.r1(worst.score)}); biggest gaps: ${gaps(worst).slice(0, 3).map(g => `${esc(g.m.n)} (${Math.round(g.a * 100)}% of target)`).join(', ')}.` }];
    ranked.slice(1, -1).forEach(t => { const g = gaps(t)[0]; if (g.a < 0.97) ins.push({ tone: 'warn', text: `${esc(t.id)} is behind on <b>${esc(g.m.n)}</b> (${fmt(t.perAgent[g.m.k])}${g.m.unit === '%' ? '%' : ' ' + g.m.unit} vs target ${g.m.target}).` }); });
    body = `<div class="dash-grid">${panel('Team ranking — composite score', C2.rankBars(ranked.map(t => ({ label: t.id, value: S.r1(t.score), sub: `${t.size} agents · ${t.channel}`, tone: t === best ? 'good' : t === worst ? 'bad' : 'c1' })), { min: 85, max: 100, unit: '' }), { note: 'Weighted attainment of 13 service-desk metrics against target (weights in the Parameters tab).' })}${panel('AI insights — who is better, who is lagging', insights(ins))}${panel('Team scorecard', table(['Rank', 'Team', 'Agents', 'Score', ...KEY.map(k => PM[k].n.replace('Response & resolution ', '').replace('First-contact resolution', 'FCR').replace('Same-day resolution', 'SDR').replace('Avg handle time', 'AHT').replace('Avg speed of answer', 'ASA').replace('Data Vault compliance', 'Vault').replace('Quality score', 'Quality').replace('Re-open rate', 'Re-open').replace('Escalation rate', 'Esc.')), 'Abandon %'], ranked.map((t, i) => `<tr><td><span class="medal m${i + 1}">${i + 1}</span></td><td><b>${esc(t.id)}</b></td><td class="num">${t.size}</td><td class="num"><b>${S.r1(t.score)}</b></td>${KEY.map(k => mcell(PM[k], t.perAgent[k])).join('')}<td class="num m-${t.abandon <= 5 ? 'good' : t.abandon <= 6 ? 'warn' : 'bad'}">${t.abandon}</td></tr>`)) + '<p class="muted small">Cells are coloured against target: green meets it, amber within 5%, red worse. Lower is better for AHT, ASA, Re-open, Escalation and Abandon.</p>', { wide: true })}</div>`;
  } else if (tab === 'Agents') {
    const m = ui.rankBy === 'score' ? null : PM[ui.rankBy];
    let list = sim.perfAgents.filter(a => !a.isLead && (ui.scope === 'all' || S.INFRA_SD.includes(a.tower)) && (!ui.agentTeam || a.tower === ui.agentTeam));
    const val = a => m ? a.vals[m.k] : a.score;
    list = list.sort((a, b) => m && m.dir < 0 ? val(a) - val(b) : val(b) - val(a));
    const top = list.slice(0, 10), bottom = list.slice(-8).reverse();
    const row = (a, i) => `<tr><td><span class="medal m${i + 1 <= 3 ? i + 1 : 0}">${i + 1}</span></td><td><b>${esc(a.name)}</b><br><small class="muted">${esc(a.id)}</small></td><td>${esc(a.team)}</td><td class="num"><b>${S.r1(a.score)}</b></td>${['quality', 'csat', 'fcr', 'sdr', 'sla', 'aht', 'reopen'].map(k => mcell(PM[k], a.vals[k])).join('')}</tr>`;
    const hdr = ['#', 'Agent', 'Team', 'Score', 'Quality', 'CSAT', 'FCR', 'SDR', 'SLA', 'AHT', 'Re-open'];
    body = `<div class="filters"><label class="inline">Rank by <select id="rank-by"><option value="score" ${ui.rankBy === 'score' ? 'selected' : ''}>Composite score</option>${S.PERF.map(p => `<option value="${p.k}" ${ui.rankBy === p.k ? 'selected' : ''}>${esc(p.n)}${p.dir < 0 ? ' (lower is better)' : ''}</option>`).join('')}</select></label><label class="inline">Team <select id="agent-team"><option value="">All teams in scope</option>${S.TOWERS.filter(t => ui.scope === 'all' || S.INFRA_SD.includes(t.id)).map(t => `<option ${ui.agentTeam === t.id ? 'selected' : ''}>${esc(t.id)}</option>`).join('')}</select></label><span class="muted small">${list.length} agents</span></div><div class="dash-grid">${panel('Top 10 agents', C2.rankBars(top.map(a => ({ label: a.name, value: S.r1(val(a)), sub: a.team, tone: 'good' })), { min: m ? Math.min(...top.map(val)) * 0.9 : 85, max: m ? Math.max(...top.map(val)) * 1.02 : 100, unit: m ? (m.unit === '%' ? '%' : ' ' + m.unit) : '' }), { note: m ? `Ranked by ${esc(m.n)}` : 'Ranked by composite score' })}${panel('Bottom 8 — coaching focus', C2.rankBars(bottom.map(a => ({ label: a.name, value: S.r1(val(a)), sub: a.team, tone: 'bad' })), { min: m ? Math.min(...bottom.map(val)) * 0.9 : 85, max: m ? Math.max(...bottom.map(val)) * 1.05 : 100, unit: m ? (m.unit === '%' ? '%' : ' ' + m.unit) : '' }))}${panel('Agent ranking', table(hdr, list.slice(0, 40).map(row)) + `<p class="muted small">Showing the first 40 of ${list.length}.</p>`, { wide: true })}</div>`;
  } else if (tab === 'Leads') {
    const lp = sim.leadPerf.filter(l => ui.scope === 'all' || S.INFRA_SD.includes(l.tower)).sort((a, b) => b.score - a.score);
    body = `<div class="dash-grid">${panel('Lead ranking', C2.rankBars(lp.slice(0, 12).map(l => ({ label: l.name, value: S.r1(l.score), sub: `${l.role} · ${l.team}`, tone: 'c1' })), { min: 85, max: 100, unit: '' }), { note: 'Lead score = 70% team composite + 15% audit coverage + 15% Data Vault compliance of their team.' })}${panel('Lead scorecard', table(['#', 'Lead', 'Role', 'Team', 'Agents', 'Team score', 'Audit coverage', 'Vault', 'Needs focus'], lp.map((l, i) => `<tr><td><span class="medal m${i + 1 <= 3 ? i + 1 : 0}">${i + 1}</span></td><td><b>${esc(l.name)}</b></td><td>${esc(l.role)}</td><td>${esc(l.team)}</td><td class="num">${l.size}</td><td class="num"><b>${S.r1(l.teamScore)}</b></td><td class="num m-${l.coverage >= 90 ? 'good' : l.coverage >= 85 ? 'warn' : 'bad'}">${l.coverage}%</td><td class="num m-${l.vault >= 95 ? 'good' : l.vault >= 90 ? 'warn' : 'bad'}">${l.vault}%</td><td>${esc(l.weakest)}</td>`.concat('</tr>'))), { wide: true })}</div>`;
  } else if (tab === 'Parameters') {
    const hm = C2.heatmap(S.PERF.map(m => ({ label: m.n, cells: ranked.map(t => ({ v: S.attain(m, t.perAgent[m.k]), text: fmt(t.perAgent[m.k]), title: `${t.id} · ${m.n}: ${fmt(t.perAgent[m.k])}${m.unit} (target ${m.dir < 0 ? '≤' : '≥'} ${m.target})` })) })), ranked.map(t => t.id.replace('Infra ', '')), v => C2.scoreColour(v * 100, 100, 10), { label: 'Metric attainment by team' });
    body = `<div class="dash-grid">${panel('Metric × team heatmap', hm + '<div class="heat-legend"><span>Below target</span><i></i><span>At target</span><i class="g"></i><span>Better</span></div>', { wide: true, note: 'Each cell is the team average; colour is attainment against target.' })}${panel('Service-desk parameters, targets and weights', table(['Parameter', 'Category', 'Target', 'Weight'], S.PERF.map(m => `<tr><td>${esc(m.n)}</td><td>${esc(m.cat)}</td><td class="num">${m.dir < 0 ? '≤' : '≥'} ${m.target}${m.unit === '%' ? '%' : ' ' + m.unit}</td><td class="num">${Math.round(m.w * 100)}%</td></tr>`)), { wide: true, note: 'Industry-standard KPIs (SLA, ASA, AHT, abandon, FCR, CSAT, reopen, escalation, adherence, quality, same-day resolution) plus Data Vault compliance.' })}</div>`;
  } else return null;
  return head('Performance', 'Service desk parameters team-wise, agent-wise and lead-wise — who is performing and who is lagging.', scopeChips()) + chips('performance', TABS.performance, tab) + body;
}

/* ================================================================ DATA VAULT */
function vaultEntries() { return [...S.store.get('vault', []), ...getSim().vault]; }
function datavault(ctx) {
  const sim = getSim(), tab = ui.tab.datavault, entries = vaultEntries();
  if (tab === 'Enter data') {
    const issue = S.ISSUES.find(i => i.name === ui.vaultIssue) || S.ISSUES[0];
    const me = sim.agents[0];
    return head('Data Vault', 'Log the issue category, sub-category, Nexthink script and cause code for every contact. Takes 20 seconds.') + chips('datavault', TABS.datavault, tab)
      + `<div class="split top"><form id="vault-form" class="card vault-form" autocomplete="off"><h2>New entry</h2><div class="form-grid"><div><label for="v-agent">Agent</label><select id="v-agent" required>${sim.agents.slice().sort((a, b) => a.name.localeCompare(b.name)).map(a => `<option value="${esc(a.id)}" data-team="${esc(a.team)}">${esc(a.name)}</option>`).join('')}</select></div><div><label for="v-eid">Employee ID</label><input id="v-eid" required value="${esc(sim.agents.slice().sort((a, b) => a.name.localeCompare(b.name))[0].id)}"></div><div><label for="v-team">Team</label><select id="v-team">${[...new Set(sim.agents.map(a => a.team))].sort().map(t => `<option ${t === sim.agents.slice().sort((a, b) => a.name.localeCompare(b.name))[0].team ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div><div><label for="v-ticket">Ticket / interaction ID</label><input id="v-ticket" required placeholder="INC1234567" pattern="[A-Za-z0-9\\-]{4,20}"></div><div><label for="v-channel">Channel</label><select id="v-channel"><option>Call</option><option>Chat</option><option>Ticket</option></select></div><div><label for="v-issue">Issue type</label><select id="v-issue" required>${S.ISSUES.map(i => `<option>${esc(i.name)}</option>`).join('')}</select></div><div><label for="v-sub">Issue sub-category</label><select id="v-sub" required>${issue.subs.map(s => `<option>${esc(s)}</option>`).join('')}</select></div><div><label for="v-cause">Cause code</label><select id="v-cause" required>${S.CAUSES.map(([c, n]) => `<option value="${c}">${c} — ${esc(n)}</option>`).join('')}</select></div></div><fieldset class="radios"><legend>Nexthink script executed?</legend><label class="inline"><input type="radio" name="v-nx" value="Yes" checked> Yes</label><label class="inline"><input type="radio" name="v-nx" value="No"> No</label><label class="inline"><input type="radio" name="v-nx" value="Not applicable"> Not applicable</label></fieldset><div id="v-script-wrap"><label for="v-script">Nexthink script</label><select id="v-script">${S.SCRIPTS.map(s => `<option>${esc(s)}</option>`).join('')}</select></div><div class="form-grid"><div><label for="v-res">Resolution</label><select id="v-res"><option>Resolved on contact</option><option>Escalated to L2</option><option>Callback scheduled</option></select></div><div><label for="v-notes">Notes (optional)</label><input id="v-notes" maxlength="200"></div></div><p id="vault-msg" class="muted" role="status"></p><div class="actions"><button class="primary" type="submit">Save to Data Vault</button><button type="reset" data-v="vault-reset">Clear</button></div></form>
      <aside class="card vault-side"><h2>Why this matters</h2><ul class="ticks"><li>Cause codes feed root-cause trends and the surge detector.</li><li>Nexthink usage shows where scripts can fix issues faster.</li><li>Compliance counts toward each agent's Performance score (6%).</li></ul><h3 class="mini">Your last entries</h3>${table(['Ticket', 'Issue', 'Cause'], S.store.get('vault', []).slice(0, 5).map(e => `<tr><td>${esc(e.ticket)}</td><td>${esc(e.issue)}</td><td>${esc(e.cause)}</td></tr>`), 'No entries saved yet.')}</aside></div>`;
  }
  const f = entries.filter(e => (!ui.vaultTeam || e.team.startsWith(ui.vaultTeam)) && (!ui.vaultIssue || e.issue === ui.vaultIssue));
  const count = (k, fn) => { const m = new Map(); f.forEach(e => m.set(fn(e), (m.get(fn(e)) || 0) + 1)); return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); };
  const nxApplicable = f.filter(e => e.nexthink !== 'Not applicable'), nxYes = nxApplicable.filter(e => e.nexthink === 'Yes').length;
  const causeBars = count('c', e => e.cause).slice(0, 8).map(c => ({ ...c, label: `${c.label} · ${S.CAUSES.find(x => x[0] === c.label)?.[1] || ''}` }));
  const issues = count('i', e => e.issue), top = issues[0];
  const noNx = count('n', e => e.nexthink === 'No' ? e.issue : null).filter(x => x.label).slice(0, 1)[0];
  const ins = [];
  if (top) ins.push({ tone: 'info', text: `<b>${esc(top.label)}</b> is the most logged issue (${top.value} entries, ${(top.value / f.length * 100).toFixed(0)}%).` });
  if (nxApplicable.length) ins.push({ tone: nxYes / nxApplicable.length >= 0.7 ? 'good' : 'warn', text: `Nexthink scripts were executed on <b>${(nxYes / nxApplicable.length * 100).toFixed(0)}%</b> of applicable contacts${noNx ? `; most often skipped for <b>${esc(noNx.label)}</b>` : ''}.` });
  const cc = causeBars[0]; if (cc) ins.push({ tone: 'info', text: `Leading cause code: <b>${esc(cc.label)}</b> (${cc.value}). Fixing it at source would remove the most repeat contacts.` });
  const per = count('p', e => e.team.split(' - ')[0]); if (per.length) ins.push({ tone: 'info', text: `${esc(per[0].label)} logs the most entries; ${esc(per[per.length - 1].label)} the fewest — check Data Vault compliance there.` });
  const byDay = new Map(); f.forEach(e => byDay.set(e.ts.slice(0, 10), (byDay.get(e.ts.slice(0, 10)) || 0) + 1));
  const dayPts = [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([d, n]) => ({ label: d.slice(5), value: n }));
  const filters = `<div class="filters"><label class="inline">Team <select id="vault-team"><option value="">All</option>${S.TOWERS.map(t => `<option ${ui.vaultTeam === t.id ? 'selected' : ''}>${esc(t.id)}</option>`).join('')}</select></label><label class="inline">Issue <select id="vault-issue-f"><option value="">All</option>${S.ISSUES.map(i => `<option ${ui.vaultIssue === i.name ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select></label>${btn('Export CSV', 'vault-export')}</div>`;
  return head('Data Vault', 'Issue categories, Nexthink usage and cause codes captured by agents.') + chips('datavault', TABS.datavault, tab) + filters
    + `<div class="stats">${stat('Entries', fmt(f.length), `${S.store.get('vault', []).length} added by you`)}${stat('Nexthink executed', pct(S.r1(nxApplicable.length ? nxYes / nxApplicable.length * 100 : 0)), `${nxYes} of ${nxApplicable.length} applicable`, { visual: C2.gauge(nxApplicable.length ? nxYes / nxApplicable.length * 100 : 0, { label: 'Nexthink executed', text: Math.round(nxApplicable.length ? nxYes / nxApplicable.length * 100 : 0) + '%', tone: 'c2' }) })}${stat('Top issue', esc(top?.label || '—'), `${top?.value || 0} entries`)}${stat('Top cause code', esc(cc ? cc.label.split(' · ')[0] : '—'), esc(cc ? cc.label.split(' · ')[1] : ''))}</div>`
    + `<div class="dash-grid">${panel('Issues by type', C.hBars(issues.slice(0, 10).map(i => ({ label: i.label, value: i.value })), {}))}${panel('Cause codes', C.hBars(causeBars, {}), { note: 'Top 8 by entries.' })}${panel('Nexthink script executed', C.donut(['Yes', 'No', 'Not applicable'].map(l => ({ label: l, value: f.filter(e => e.nexthink === l).length })), { label: 'Nexthink script executed', centre: `${Math.round(nxApplicable.length ? nxYes / nxApplicable.length * 100 : 0)}%` }))}${panel('AI insights', insights(ins))}${panel('Entries per day', C2.multiLine(dayPts.map(p => p.label), [{ name: 'Entries', values: dayPts.map(p => p.value), area: true }], { label: 'Entries per day', height: 200 }), { wide: true })}${panel('Recent entries', table(['Time', 'Agent', 'Team', 'Ticket', 'Issue › sub-category', 'Nexthink', 'Cause'], f.slice(0, 25).map(e => `<tr><td class="nowrap">${esc(e.ts.replace('T', ' '))}</td><td>${esc(e.agent)}</td><td>${esc(e.team)}</td><td>${esc(e.ticket)}</td><td>${esc(e.issue)} › ${esc(e.sub)}</td><td>${esc(e.nexthink)}${e.script ? `<br><small class="muted">${esc(e.script)}</small>` : ''}</td><td>${esc(e.cause)}</td></tr>`)), { wide: true })}</div>`;
}

/* ================================================================ CHAT */
function checks() {
  const sim = getSim(), nh = sim.nowHour, vol = sim.todayVol;
  const infra = sim.teamPerf.filter(t => S.INFRA_SD.includes(t.id));
  const csat = S.r1(S.avg(infra.map(t => t.vals.csat))), cssResp = S.r1(S.avg(sim.perfAgents.filter(a => S.INFRA_SD.includes(a.tower)).map(a => a.css)));
  const lowCss = [...infra].sort((a, b) => a.vals.csat - b.vals.csat)[0];
  const csTone = csat >= 94 && cssResp >= 30 ? 'good' : csat >= 92 ? 'warn' : 'bad';
  const ch = S.CHANNELS.map(c => ({ c, d: (vol[c].now / vol[c].usual - 1) * 100 }));
  const worst = ch.sort((a, b) => b.d - a.d)[0];
  const vTone = worst.d > 25 ? 'bad' : worst.d > 12 ? 'warn' : 'good';
  const sg = sim.issues[0], iTone = sg.status === 'surge' ? 'bad' : sg.status === 'watch' ? 'warn' : 'good';
  return [
    { k: 'css', title: 'CSS check', tone: csTone, value: `${csat}% CSAT`, detail: `Survey response ${cssResp}% (target 30%). Lowest: ${lowCss.id} at ${lowCss.vals.csat}%.`, cmd: 'check css' },
    { k: 'volume', title: 'Volume check', tone: vTone, value: `${worst.c} ${worst.d >= 0 ? '+' : ''}${worst.d.toFixed(0)}%`, detail: `vs usual by ${hh(nh)}: ` + ch.map(x => `${x.c} ${x.d >= 0 ? '+' : ''}${x.d.toFixed(0)}%`).join(' · '), cmd: 'check volume' },
    { k: 'issue', title: 'Issue category check', tone: iTone, value: sg.name, detail: `${sg.actual} vs ${sg.expected} expected (${sg.ratio.toFixed(1)}×)`, cmd: 'check issue category' },
  ];
}
function checksHtml() { return `<div class="checks">${checks().map(c => `<button type="button" class="check ${c.tone}" data-v="chat-cmd" data-cmd="${esc(c.cmd)}"><span class="check-t">${esc(c.title)}</span><b>${esc(c.value)}</b><small>${esc(c.detail)}</small><span class="check-s">${pill(c.tone, c.tone === 'good' ? 'Healthy' : c.tone === 'warn' ? 'Watch' : 'Alert')}</span></button>`).join('')}</div>`; }

/* Renders an AI answer as a polished card: lead sentence, KPI tiles, sections, lists, tables, action callout and charts.
   Supported: ```kpi [...]```, ```chart {...}```, ## headings, - / 1. lists, | tables |, "> Action: ..." callouts, **bold**, `code`. */
function renderAnswer(text) {
  const inline = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const num = x => Number.isFinite(+x) ? +x : 0, tone = t => ['good', 'warn', 'bad'].includes(t) ? t : '';
  let first = true;
  const prose = s => {
    const out = [], lines = s.split('\n'); let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }
      if (/^\|.*\|$/.test(line)) {
        const rows = []; while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) rows.push(lines[i++].trim().slice(1, -1).split('|').map(c => c.trim()));
        const body = rows.filter(r => !r.every(c => /^:?-{2,}:?$/.test(c))), head = body.shift() || [];
        out.push(`<div class="table-wrap ans-table"><table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(0, 12).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
      }
      const li = /^([-*•]|\d+[.)])\s+/;
      if (li.test(line)) {
        const ordered = /^\d/.test(line), items = []; while (i < lines.length && li.test(lines[i].trim())) items.push(lines[i++].trim().replace(li, ''));
        out.push(`<${ordered ? 'ol' : 'ul'} class="ans-list">${items.map(x => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue;
      }
      const h = /^#{1,4}\s+(.*)$/.exec(line);
      if (h) { out.push(`<div class="ans-h">${inline(h[1])}</div>`); i++; continue; }
      const q = /^>\s*(.*)$/.exec(line) || /^(?:\*\*)?(?:Action|Recommendation|Next step|Recommended action)(?:\*\*)?:\s*(.*)$/i.exec(line);
      if (q) { const lab = /^>/.test(line) ? '' : (line.match(/^(?:\*\*)?([A-Za-z ]+?)(?:\*\*)?:/) || [])[1]; out.push(`<div class="ans-callout">${lab ? `<span>${esc(lab)}</span>` : ''}${inline(q[1])}</div>`); i++; continue; }
      out.push(`<p class="${first ? 'ans-lead' : ''}">${inline(line)}</p>`); first = false; i++;
    }
    return out.join('');
  };
  const block = (kind, src) => {
    let c; try { c = JSON.parse(src); } catch (_) { return ''; }
    if (kind === 'kpi') {
      if (!Array.isArray(c)) return '';
      return `<div class="ans-kpis">${c.slice(0, 4).map(k => `<div class="ans-kpi ${tone(k.tone)}"><small>${esc(String(k.label || '').slice(0, 28))}</small><b>${esc(String(k.value ?? '').slice(0, 14))}</b>${k.sub ? `<span>${esc(String(k.sub).slice(0, 32))}</span>` : ''}</div>`).join('')}</div>`;
    }
    if (!c || !Array.isArray(c.data) || !c.data.length) return '';
    const unit = typeof c.unit === 'string' ? c.unit.slice(0, 4) : '', rows = c.data.slice(0, 12);
    const title = c.title ? `<div class="ans-chart-title">${esc(String(c.title).slice(0, 80))}</div>` : '';
    const lbl = r => String(r.label ?? '').slice(0, 30);
    return `<div class="ans-chart">${title}${c.type === 'compare'
      ? C2.compareBars(rows.map(r => ({ label: lbl(r), a: num(r.a), b: num(r.b) })), { aName: String(c.aName || 'Actual').slice(0, 20), bName: String(c.bName || 'Expected').slice(0, 20), unit })
      : C.hBars(rows.map(r => ({ label: lbl(r), value: num(r.value) })), { unit, ...(Number.isFinite(+c.max) ? { max: +c.max } : {}) })}</div>`;
  };
  const parts = String(text).split(/```(chart|kpi)\s*([\s\S]*?)```/);
  let html = '';
  for (let i = 0; i < parts.length; i += 3) { html += prose(parts[i]); if (parts[i + 1]) html += block(parts[i + 1], parts[i + 2]); }
  return '<div class="ans">' + html + '</div>';
}
function chatReply(input, ctx, strict) {
  const q = input.toLowerCase().trim(), sim = getSim(), td = sim.today, nh = sim.nowHour, vol = sim.todayVol;
  const card = (title, tone, rows, foot = '') => `<div class="rich"><div class="rich-head ${tone}">${esc(title)} ${pill(tone, tone === 'good' ? 'Healthy' : tone === 'warn' ? 'Watch' : 'Alert')}</div>${rows}${foot ? `<p class="small muted">${foot}</p>` : ''}</div>`;
  if (strict && !/^(check |run all checks|help$|commands$)/.test(q)) return null;
  if (/^help$|^commands$/.test(q)) return { html: '<b>Try these</b><ul class="mini-list"><li><b>check css</b> · <b>check volume</b> · <b>check issue category</b></li><li><b>who is understaffed</b> · <b>audit summary</b> · <b>my tasks</b> · <b>team ranking</b> · <b>vault stats</b></li><li>Workspace commands: tickets · list tasks · create task &lt;title&gt; · validate roster · search &lt;text&gt;</li></ul>' };
  if (/^(run )?all checks$|^health|^status|^brief|^summary/.test(q)) return { html: checksHtml() + '<p class="small muted">Tap a check for details.</p>' };
  if (/\bcss\b|csat|survey/.test(q)) { const infra = sim.teamPerf.filter(t => S.INFRA_SD.includes(t.id)); const c = checks()[0]; return { html: card('CSS check', c.tone, C.hBars(infra.map(t => ({ label: t.id, value: t.vals.csat, display: t.vals.csat + '%' })), { max: 100 }), `${esc(c.detail)} Target CSAT 94% / response 30%.`) }; }
  if (/volume|surge in (calls|chats|tickets)|how busy/.test(q)) { const c = checks()[1]; return { html: card('Volume check', c.tone, C2.compareBars(S.CHANNELS.map(ch => ({ label: ch, a: vol[ch].now, b: Math.round(vol[ch].usual) })), { aName: `Today by ${hh(nh)}`, bName: 'Usual by now' }), `Monthly daily average: ${S.CHANNELS.map(ch => `${ch} ${fmt(Math.round(vol[ch].monthAvgDay))}`).join(' · ')}.`) }; }
  if (/issue|categor|surge/.test(q)) { const c = checks()[2]; return { html: card('Issue category check', c.tone, `<ul class="mini-list">${sim.issues.slice(0, 5).map(i => `<li>${pill(i.status === 'surge' ? 'bad' : i.status === 'watch' ? 'warn' : 'good', i.status === 'normal' ? 'Normal' : i.status === 'surge' ? 'Surge' : 'Watch')} <b>${esc(i.name)}</b> ${i.actual} vs ${i.expected} (${i.ratio.toFixed(2)}×)</li>`).join('')}</ul>`, 'Open Overview for the full surge detector and a trend per issue.') }; }
  if (/understaff|staffing|shift|coverage|available/.test(q)) { const rows = []; for (let h = nh; h < Math.min(24, nh + 6); h++) { const x = avail(sim, h); rows.push({ label: hh(h), value: S.r1(x.a), display: `${S.r1(x.a)} avail · ${S.r1(x.r)} needed` }); } const g = S.CHANNELS.map(ch => ({ ch, st: S.gridStats(S.currentCoverage(sim, ch, sim.forecast[ch])) })); return { html: card('Staffing check', g.some(x => x.st.under > 24) ? 'warn' : 'good', C.hBars(rows, { max: Math.max(...rows.map(r => r.value)) * 1.2 }), `Understaffed hours this week: ${g.map(x => `${x.ch} ${x.st.under}`).join(' · ')}. Try the AI planner on the Shifts page.`) }; }
  if (/audit/.test(q)) { const au = S.summariseAudits(ui.auditUp ? ui.auditUp.rows : sim.audits); const low = au.teamStats[au.teamStats.length - 1]; return { html: card('Audit check', au.overall >= 90 ? 'good' : 'warn', C.hBars(au.teamStats.map(t => ({ label: t.team, value: S.r1(t.overall), display: S.r1(t.overall) + '%' })), { max: 100 }), `Lowest: ${esc(low.team)}, lagging on ${esc(low.weakest?.p.n || '—')}.`) }; }
  if (/my task|tasks|pending|overdue/.test(q) && !/^(list|create|complete|reopen|archive|assign|set) /.test(q)) { const t = tasksModel(ctx).filter(x => x.owner === 'ME' && x.status !== 'Done'); return { html: card('My tasks', t.some(x => x.due < td) ? 'warn' : 'good', `<ul class="mini-list">${t.slice(0, 6).map(x => `<li><b>${esc(x.title)}</b> — ${dueText(x.due, td)}</li>`).join('')}</ul>`, `${t.length} open task(s) assigned to you.`) }; }
  if (/rank|best team|top agent|lagging|performing/.test(q)) { const r = [...perfTeams()].sort((a, b) => b.score - a.score); return { html: card('Team ranking (Infra SD)', 'good', C2.rankBars(r.map(t => ({ label: t.id, value: S.r1(t.score) })), { min: 85, max: 100, unit: '' }), `Best: ${esc(r[0].id)} · Lowest: ${esc(r[r.length - 1].id)}.`) }; }
  if (/vault|nexthink|cause/.test(q)) { const e = vaultEntries(), a = e.filter(x => x.nexthink !== 'Not applicable'); return { html: card('Data Vault', 'good', `<p>${e.length} entries · Nexthink executed on ${Math.round(a.filter(x => x.nexthink === 'Yes').length / a.length * 100)}% of applicable contacts.</p>`, 'Open Data Vault to add an entry.') }; }
  return null;
}

/* Compact snapshot of the whole simulated model, used to ground free-form AI answers. */
function groundingContext(ctx) {
  const sim = getSim(), r = S.r1, v = sim.todayVol, td = sim.today;
  const au = S.summariseAudits(ui.auditUp ? ui.auditUp.rows : sim.audits);
  const tm = tasksModel(ctx), ents = vaultEntries(), cnt = f => { const m = {}; ents.forEach(x => { m[f(x)] = (m[f(x)] || 0) + 1; }); return m; };
  const agents = sim.perfAgents.filter(a => !a.isLead).sort((a, b) => b.score - a.score);
  const staffing = Object.fromEntries(S.CHANNELS.map(c => { const g = S.currentCoverage(sim, c, effectiveForecast(c)), st = S.gridStats(g); return [c, { agents: sim.poolAgents(c).length, understaffedHoursPerWeek: st.under, shortfallAgentHours: Math.round(st.gapHrs), worstWindows: S.windows(g).slice(0, 4).map(w => `${S.DAYS[w.x]} ${hh(w.from)}-${hh(w.to)} short by ${Math.ceil(w.max)}`), aiPlanUnderstaffedHours: S.gridStats(S.planShifts(sim, c, { forecast: effectiveForecast(c) }).grid).under }]; }));
  const hours = []; for (let h = sim.nowHour; h < 24; h++) { const a = avail(sim, h); hours.push(`${hh(h)} available ${r(a.a)} / required ${r(a.r)}`); }
  return {
    note: 'SIMULATED demo data. All people, IDs and numbers are fictitious.', today: td, snapshotHour: hh(sim.nowHour), weekday: S.DAYS[S.dow(td)],
    volumeToday: Object.fromEntries(S.CHANNELS.map(c => [c, { soFar: v[c].now, usualByNow: Math.round(v[c].usual), monthlyDailyAvg: Math.round(v[c].monthAvgDay), projectedFullDay: Math.round(v[c].now / sim.cumNow) }])),
    last14DaysTotal: sim.daily.slice(-15, -1).map(d => `${d.date.slice(5)}:${d.total}`).join(' '),
    issues: sim.issues.map(i => ({ issue: i.name, today: i.actual, expectedByNow: i.expected, ratio: r(i.ratio), status: i.status, monthlyDailyAvg: Math.round(i.monthAvgDay) })),
    peopleToday: { totalAgents: sim.agents.length, rosteredToday: sim.agents.filter(a => sim.works(a, td)).length, presentNow: sim.agents.filter(a => sim.works(a, td) && S.covers(a.shift, sim.nowHour) && !sim.absentToday.has(a.id)).length, absentOrLeave: sim.absentToday.size },
    availabilityVsRequiredNextHours: hours.slice(0, 8), staffing,
    audits: { source: ui.auditUp ? ui.auditUp.name : 'simulated month', target: S.AUDIT_TARGET, overall: r(au.overall), passRate: r(au.passRate), fatalFlags: au.fatal, teams: au.teamStats.map(t => ({ team: t.team, overall: r(t.overall), weakest: t.weakest?.p.n, params: Object.fromEntries(S.AUDIT_PARAMS.map(p => [p.n, t.params[p.k] === null ? null : r(t.params[p.k])])) })), coaching: au.actions.map(a => `${a.team}: ${a.param}`) },
    performance: { targets: Object.fromEntries(S.PERF.map(m => [m.n + (m.dir < 0 ? ' (lower better)' : ''), m.target])), teams: sim.teamPerf.map(t => ({ team: t.id, rank: t.rank, score: r(t.score), agents: t.size, abandonPct: t.abandon, metrics: Object.fromEntries(S.PERF.map(m => [m.n, t.perAgent[m.k]])) })), topAgents: agents.slice(0, 5).map(a => `${a.name} (${a.team}) ${r(a.score)}`), bottomAgents: agents.slice(-5).map(a => `${a.name} (${a.team}) ${r(a.score)}`), leads: sim.leadPerf.slice(0, 8).map(l => `#${l.rank} ${l.name} (${l.team}) ${r(l.score)}, focus: ${l.weakest}`) },
    tasks: { total: tm.length, byStatus: Object.fromEntries(['Open', 'In progress', 'Blocked', 'Done'].map(x => [x, tm.filter(t => t.status === x).length])), overdue: tm.filter(t => t.status !== 'Done' && t.due < td).map(t => `${t.title} (${t.ownerName}, ${t.due})`), assignedToMe: tm.filter(t => t.owner === 'ME').map(t => `${t.title} [${t.status}, ${t.priority}, due ${t.due}]`) },
    dataVault: { entries: ents.length, byIssue: cnt(x => x.issue), byCause: cnt(x => x.cause), nexthinkExecuted: cnt(x => x.nexthink), causeCodes: Object.fromEntries(S.CAUSES) },
  };
}
/* ================================================================ public API + wiring */
function page(name, ctx) {
  let h;
  if (name === 'overview') h = overview(ctx);
  else if (LEGACY[name] && ui.tab[name] === LEGACY[name]) return null;
  else h = { audits, shifts, tasks, performance, datavault }[name]?.(ctx) ?? null;
  return h === null ? null : h + (name === 'tasks' ? '' : aiPanel(name));
}
/* ---- AI analysis (OpenRouter, default model deepseek/deepseek-v4.1-flash). Sends only a compact numeric summary. */
const aiText = {};
function aiPanel(name) {
  const cfg = window.SDApp ? window.SDApp.ai() : { model: 'deepseek/deepseek-v4.1-flash' };
  const ready = cfg.enabled && (cfg.proxy || (cfg.consent && cfg.key));
  const out = aiText[name] ? `<div class="ai-out">${aiText[name]}</div>` : '';
  return `<section class="panel wide ai-panel"><div class="panel-head"><h2>✦ AI analysis</h2><div class="panel-right">${pill(ready ? 'good' : 'warn', ready ? 'Connected' : 'Not configured')} <span class="muted small">${esc(cfg.model)} · OpenRouter${cfg.proxy ? ' · server key' : ''}</span></div></div><p class="panel-note muted">Sends a compact summary of this page's numbers (no names or transcripts) to the model and returns insights and next actions. Figures are simulated unless you uploaded data.</p><div class="actions">${btn('Analyse this page', 'ai-run', `data-page="${name}"`, 'primary')}${ready ? '' : btn('Configure AI', 'go', 'data-page="settings"')}</div><div id="ai-out-${name}" aria-live="polite">${out}</div></section>`;
}
function aiContext(name) {
  const sim = getSim(), r = x => S.r1(x);
  if (name === 'overview') { const v = sim.todayVol; return { asOf: `${sim.today} ${hh(sim.nowHour)}`, volumeVsUsualByNow: Object.fromEntries(S.CHANNELS.map(c => [c, { today: v[c].now, usual: Math.round(v[c].usual), monthlyDailyAvg: Math.round(v[c].monthAvgDay) }])), issues: sim.issues.slice(0, 6).map(i => ({ issue: i.name, today: i.actual, expected: i.expected, ratio: r(i.ratio), status: i.status })), availabilityVsRequiredNow: (() => { const a = avail(sim, sim.nowHour); return { available: r(a.a), required: r(a.r) }; })(), audit: (() => { const a = S.summariseAudits(ui.auditUp ? ui.auditUp.rows : sim.audits); return { overall: r(a.overall), lowestTeam: a.teamStats[a.teamStats.length - 1].team }; })() }; }
  if (name === 'audits') { const a = S.summariseAudits(ui.auditUp ? ui.auditUp.rows : sim.audits); return { target: S.AUDIT_TARGET, overall: r(a.overall), passRate: r(a.passRate), fatal: a.fatal, teams: a.teamStats.map(t => ({ team: t.team, overall: r(t.overall), weakest: t.weakest?.p.n, params: Object.fromEntries(S.AUDIT_PARAMS.map(p => [p.n, t.params[p.k] === null ? null : r(t.params[p.k])])) })) }; }
  if (name === 'shifts') { const ch = ui.channel, g = S.currentCoverage(sim, ch, effectiveForecast(ch)), st = S.gridStats(g); return { channel: ch, agents: sim.poolAgents(ch).length, understaffedHoursPerWeek: st.under, shortfallAgentHours: Math.round(st.gapHrs), overstaffedSlots: st.over, worstWindows: S.windows(g).slice(0, 5).map(w => ({ day: S.DAYS[w.x], from: hh(w.from), to: hh(w.to), shortBy: Math.ceil(w.max) })), uploadedForecast: !!ui.forecast }; }
  if (name === 'performance') return { scope: ui.scope, targets: Object.fromEntries(S.PERF.map(m => [m.n, m.target])), teams: perfTeams().map(t => ({ team: t.id, score: r(t.score), agents: t.size, metrics: Object.fromEntries(S.PERF.filter(m => m.w >= 0.04).map(m => [m.n, t.perAgent[m.k]])) })) };
  if (name === 'datavault') { const e = vaultEntries(), cnt = f => { const m = {}; e.forEach(x => { m[f(x)] = (m[f(x)] || 0) + 1; }); return m; }; return { entries: e.length, byIssue: cnt(x => x.issue), byCause: cnt(x => x.cause), nexthink: cnt(x => x.nexthink) }; }
  return {};
}
const mdLite = t => { let out = '', inList = false; for (const line of String(t).split('\n')) { const m = /^\s*[-*•]\s+(.*)$/.exec(line), body = x => esc(x).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); if (m) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + body(m[1]) + '</li>'; } else { if (inList) { out += '</ul>'; inList = false; } if (line.trim()) out += '<p>' + body(line) + '</p>'; } } return out + (inList ? '</ul>' : ''); };
async function runAi(name) {
  const A = window.SDApp, box = document.getElementById('ai-out-' + name), cfg = A.ensureAi();
  if (cfg.proxy && !cfg.consent) throw Error('AI was not enabled (consent declined).');
  if (!cfg.enabled || !cfg.consent) throw Error('Open Settings → Assistant & AI analysis, enable external AI, give consent, enter your OpenRouter key and save.');
  if (!cfg.key) throw Error(cfg.proxy ? 'An access code is required.' : 'Enter your OpenRouter key in Settings (it is kept in memory only and must be re-entered after a reload).');
  box.innerHTML = '<p class="muted">Analysing with ' + esc(cfg.model) + '…</p>';
  const text = await SDProvider.run({ endpoint: cfg.endpoint, model: cfg.model, key: cfg.key, consent: cfg.consent, tools: {}, execute: () => ({}),
    messages: [{ role: 'system', content: 'You are an operations analyst for an IT service desk. The JSON is simulated demo data. Give 4-6 concise bullet insights, each with the likely reason, then 3 prioritised recommended actions. Use only the numbers provided; do not invent values.' }, { role: 'user', content: `Page: ${name}\n${JSON.stringify(aiContext(name))}` }] });
  aiText[name] = '<div class="ai-out">' + mdLite(text) + '</div>'; box.innerHTML = aiText[name];
}
const tabBar = name => TABS[name] ? head({ audits: 'Audits', shifts: 'Shifts', performance: 'Performance' }[name], 'Manual tools for the real workspace data.') + chips(name, TABS[name], ui.tab[name]) : '';

function downloadFile(name, data, type = 'text/csv') { const u = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
const csvOf = rows => rows.map(r => r.map(v => { let s = String(v ?? ''); if (/^[=+@-]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }).join(',')).join('\n');
function sheetDownload(name, rows) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sample (SIMULATED)'); XLSX.writeFile(wb, name); }
async function readSheet(file) { if (file.size > 25 * 1024 * 1024) throw Error('File exceeds 25 MB.'); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true }); }
const app = () => window.SDApp;
const say = (m, bad) => app().notice(m, bad);
const slim = rows => rows.map(r => ({ id: r.id, date: r.date, agentId: r.agentId, agent: r.agent, team: r.team, channel: r.channel, scores: r.scores, overall: r.overall, fatal: r.fatal }));
function setAudit(rows, name, sample) { ui.auditUp = { rows, name, sample }; S.store.set('auditUp', { rows: slim(rows), name, sample }); }
function setForecast(parsed, name, sample) { ui.forecast = { fc: parsed.fc, rows: parsed.rows, channels: parsed.channels, name, sample }; S.store.set('forecast', ui.forecast); ui.plans = {}; }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-v]'); if (!b || !window.SDApp) return;
  const v = b.dataset.v, A = app(), sim = getSim();
  try {
    if (v === 'tab') { ui.tab[b.dataset.page] = b.dataset.val; A.render(); }
    else if (v === 'go') { if (b.dataset.tab) ui.tab[b.dataset.page] = b.dataset.tab; A.navigate(b.dataset.page); }
    else if (v === 'open-chat') document.getElementById('ask').click();
    else if (v === 'channel') { ui.channel = b.dataset.val; A.render(); }
    else if (v === 'day') { ui.day = Number(b.dataset.val); A.render(); }
    else if (v === 'who') { ui.who = b.dataset.val; A.render(); }
    else if (v === 'scope') { ui.scope = b.dataset.val; ui.agentTeam = ''; A.render(); }
    else if (v === 'audit-sample') { setAudit(S.auditRowsFromSheet(S.sampleAuditRows(sim), sim), 'Sample audit upload (SIMULATED)', true); A.render(); say('Sample audit file processed — dashboard updated.'); }
    else if (v === 'audit-reset') { ui.auditUp = null; S.store.remove('auditUp'); A.render(); }
    else if (v === 'audit-template') sheetDownload('Audit upload sample (SIMULATED).xlsx', S.sampleAuditRows(sim));
    else if (v === 'forecast-sample') { setForecast(S.forecastFromRows(S.sampleForecastRows(sim)), 'Sample forecast upload (SIMULATED)', true); A.render(); say('Sample forecast processed — coverage recalculated.'); }
    else if (v === 'forecast-reset') { ui.forecast = null; S.store.remove('forecast'); ui.plans = {}; A.render(); }
    else if (v === 'forecast-template') sheetDownload('Forecast upload sample (SIMULATED).xlsx', S.sampleForecastRows(sim));
    else if (v === 'plan-gen') { delete ui.plans[ui.channel]; const s = document.getElementById('ai-shrink'); if (s) ui.aiShrink = Math.max(0, Math.min(45, Number(s.value) || 20)); const n = document.getElementById('ai-night'); if (n) ui.aiNight = n.checked; A.render(); say('AI plan generated.'); }
    else if (v === 'plan-csv') { const p = ui.plans[ui.channel]; if (!p) return; downloadFile(`AI shift plan ${ui.channel}.csv`, csvOf([['Agent ID', 'Name', 'Team', 'Shift', 'Hours', ...S.DAYS], ...p.plan.map(a => [a.id, a.name, a.team, a.shift, S.label(a.shift), ...S.DAYS.map((_, x) => x === a.offStart || x === (a.offStart + 1) % 7 ? 'OFF' : a.shift)])])); }
    else if (v === 'plan-publish') { ui.published[ui.channel] = new Date().toISOString(); S.store.set('published', ui.published); A.render(); say(`AI plan for ${ui.channel} approved and published to the roster view.`); }
    else if (v === 'task-from') A.createTask(b.dataset.title);
    else if (v === 'new-task-real') A.newTask();
    else if (v === 'vault-export') downloadFile('data_vault.csv', csvOf([['Time', 'Agent ID', 'Agent', 'Team', 'Ticket', 'Channel', 'Issue', 'Sub-category', 'Nexthink executed', 'Script', 'Cause code', 'Resolution'], ...vaultEntries().map(x => [x.ts, x.agentId, x.agent, x.team, x.ticket, x.channel, x.issue, x.sub, x.nexthink, x.script, x.cause, x.resolution])]));
    else if (v === 'ai-run') { runAi(b.dataset.page).catch(err => { const bx = document.getElementById('ai-out-' + b.dataset.page); if (bx) bx.innerHTML = `<p class="error">${esc(err.message)}</p>`; }); }
    else if (v === 'chat-cmd') { const i = document.getElementById('assistant-input'); i.value = b.dataset.cmd; document.getElementById('assistant-form').requestSubmit(); }
  } catch (err) { say(err.message, true); }
});
document.addEventListener('change', async e => {
  const t = e.target, A = window.SDApp; if (!A) return;
  try {
    if (t.id === 'audit-file' && t.files[0]) { const rows = await readSheet(t.files[0]); setAudit(S.auditRowsFromSheet(rows, getSim()), t.files[0].name, false); A.render(); say(`Uploaded ${t.files[0].name}: dashboard updated.`); }
    else if (t.id === 'forecast-file' && t.files[0]) { setForecast(S.forecastFromRows(await readSheet(t.files[0])), t.files[0].name, false); A.render(); say(`Uploaded ${t.files[0].name}: coverage recalculated.`); }
    else if (t.id === 'task-pri') { ui.pri = t.value; A.render(); } else if (t.id === 'task-team') { ui.team = t.value; A.render(); }
    else if (t.id === 'rank-by') { ui.rankBy = t.value; A.render(); } else if (t.id === 'agent-team') { ui.agentTeam = t.value; A.render(); }
    else if (t.id === 'vault-team') { ui.vaultTeam = t.value; A.render(); } else if (t.id === 'vault-issue-f') { ui.vaultIssue = t.value; A.render(); }
    else if (t.dataset && t.dataset.v === 'task-status') { const m = S.store.get('taskStatus', {}); m[t.dataset.id] = t.value; S.store.set('taskStatus', m); A.render(); say('Task updated.'); }
    else if (t.id === 'v-agent') { const o = t.selectedOptions[0]; document.getElementById('v-eid').value = t.value; document.getElementById('v-team').value = o.dataset.team; }
    else if (t.id === 'v-issue') { const i = S.ISSUES.find(x => x.name === t.value); document.getElementById('v-sub').innerHTML = i.subs.map(s => `<option>${esc(s)}</option>`).join(''); }
    else if (t.name === 'v-nx') document.getElementById('v-script-wrap').hidden = t.value !== 'Yes';
  } catch (err) { if (t.type === 'file') t.value = ''; say(err.message, true); }
});
document.addEventListener('input', e => { if (e.target.id === 'task-q' && window.SDApp) { ui.q = e.target.value; const p = e.target.selectionStart; window.SDApp.render(); const n = document.getElementById('task-q'); if (n) { n.focus(); n.setSelectionRange(p, p); } } });
document.addEventListener('submit', e => {
  if (e.target.id !== 'vault-form') return; e.preventDefault();
  const g = id => document.getElementById(id).value.trim(), A = window.SDApp;
  const nx = document.querySelector('input[name=v-nx]:checked').value, agent = getSim().agents.find(a => a.id === g('v-agent'));
  const ticket = g('v-ticket').toUpperCase();
  if (!/^[A-Z0-9-]{4,20}$/.test(ticket)) { document.getElementById('vault-msg').textContent = 'Enter a valid ticket / interaction ID.'; return; }
  const entry = { id: 'VLT-U' + Date.now(), ts: new Date().toISOString().slice(0, 16), agentId: g('v-eid'), agent: agent?.name || g('v-eid'), team: g('v-team'), ticket, channel: g('v-channel'), issue: g('v-issue'), sub: g('v-sub'), nexthink: nx, script: nx === 'Yes' ? g('v-script') : '', cause: g('v-cause'), resolution: g('v-res'), notes: g('v-notes') };
  S.store.set('vault', [entry, ...S.store.get('vault', [])]);
  A.render(); A.notice(`Saved ${entry.ticket} to the Data Vault.`);
});

window.SDViews = { grounding: groundingContext, page, tabBar, checksHtml, chatReply, renderAnswer, tabs: TABS, state: ui, getSim, tasksModel, legacy: LEGACY, simTaskCreate(title) { const o = S.store.get('extraTasks', []); return o; } };
})();
