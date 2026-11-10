const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../src/charts.js');
const D = require('../src/domain.js');
const SI = require('../src/insights.js');

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'sample-data.json'), 'utf8'));

test('chart helpers escape labels and show empty states', () => {
  const html = C.barChart([{ label: '<img src=x>', value: 3 }]);
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(C.donut([{ label: 'a', value: 0 }]).includes('chart-empty'));
  assert.ok(C.lineChart([]).includes('chart-empty'));
  assert.ok(C.ring(null).includes('—'));
  assert.equal(C.niceCeil(67), 100);
  assert.equal(C.niceCeil(0), 1);
});

test('donut segments sum to 100 percent', () => {
  const html = C.donut([{ label: 'x', value: 1 }, { label: 'y', value: 3 }]);
  assert.ok(html.includes('stroke-dasharray="25.000 75.000"'));
  assert.ok(html.includes('stroke-dasharray="75.000 25.000"'));
});

test('dashboard fills quiet days, orders weekdays and reports insights', () => {
  const settings = D.defaults().settings;
  const tickets = sample.tickets;
  const dash = SI.dashboard(tickets, settings);
  assert.equal(dash.daily.length, 62);
  assert.equal(dash.daily.reduce((s, d) => s + d.count, 0), dash.daily.length ? tickets.length - dash.excluded : 0);
  assert.equal(dash.weekday.length, 7);
  assert.equal(dash.weekday[0].label, 'Mon');
  assert.ok(dash.insights.length >= 1);
  assert.ok(dash.insights.every(i => ['info', 'warn'].includes(i.tone)));
});

test('dashboard handles no tickets', () => {
  const dash = SI.dashboard([], D.defaults().settings);
  assert.equal(dash.daily.length, 0);
  assert.equal(dash.weekly, null);
  assert.deepEqual(dash.insights, []);
});
