// Reine Datumsfunktionen auf Basis lokaler Kalendertage im Format YYYY-MM-DD.
// Wochen beginnen am Montag (Index 0 = Montag … 6 = Sonntag).

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const pad = (n) => String(n).padStart(2, '0');
const DAY_MS = 86400000;

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 12 Uhr mittags vermeidet Fehler bei Sommer-/Winterzeitumstellung.
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayISO(now = new Date()) {
  return toISO(now);
}

export function isValidISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / DAY_MS);
}

export function weekdayIndex(iso) {
  return (parseISO(iso).getDay() + 6) % 7;
}

export function startOfWeek(iso) {
  return addDays(iso, -weekdayIndex(iso));
}

export function isoWeek(iso) {
  const thursday = parseISO(addDays(iso, 3 - weekdayIndex(iso)));
  const yearStart = new Date(thursday.getFullYear(), 0, 1, 12);
  return { year: thursday.getFullYear(), week: Math.floor(Math.round((thursday - yearStart) / DAY_MS) / 7) + 1 };
}

export function monthKey(iso) {
  return iso.slice(0, 7);
}

export function monthStart(mk) {
  return `${mk}-01`;
}

export function daysInMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthEnd(mk) {
  return `${mk}-${pad(daysInMonth(mk))}`;
}

export function addMonths(mk, n) {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthLabel(mk) {
  const [y, m] = mk.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function eachDay(start, end) {
  const out = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

export function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function fmtDateShort(iso) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}.`;
}

export function fmtDateLong(iso) {
  return `${WEEKDAYS_LONG[weekdayIndex(iso)]}, ${fmtDate(iso)}`;
}

export function weekLabel(weekStart) {
  const { week } = isoWeek(weekStart);
  return `KW ${week} · ${fmtDateShort(weekStart)}–${fmtDate(addDays(weekStart, 6))}`;
}

// Zeitspanne in Tagen als Text: "5 Tage", "3 Wochen", "4 Monate", "1 Jahr".
export function durationLabel(days, dative = false) {
  const d = Math.abs(days);
  const n = dative ? 'n' : '';
  if (d === 1) return '1 Tag';
  if (d < 14) return `${d} Tage${n}`;
  if (d < 63) return `${Math.round(d / 7)} Wochen`;
  const months = Math.round(d / 30.44);
  if (months < 12) return `${months} Monate${n}`;
  const years = Math.round(d / 365.25);
  return years <= 1 ? (dative ? 'einem Jahr' : '1 Jahr') : `${years} Jahre${n}`;
}

// Beschreibt, wie weit `iso` vor (oder nach) dem Bezugstag `ref` liegt.
export function relativeLabel(iso, ref) {
  const d = daysBetween(iso, ref);
  if (d === 0) return 'heute';
  if (d === 1) return 'gestern';
  if (d === -1) return 'morgen';
  if (d < 0) return `in ${durationLabel(d, true)}`;
  return d === 1 ? 'vor einem Tag' : `vor ${durationLabel(d, true)}`;
}
