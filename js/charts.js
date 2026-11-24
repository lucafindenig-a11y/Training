// Schlanke SVG-Diagramme ohne Bibliothek. Diagramme werden erst nach dem Einfügen in die Seite
// in der tatsächlichen Breite gezeichnet, damit Beschriftungen auf dem Handy lesbar bleiben.
// Jedes Diagramm hat Tooltips per Hover/Tippen; die Werte stehen zusätzlich in Tabellen.

import { esc, fmtNum } from './format.js';

const specs = new Map();
let counter = 0;

export function resetCharts() {
  specs.clear();
}

export function chartSlot(spec) {
  const id = `c${++counter}`;
  specs.set(id, spec);
  return `<div class="chart" data-chart-id="${id}" role="img" aria-label="${esc(spec.ariaLabel ?? '')}"></div>`;
}

export function mountCharts(root) {
  root.querySelectorAll('.chart[data-chart-id]').forEach((el) => draw(el));
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => document.querySelectorAll('.chart[data-chart-id]').forEach((el) => draw(el)), 150);
});

function draw(el) {
  const spec = specs.get(el.dataset.chartId);
  if (!spec) return;
  const width = Math.max(260, Math.floor(el.clientWidth));
  const built = spec.type === 'columns' ? columns(spec, width) : line(spec, width);
  el.innerHTML = `${built.svg}<div class="chart-tip" hidden></div>`;
  attachHover(el, built.hits, built.onFocus);
}

// ---------- Achsen-Helfer ----------

function niceStep(range, count) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

function scaleTicks(min, max, count, integer) {
  if (max - min < 1e-9) {
    max = min + (integer ? 1 : Math.max(1, Math.abs(min) * 0.1));
  }
  let step = niceStep(max - min, count);
  if (integer) step = Math.max(1, Math.round(step));
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

function fmtTick(v) {
  return Math.abs(v) >= 10000 ? `${fmtNum(v / 1000, 1)}K` : fmtNum(v, 1);
}

function roundedTop(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  if (h <= 0) return '';
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

// ---------- Säulendiagramm (z. B. Einheiten pro Woche) ----------
// spec: { type:'columns', items:[{ label, value, ref?, tip }], integer, refLabel, valueLabel }

function columns(spec, W) {
  const H = 190;
  const pad = { l: 30, r: 8, t: 14, b: 24 };
  const items = spec.items;
  const n = items.length;
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const maxVal = Math.max(1, ...items.map((d) => Math.max(d.value, d.ref ?? 0)));
  const { hi, ticks } = scaleTicks(0, maxVal, 3, spec.integer);
  const y = (v) => pad.t + ph - (v / hi) * ph;
  const band = pw / Math.max(n, 1);
  const barW = Math.max(2, Math.min(24, band - 2));
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));

  let g = '';
  for (const t of ticks) {
    g += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`;
    g += `<text class="tick" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`;
  }
  const hits = [];
  items.forEach((d, i) => {
    const cx = pad.l + band * i + band / 2;
    const x = cx - barW / 2;
    if (d.value > 0) g += `<path class="bar" data-i="${i}" d="${roundedTop(x, y(d.value), barW, y(0) - y(d.value), 4)}"/>`;
    if (d.ref != null && d.ref > 0) {
      const rw = Math.max(4, Math.min(barW + 6, band - 5));
      g += `<line class="ref" x1="${cx - rw / 2}" x2="${cx + rw / 2}" y1="${y(d.ref)}" y2="${y(d.ref)}"/>`;
    }
    if (i % labelEvery === 0 || i === n - 1) {
      if (i === n - 1 || n - 1 - i >= labelEvery / 2) g += `<text class="tick" x="${cx}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
    }
    hits.push({ x: pad.l + band * i, w: band, cx, cy: y(Math.max(d.value, d.ref ?? 0)), tip: d.tip });
  });
  g += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>`;
  g += hits.map((h, i) => `<rect class="hit" data-i="${i}" x="${h.x}" y="${pad.t}" width="${h.w}" height="${ph}"/>`).join('');
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${g}</svg>`;
  return { svg, hits };
}

// ---------- Liniendiagramm (z. B. Verlauf einer Übung) ----------
// spec: { type:'line', points:[{ x: Tagesindex, value, label, tip }], unit, integer }

