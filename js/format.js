// Formatierungs- und Parse-Helfer (deutsche Schreibweise, z. B. 62,5 kg).

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtNum(n, maxFrac = 2) {
  if (n == null || !Number.isFinite(n)) return '–';
  return n.toLocaleString('de-DE', { maximumFractionDigits: maxFrac });
}

// Akzeptiert "62,5" und "62.5". Leere Eingaben ergeben null.
export function parseNum(value) {
  if (value == null) return null;
  const s = String(value).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function fmtKg(n) {
  return `${fmtNum(n)} kg`;
}

// Vorzeichenbehaftete Differenz mit echtem Minuszeichen.
export function fmtDelta(n, unit = '', maxFrac = 1) {
  if (n == null || !Number.isFinite(n)) return '–';
  const r = Math.round(n * 10 ** maxFrac) / 10 ** maxFrac;
  if (r === 0) return `±0${unit}`;
  const sign = r > 0 ? '+' : '−';
  return `${sign}${fmtNum(Math.abs(r), maxFrac)}${unit}`;
}

export function plural(n, one, many) {
  return `${fmtNum(n)} ${n === 1 ? one : many}`;
}

export function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
}
