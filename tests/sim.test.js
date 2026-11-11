const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../src/sim.js'),data=require('../src/sample-data.json');
const sim=S.build(data,{today:'2026-11-11',hour:14});
test('simulation is deterministic and flags the injected surge',()=>{
  const again=S.build(data,{today:'2026-11-11',hour:14});
  assert.equal(JSON.stringify(sim.issues),JSON.stringify(again.issues));
  assert.equal(sim.issues[0].name,'MFA / Authenticator');assert.equal(sim.issues[0].status,'surge');
});
test('AI shift plan reduces understaffed hours for every channel',()=>{
  for(const c of S.CHANNELS){const cur=S.gridStats(S.currentCoverage(sim,c)),ai=S.gridStats(S.planShifts(sim,c).grid);assert.ok(ai.gapHrs<=cur.gapHrs,c);}
});
test('audit upload parsing and summary',()=>{
  const rows=S.auditRowsFromSheet(S.sampleAuditRows(sim),sim),sum=S.summariseAudits(rows);
  assert.ok(rows.length>100);assert.ok(sum.teamStats.length>=5);assert.ok(sum.actions.length>0);
  assert.throws(()=>S.auditRowsFromSheet([{foo:1}],sim),/No usable rows/);
});
test('forecast upload parsing',()=>{
  const p=S.forecastFromRows(S.sampleForecastRows(sim));assert.deepEqual(p.channels,S.CHANNELS);
  assert.throws(()=>S.forecastFromRows([{a:1}]),/No usable rows/);
});
