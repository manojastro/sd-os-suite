/* Dependency-free chart helpers. They return HTML/SVG strings, use CSS variables for colour
   (so light and dark themes both work), and embed no remote assets. Labels are escaped here. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDCharts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });
  const pct = n => (n === null || n === undefined || !Number.isFinite(n)) ? '—' : n.toFixed(1) + '%';
  const color = i => `var(--c${(i % 6) + 1})`;

  // Round a maximum up to a readable axis limit (1, 2, 5 or 10 times a power of ten).
  function niceCeil(max) {
    if (!(max > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const m = max / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  }

  function empty(message) {
    return `<p class="muted chart-empty">${esc(message)}</p>`;
  }

  // Time-series line with an area fill. points: [{label, value}]; highlights: indexes to mark.
  function lineChart(points, opts = {}) {
    const { height = 260, label = 'Trend', emptyText = 'No data to chart.', highlights = [], yFormat = fmt } = opts;
    if (!points.length) return empty(emptyText);
    const W = 720, H = height, padL = 52, padR = 16, padT = 16, padB = 30;
    const top = niceCeil(Math.max(...points.map(p => p.value), 1));
    const n = points.length;
    const x = i => n === 1 ? padL + (W - padL - padR) / 2 : padL + i * (W - padL - padR) / (n - 1);
    const y = v => padT + (H - padT - padB) * (1 - v / top);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    const base = (H - padB).toFixed(1);
    const area = `${line}L${x(n - 1).toFixed(1)},${base}L${x(0).toFixed(1)},${base}Z`;
    const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
      const v = top * f, yy = y(v).toFixed(1);
      return `<line class="gridline" x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}"/><text class="axis" x="${padL - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${esc(yFormat(v))}</text>`;
    }).join('');
    const step = Math.max(1, Math.ceil(n / 6));
    const xLabels = points.map((p, i) => i % step === 0
      ? `<text class="axis" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
    const dots = highlights.map(i => points[i] ? `<circle class="dot-alert" cx="${x(i).toFixed(1)}" cy="${y(points[i].value).toFixed(1)}" r="5"><title>${esc(points[i].label)}: ${esc(fmt(points[i].value))}</title></circle>` : '').join('');
    return `<figure class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">${grid}<path class="area" d="${area}"/><path class="trend" d="${line}"/>${dots}${xLabels}</svg></figure>`;
  }

  // Vertical columns as HTML so labels keep their size in narrow panels. items: [{label, value}]
  function barChart(items, opts = {}) {
    const { label = 'Bar chart', emptyText = 'No data to chart.' } = opts;
    if (!items.length) return empty(emptyText);
    const top = niceCeil(Math.max(...items.map(i => i.value), 1));
    return `<div class="vbars" role="img" aria-label="${esc(label)}">${items.map((it, i) => `<div class="vbar" title="${esc(it.label)}: ${esc(fmt(it.value))}"><span class="vbar-value">${esc(fmt(it.value))}</span><span class="vbar-col"><i style="height:${(it.value / top * 100).toFixed(1)}%;background:${color(0)}"></i></span><span class="vbar-label">${esc(it.label)}</span></div>`).join('')}</div>`;
  }

  // Horizontal bars as HTML so long labels wrap. items: [{label, value, display?}]
  function hBars(items, opts = {}) {
    const { emptyText = 'No data to chart.', max = null, unit = '' } = opts;
    if (!items.length) return empty(emptyText);
    const top = max ?? Math.max(...items.map(i => i.value), 1);
    return `<ul class="hbars">${items.map((it, i) => {
      const w = top > 0 ? Math.max(0, Math.min(100, it.value / top * 100)) : 0;
      return `<li><span class="hbar-label">${esc(it.label)}</span><span class="track" aria-hidden="true"><i style="width:${w.toFixed(1)}%;background:${color(i)}"></i></span><b class="hbar-value">${esc(it.display ?? fmt(it.value) + unit)}</b></li>`;
    }).join('')}</ul>`;
  }

  // Donut from [{label, value}]. The centre shows the total unless centre text is given.
  function donut(items, opts = {}) {
    const { label = 'Breakdown', centre = null, emptyText = 'No data to chart.' } = opts;
    const total = items.reduce((s, i) => s + i.value, 0);
    if (!total) return empty(emptyText);
    let start = 0;
    const segs = items.filter(i => i.value > 0).map((it, idx) => {
      const p = it.value / total * 100;
      const seg = `<circle class="seg" r="15.915" cx="21" cy="21" pathLength="100" stroke="${color(items.indexOf(it))}" stroke-dasharray="${p.toFixed(3)} ${(100 - p).toFixed(3)}" stroke-dashoffset="${(25 - start).toFixed(3)}"><title>${esc(it.label)}: ${esc(fmt(it.value))} (${p.toFixed(1)}%)</title></circle>`;
      start += p;
      return seg;
    }).join('');
    const legend = items.map((it, i) => `<li><span class="swatch" style="background:${color(i)}"></span><span>${esc(it.label)}</span><b>${esc(fmt(it.value))}</b><span class="muted">${(it.value / total * 100).toFixed(1)}%</span></li>`).join('');
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${esc(label)}"><circle class="track-ring" r="15.915" cx="21" cy="21" fill="none" stroke-width="5"/><g transform="rotate(0 21 21)" fill="none" stroke-width="5">${segs}</g><text x="21" y="20" text-anchor="middle" class="donut-total">${esc(centre ?? fmt(total))}</text><text x="21" y="26" text-anchor="middle" class="donut-sub">${esc(centre ? '' : 'total')}</text></svg><ul class="legend">${legend}</ul></div>`;
  }

  // Progress ring for a percentage (null shows an em dash).
  function ring(value, opts = {}) {
    const { label = 'Rate', tone = 'c1' } = opts;
    const has = value !== null && value !== undefined && Number.isFinite(value);
    const p = has ? Math.max(0, Math.min(100, value)) : 0;
    return `<svg class="ring" viewBox="0 0 42 42" role="img" aria-label="${esc(label)}: ${esc(has ? pct(value) : 'not available')}"><circle class="track-ring" r="15.915" cx="21" cy="21" fill="none" stroke-width="4"/>${has ? `<circle r="15.915" cx="21" cy="21" fill="none" stroke="var(--${tone})" stroke-width="4" pathLength="100" stroke-dasharray="${p.toFixed(2)} ${(100 - p).toFixed(2)}" stroke-dashoffset="25" stroke-linecap="round"/>` : ''}<text x="21" y="22.5" text-anchor="middle" class="ring-text">${esc(has ? Math.round(p) + '%' : '—')}</text></svg>`;
  }

  return { esc, pct, fmt, niceCeil, lineChart, barChart, hBars, donut, ring };
});
