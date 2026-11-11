/* Additional dependency-free charts (SVG / HTML strings). Colours come from CSS tokens so both themes work.
   One y-axis per chart: measures with different units are never overlaid. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./charts.js') : root.SDCharts);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.SDCharts2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C) {
  'use strict';
  const { esc, fmt, niceCeil } = C;
  const col = i => `var(--c${(i % 6) + 1})`;

  function sparkline(values, { w = 96, h = 28, tone = 'c1', last = true } = {}) {
    if (!values || values.length < 2) return '';
    const mn = Math.min(...values), mx = Math.max(...values), span = mx - mn || 1;
    const x = i => 2 + i * (w - 4) / (values.length - 1), y = v => h - 3 - (v - mn) / span * (h - 8);
    const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    const end = values.length - 1;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}L${x(end).toFixed(1)},${h}L${x(0).toFixed(1)},${h}Z" fill="var(--${tone})" opacity=".12"/><path d="${d}" fill="none" stroke="var(--${tone})" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>${last ? `<circle cx="${x(end).toFixed(1)}" cy="${y(values[end]).toFixed(1)}" r="2.6" fill="var(--${tone})" stroke="var(--panel)" stroke-width="1.5"/>` : ''}</svg>`;
  }

  // Multi-series line chart on ONE axis. series: [{name, values:[..], dash?:bool, tone?}], labels: x labels.
  function multiLine(labels, series, { height = 260, label = 'Trend', unit = '', hlIndex = null, yFormat = fmt, w = 720 } = {}) {
    if (!labels.length) return '<p class="muted chart-empty">No data to chart.</p>';
    const W = w, H = height, pl = 56, pr = 24, pt = 14, pb = 30, n = labels.length;
    const all = series.flatMap(s => s.values.filter(v => v !== null && v !== undefined));
    const top = niceCeil(Math.max(...all, 1));
    const x = i => n === 1 ? pl + (W - pl - pr) / 2 : pl + i * (W - pl - pr) / (n - 1), y = v => pt + (H - pt - pb) * (1 - v / top);
    const grid = [0, .25, .5, .75, 1].map(f => { const yy = y(top * f).toFixed(1); return `<line class="gridline" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text class="axis" x="${pl - 8}" y="${yy}" text-anchor="end" dominant-baseline="middle">${esc(yFormat(top * f))}</text>`; }).join('');
    const step = Math.max(1, Math.ceil(n / 7));
    const xl = labels.map((l, i) => i % step === 0 || i === n - 1 ? `<text class="axis" x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '').join('');
    const lines = series.map((s, k) => {
      const pts = s.values.map((v, i) => v === null || v === undefined ? null : [x(i), y(v), v, i]).filter(Boolean);
      if (!pts.length) return '';
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
      const tone = s.tone || `c${(k % 6) + 1}`;
      const area = s.area ? `<path d="${d}L${pts[pts.length - 1][0].toFixed(1)},${H - pb}L${pts[0][0].toFixed(1)},${H - pb}Z" fill="var(--${tone})" opacity=".10"/>` : '';
      const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${n > 20 ? 7 : 9}" fill="transparent"><title>${esc(labels[p[3]])} · ${esc(s.name)}: ${esc(fmt(p[2]))}${esc(unit)}</title></circle>`).join('');
      const ring = hlIndex !== null && s.values[hlIndex] !== null && s.values[hlIndex] !== undefined && s.mark ? `<circle cx="${x(hlIndex).toFixed(1)}" cy="${y(s.values[hlIndex]).toFixed(1)}" r="5" fill="var(--${tone})" stroke="var(--panel)" stroke-width="2"/>` : '';
      return `${area}<path d="${d}" fill="none" stroke="var(--${tone})" stroke-width="${s.dash ? 1.6 : 2.4}" ${s.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round" stroke-linecap="round"/>${ring}${dots}`;
    }).join('');
    const legend = series.length > 1 ? `<ul class="legend-inline">${series.map((s, k) => `<li><span class="swatch ${s.dash ? 'dash' : ''}" style="background:var(--${s.tone || 'c' + ((k % 6) + 1)})"></span>${esc(s.name)}</li>`).join('')}</ul>` : '';
    return `<figure class="chart">${legend}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${grid}${lines}${xl}</svg></figure>`;
  }

  // Stacked columns (HTML). cols: [{label, parts:[{name, value}]}], names fix colour order.
  function stackedColumns(cols, names, { label = 'Stacked columns', height = 180, marker = null, markerLabel = '', unit = '' } = {}) {
    if (!cols.length) return '<p class="muted chart-empty">No data to chart.</p>';
    const tops = cols.map(c => c.parts.reduce((s, p) => s + (p.value || 0), 0));
    const top = niceCeil(Math.max(...tops, ...(marker ? marker.filter(v => v !== null) : []), 1));
    const body = cols.map((c, i) => {
      const segs = c.parts.map((p, k) => p.value ? `<i style="height:${(p.value / top * 100).toFixed(2)}%;background:${col(names.indexOf(p.name) >= 0 ? names.indexOf(p.name) : k)}" title="${esc(c.label)} · ${esc(p.name)}: ${esc(fmt(p.value))}${esc(unit)}"></i>` : '').join('');
      const m = marker && marker[i] !== null && marker[i] !== undefined ? `<b class="marker" style="bottom:${(marker[i] / top * 100).toFixed(2)}%" title="${esc(markerLabel)} ${esc(c.label)}: ${esc(fmt(marker[i]))}${esc(unit)}"></b>` : '';
      return `<div class="scol" style="--h:${height}px"><span class="scol-stack">${segs}${m}</span><span class="scol-label">${esc(c.label)}</span></div>`;
    }).join('');
    const legend = `<ul class="legend-inline">${names.map((n, k) => `<li><span class="swatch" style="background:${col(k)}"></span>${esc(n)}</li>`).join('')}${marker ? `<li><span class="swatch marker-sw"></span>${esc(markerLabel)}</li>` : ''}</ul>`;
    return `<figure class="chart">${legend}<div class="scols" role="img" aria-label="${esc(label)}">${body}</div></figure>`;
  }

  // Grouped horizontal comparison: rows [{label, a, b, aLabel, bLabel}] — a is "today", b is "usual".
  function compareBars(rows, { aName = 'Today', bName = 'Usual', unit = '' } = {}) {
    if (!rows.length) return '<p class="muted chart-empty">No data to chart.</p>';
    const top = Math.max(...rows.flatMap(r => [r.a, r.b]), 1);
    return `<ul class="legend-inline"><li><span class="swatch" style="background:var(--c1)"></span>${esc(aName)}</li><li><span class="swatch" style="background:var(--track-strong)"></span>${esc(bName)}</li></ul><ul class="cmp">${rows.map(r => `<li><span class="cmp-label">${esc(r.label)}</span><span class="cmp-bars"><span class="track"><i style="width:${(r.a / top * 100).toFixed(1)}%;background:var(--c1)"></i></span><span class="track"><i style="width:${(r.b / top * 100).toFixed(1)}%;background:var(--track-strong)"></i></span></span><span class="cmp-val"><b>${esc(fmt(r.a))}${esc(unit)}</b><small class="${r.a >= r.b * 1.25 ? 'warn-text' : 'muted'}">${r.b ? (r.a >= r.b ? '+' : '') + ((r.a / r.b - 1) * 100).toFixed(0) + '%' : '—'}</small></span></li>`).join('')}</ul>`;
  }

  // Heatmap grid. rows: [{label, cells:[{v, text?, title?}]}], colFn(value)->css colour; headers: column labels.
  function heatmap(rows, headers, colour, { label = 'Heatmap', cellW = 0, compact = false } = {}) {
    if (!rows.length) return '<p class="muted chart-empty">No data to chart.</p>';
    const cols = headers.length;
    return `<div class="heat ${compact ? 'compact' : ''}" role="table" aria-label="${esc(label)}" style="--cols:${cols}"><div class="heat-row heat-head" role="row"><span class="heat-label"></span>${headers.map(h => `<span role="columnheader">${esc(h)}</span>`).join('')}</div>${rows.map(r => `<div class="heat-row" role="row"><span class="heat-label" role="rowheader">${esc(r.label)}</span>${r.cells.map(c => `<span role="cell" class="heat-cell" style="background:${colour(c.v)}" title="${esc(c.title || '')}">${esc(c.text ?? '')}</span>`).join('')}</div>`).join('')}</div>`;
  }
  // Diverging colour: negative = warm, positive = cool, zero = neutral gray (computed via color-mix on tokens).
  function diverging(v, max = 6) {
    if (v === null || v === undefined || Number.isNaN(v)) return 'var(--track)';
    const t = Math.min(1, Math.abs(v) / max) * 100;
    return v < 0 ? `color-mix(in srgb, var(--bad) ${t.toFixed(0)}%, var(--neutral))` : `color-mix(in srgb, var(--c1) ${(t * 0.7).toFixed(0)}%, var(--neutral))`;
  }
  // Sequential score colour around a target (e.g. audit % vs target).
  function scoreColour(v, target = 90, span = 12) {
    if (v === null || v === undefined || Number.isNaN(v)) return 'var(--track)';
    const g = (v - target) / span; // negative below target
    return g < 0 ? `color-mix(in srgb, var(--bad) ${(Math.min(1, -g) * 85).toFixed(0)}%, var(--neutral))` : `color-mix(in srgb, var(--good) ${(Math.min(1, g) * 60 + 15).toFixed(0)}%, var(--neutral))`;
  }

  // Semi-circle gauge 0..100 with target tick.
  function gauge(value, { label = 'Score', target = null, tone = 'c1', text = null } = {}) {
    const p = Math.max(0, Math.min(100, value)), r = 15.9, len = Math.PI * r;
    const ang = (target === null ? null : Math.PI * (1 - target / 100));
    const tick = ang === null ? '' : `<line x1="${(21 + (r - 3.4) * Math.cos(ang)).toFixed(2)}" y1="${(21 - (r - 3.4) * Math.sin(ang)).toFixed(2)}" x2="${(21 + (r + 3.4) * Math.cos(ang)).toFixed(2)}" y2="${(21 - (r + 3.4) * Math.sin(ang)).toFixed(2)}" stroke="var(--axis)" stroke-width="1"/>`;
    return `<svg class="gauge" viewBox="0 0 42 26" role="img" aria-label="${esc(label)}: ${esc(text ?? fmt(value))}"><path d="M5.1 21 A15.9 15.9 0 0 1 36.9 21" fill="none" stroke="var(--track)" stroke-width="4.2" stroke-linecap="round"/><path d="M5.1 21 A15.9 15.9 0 0 1 36.9 21" fill="none" stroke="var(--${tone})" stroke-width="4.2" stroke-linecap="round" stroke-dasharray="${(len * p / 100).toFixed(2)} ${len.toFixed(2)}"/>${tick}<text x="21" y="20" text-anchor="middle" class="gauge-text">${esc(text ?? fmt(value))}</text></svg>`;
  }

  // Ranked horizontal bars with a target marker. items: [{label, value, sub?, tone?}]
  function rankBars(items, { max = null, target = null, unit = '%', min = 0 } = {}) {
    if (!items.length) return '<p class="muted chart-empty">No data to chart.</p>';
    const hi = max ?? Math.max(...items.map(i => i.value));
    const pctOf = v => Math.max(0, Math.min(100, (v - min) / ((hi - min) || 1) * 100));
    return `<ol class="rank">${items.map((it, i) => `<li><span class="rank-n">${i + 1}</span><span class="rank-label">${esc(it.label)}${it.sub ? `<small class="muted">${esc(it.sub)}</small>` : ''}</span><span class="track tall">${target !== null ? `<u style="left:${pctOf(target).toFixed(1)}%" title="Target ${esc(fmt(target))}${esc(unit)}"></u>` : ''}<i style="width:${pctOf(it.value).toFixed(1)}%;background:${it.tone ? `var(--${it.tone})` : 'var(--c1)'}"></i></span><b>${esc(fmt(it.value))}${esc(unit)}</b></li>`).join('')}</ol>`;
  }

  return { sparkline, multiLine, stackedColumns, compareBars, heatmap, diverging, scoreColour, gauge, rankBars };
});
