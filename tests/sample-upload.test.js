const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

globalThis.crypto ??= crypto.webcrypto;
const root = path.join(__dirname, '..');
const D = require('../src/domain.js');
const I = require('../src/imports.js');
const S = require('../src/sample.js');
const sample = JSON.parse(fs.readFileSync(path.join(root, 'src', 'sample-data.json'), 'utf8'));
const NOW = '2026-11-03T00:00:00.000Z';

// Mirrors the browser action: preview each dataset against the current revision, then apply it.
function loadSample(state) {
  const accepted = {};
  for (const kind of S.ORDER) {
    const plan = S.planDataset(state, sample, kind);
    assert.equal(plan.rejected.length, 0, `${kind} has rejected rows`);
    const next = D.clone(state);
    I.apply(next, plan);
    next.revision++;
    D.validateState(next);
    Object.assign(state, next);
    accepted[kind] = plan.accepted.length;
  }
  const audits = S.auditRecords(sample, NOW);
  for (const a of audits) if (!state.audits.some(x => x.id === a.id)) state.audits.push(a);
  return { accepted, audits };
}

test('sample counts match the SIMULATED source files', () => {
  assert.equal(sample.employees.length, 167);
  assert.equal(sample.tickets.length, 2221);
  assert.equal(sample.counts.duplicateTicketsRemoved, 5);
  assert.equal(sample.audits.length, 15);
  assert.ok(sample.notice.includes('SIMULATED'));
});

test('sample upload imports every dataset with no rejected rows', () => {
  const state = D.defaults();
  const { accepted } = loadSample(state);
  assert.deepEqual(accepted, { employees: 167, tickets: 2221, roster: 368, demand: 336 });
  assert.equal(state.imports.length, 4);
  assert.ok(state.imports.every(x => x.filename === 'Sample upload (SIMULATED)'));
});

test('running the sample upload twice does not duplicate records', () => {
  const state = D.defaults();
  loadSample(state);
  const before = Object.fromEntries(['employees', 'tickets', 'roster', 'demand', 'audits'].map(k => [k, state[k].length]));
  loadSample(state);
  const after = Object.fromEntries(['employees', 'tickets', 'roster', 'demand', 'audits'].map(k => [k, state[k].length]));
  assert.deepEqual(after, before);
  assert.equal(new Set(state.audits.map(a => a.id)).size, 15);
});

test('analysis reports roster validity, ticket metrics and audit samples', () => {
  const state = D.defaults();
  const { audits } = loadSample(state);
  const result = S.analyse(state, audits);
  assert.equal(result.roster.valid, true, 'roster should satisfy the default policy');
  assert.equal(result.roster.shifts, 360);
  assert.equal(result.roster.leave, 8);
  assert.equal(result.tickets.total, 2221);
  assert.ok(result.tickets.resolutionRate > 0);
  assert.equal(result.samples.length, 15);
  assert.equal(result.audits.total, 15);
});

test('built workspace bundles the sample upload action', () => {
  const html = fs.readFileSync(path.join(root, 'SD_OS_Suite.html'), 'utf8');
  assert.ok(html.includes('const SD_SAMPLE_DATA'), 'sample data is embedded');
  assert.ok(html.includes("data-action=\"sample-upload\"") || html.includes("'sample-upload'"), 'button wired');
  assert.ok(html.includes('function runSampleUpload'), 'upload routine present');
});