function line(spec, W) {
  const H = 210;
  const pts = spec.points;
  const unit = spec.unit ?? '';
  const endLabel = pts.length ? `${fmtNum(pts[pts.length - 1].value, 1)}${unit}` : '';
  const pad = { l: 34, r: Math.max(16, endLabel.length * 6.5 + 10), t: 14, b: 24 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;
  const vals = pts.map((p) => p.value);
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const spread = vMax - vMin;
  const { lo, hi, ticks } = scaleTicks(spec.zeroBased ? 0 : Math.max(0, vMin - spread * 0.15), vMax + spread * 0.1, 4, spec.integer);
  const xMin = pts[0].x;
  const xMax = pts[pts.length - 1].x;
  const x = (v) => (xMax === xMin ? pad.l + pw / 2 : pad.l + ((v - xMin) / (xMax - xMin)) * pw);
  const y = (v) => pad.t + ph - ((v - lo) / (hi - lo)) * ph;

  let g = '';
  for (const t of ticks) {
    g += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/>`;
    g += `<text class="tick" x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmtTick(t)}</text>`;
  }
  g += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(lo)}" y2="${y(lo)}"/>`;
  // x-Beschriftung: erster, letzter und gleichmäßig verteilte Punkte ohne Überlappung
  const maxLabels = Math.max(2, Math.floor(pw / 64));
  const step = Math.max(1, Math.ceil(pts.length / maxLabels));
  let lastX = -Infinity;
  pts.forEach((p, i) => {
    const px = x(p.x);
    const isEnd = i === pts.length - 1;
    if ((i % step === 0 || isEnd) && px - lastX >= 56) {
      if (isEnd || x(pts[pts.length - 1].x) - px >= 56) {
        g += `<text class="tick" x="${px}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>`;
        lastX = px;
      }
    }
  });
  if (pts.length > 1) {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    g += `<path class="area" d="${d}L${x(xMax)},${y(lo)}L${x(xMin)},${y(lo)}Z"/>`;
    g += `<path class="line" d="${d}"/>`;
  }
  const hits = pts.map((p) => ({ cx: x(p.x), cy: y(p.value), tip: p.tip }));
  g += hits.map((h, i) => `<circle class="dot" data-i="${i}" cx="${h.cx}" cy="${h.cy}" r="4"/>`).join('');
  const last = hits[hits.length - 1];
  g += `<text class="end-label" x="${last.cx + 9}" y="${last.cy + 4}">${esc(endLabel)}</text>`;
  g += `<circle class="dot-active" r="6" visibility="hidden"/>`;
  // Trefferflächen: jeweils der halbe Abstand zum Nachbarpunkt
  hits.forEach((h, i) => {
    const left = i === 0 ? pad.l : (hits[i - 1].cx + h.cx) / 2;
    const right = i === hits.length - 1 ? W - pad.r + 8 : (h.cx + hits[i + 1].cx) / 2;
    h.x = left;
    h.w = Math.max(6, right - left);
  });
  g += hits.map((h, i) => `<rect class="hit" data-i="${i}" x="${h.x}" y="${pad.t}" width="${h.w}" height="${ph}"/>`).join('');
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line class="crosshair" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ph}" visibility="hidden"/>${g}</svg>`;
  return { svg, hits };
}

// ---------- Tooltip ----------

function attachHover(el, hits) {
  const tip = el.querySelector('.chart-tip');
  const svg = el.querySelector('svg');
  const cross = svg.querySelector('.crosshair');
  const active = svg.querySelector('.dot-active');
  const show = (i) => {
    const h = hits[i];
    if (!h) return;
    tip.innerHTML = h.tip;
    tip.hidden = false;
    const tw = tip.offsetWidth;
    const left = Math.min(Math.max(4, h.cx - tw / 2), el.clientWidth - tw - 4);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, h.cy - tip.offsetHeight - 12)}px`;
    svg.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
    svg.querySelectorAll(`.bar[data-i="${i}"]`).forEach((n) => n.classList.add('is-active'));
    if (cross) {
      cross.setAttribute('x1', h.cx);
      cross.setAttribute('x2', h.cx);
      cross.setAttribute('visibility', 'visible');
    }
    if (active) {
      active.setAttribute('cx', h.cx);
      active.setAttribute('cy', h.cy);
      active.setAttribute('visibility', 'visible');
    }
  };
  const hide = () => {
    tip.hidden = true;
    cross?.setAttribute('visibility', 'hidden');
    active?.setAttribute('visibility', 'hidden');
    svg.querySelectorAll('.is-active').forEach((n) => n.classList.remove('is-active'));
  };
  svg.addEventListener('pointermove', (e) => {
    const t = e.target.closest('.hit');
    if (t) show(Number(t.dataset.i));
  });
  svg.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.hit');
    if (t) show(Number(t.dataset.i));
  });
  svg.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') hide();
  });
  // Tastatur: Pfeiltasten wandern durch die Datenpunkte
  el._show = show;
  el._hide = hide;
  el._count = hits.length;
  if (el.dataset.bound) return;
  el.dataset.bound = '1';
  el.tabIndex = 0;
  let cur = -1;
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      cur = Math.min(el._count - 1, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1)));
      el._show(cur);
    } else if (e.key === 'Escape') el._hide();
  });
  el.addEventListener('blur', () => el._hide());
}
