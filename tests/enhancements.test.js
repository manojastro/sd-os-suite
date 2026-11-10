const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/domain.js');
const A = require('../src/assistant.js');
const Audit = require('../src/audit.js');
const {webcrypto} = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;

test('security flags cover one-time codes, card details and government IDs with exact offsets', () => {
  const transcript = 'Please send me your one-time code now. Also share your card number. Then provide your SSN number.';
  const result = Audit.run(transcript);
  const rules = result.findings.map(f => f.rule);
  assert.deepEqual(rules, ['one_time_code_request', 'card_detail_request', 'government_id_request']);
  for (const f of result.findings) {
    assert.equal(transcript.slice(f.start, f.end), f.evidence, 'evidence must be an exact substring');
    assert.equal(f.status, 'Needs review');
  }
  assert.equal(result.verdict, 'Not assessed');
  assert.equal(result.score, null);
});

test('benign transcripts raise no security flags and criteria stay unassessed', () => {
  const result = Audit.run('Your order has shipped. I can confirm the delivery address and close this ticket.');
  assert.equal(result.findings.length, 0);
  assert.ok(result.criteria.every(c => c.status === 'Not assessed'));
});

function seeded() {
  const state = D.defaults();
  state.employees.push({id: 'e1', name: 'Ada', team: 'Support', active: true});
  const open = D.createTask(state, {title: 'Open one', ownerId: 'e1', priority: 'High'}, {idempotencyKey: 'a'}).record;
  const done = D.createTask(state, {title: 'Done one'}, {idempotencyKey: 'b'}).record;
  D.updateTask(state, done.id, {status: 'Done'});
  const archived = D.createTask(state, {title: 'Archived one'}, {idempotencyKey: 'c'}).record;
  D.updateTask(state, archived.id, {archived: true});
  return {state, open, done, archived};
}

test('list_tasks returns only open, non-archived tasks with scope disclosed', () => {
  const {state, open} = seeded();
  const result = A.execute(state, 'list_tasks', {});
  assert.equal(result.ok, true);
  assert.equal(result.total, 1);
  assert.equal(result.tasks[0].id, open.id);
  assert.match(result.scope, /Open tasks/);
});

test('local grammar: list tasks, archive task, and open tasks still navigates', () => {
  assert.deepEqual(A.localCommand('list tasks'), {name: 'list_tasks', args: {}});
  assert.deepEqual(A.localCommand('archive task abc-1'), {name: 'update_task', args: {id: 'abc-1', archived: true}});
  assert.deepEqual(A.localCommand('open tasks'), {name: 'navigate', args: {page: 'tasks'}});
  assert.match(A.localCommand('help').help, /list tasks/);
  assert.match(A.localCommand('help').help, /archive task/);
});

test('archive through the assistant records the prior value and undo restores it exactly', () => {
  const {state, open} = seeded();
  const result = A.execute(state, 'update_task', {id: open.id, archived: true});
  assert.equal(result.ok, true);
  assert.equal(state.tasks.find(t => t.id === open.id).archived, true);
  assert.equal(result.before.archived, false, 'the prior boolean is recorded as a boolean, not an empty string');
  // Undo applies the stored before-values through the domain layer.
  D.updateTask(state, open.id, result.before);
  const restored = state.tasks.find(t => t.id === open.id);
  assert.equal(restored.archived, false);
  assert.equal(restored.title, 'Open one');
});

test('update_task validates the archived flag as a boolean', () => {
  const {state, open} = seeded();
  const bad = A.execute(state, 'update_task', {id: open.id, archived: 'yes'});
  assert.equal(bad.ok, false);
  assert.match(bad.error, /Invalid field: archived/);
});
