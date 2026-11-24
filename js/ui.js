// UI-Helfer: Ereignis-Delegation, Formular-Sheets, Bestätigungsdialoge, Hinweise, Icons.

import { esc } from './format.js';
import { save } from './store.js';

const handlers = { click: {}, input: {}, change: {} };
let renderer = null;

export function setRenderer(fn) {
  renderer = fn;
}

export function rerender() {
  renderer?.({ keepScroll: true });
}

// Speichert die Daten und zeichnet die aktuelle Ansicht neu.
export function commit() {
  save();
  rerender();
}

export function navigate(hash) {
  if (location.hash === hash) rerender();
  else location.hash = hash;
}

export function onAction(name, fn) {
  handlers.click[name] = fn;
}
export function onInput(name, fn) {
  handlers.input[name] = fn;
}
export function onChange(name, fn) {
  handlers.change[name] = fn;
}

export function installDelegation() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = handlers.click[el.dataset.action];
    if (fn) {
      e.preventDefault();
      fn(el, e);
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (el) handlers.input[el.dataset.input]?.(el, e);
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-change]');
    if (el) handlers.change[el.dataset.change]?.(el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('sheetRoot').classList.contains('open')) closeSheet();
  });
}

// ---------- Sheet (Formular-Dialog) ----------

let sheetCleanup = null;

export function openSheet({ title, body, submitLabel = 'Speichern', onSubmit, danger = false, focus = true }) {
  const root = document.getElementById('sheetRoot');
  const lastFocus = document.activeElement;
  root.innerHTML = `
    <div class="sheet-backdrop" data-sheet-close></div>
    <form class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" novalidate>
      <header class="sheet-head">
        <h2 id="sheetTitle">${esc(title)}</h2>
        <button type="button" class="icon-btn" data-sheet-close aria-label="Schließen">${icon('close')}</button>
      </header>
      <div class="sheet-body">${body}</div>
      <footer class="sheet-foot">
        <button type="button" class="btn ghost" data-sheet-close>Abbrechen</button>
        <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submitLabel)}</button>
      </footer>
    </form>`;
  root.classList.add('open');
  document.body.classList.add('no-scroll');
  const form = root.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = await onSubmit(form);
    if (result !== false) closeSheet();
  });
  root.querySelectorAll('[data-sheet-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  if (focus) form.querySelector('.sheet-body input:not([type=checkbox]):not([type=radio]), .sheet-body textarea, .sheet-body select')?.focus();
  sheetCleanup = () => lastFocus?.focus?.();
  return form;
}

export function closeSheet() {
  const root = document.getElementById('sheetRoot');
  root.classList.remove('open');
  root.innerHTML = '';
  document.body.classList.remove('no-scroll');
  sheetCleanup?.();
  sheetCleanup = null;
}

export function showFieldErrors(form, errors) {
  form.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = errors[el.dataset.errorFor] ?? '';
  });
  form.querySelectorAll('[name]').forEach((el) => el.classList.toggle('invalid', Boolean(errors[el.name])));
  const first = Object.keys(errors)[0];
  if (first) form.querySelector(`[name="${first}"]`)?.focus();
}

export function field({ label, name, value = '', type = 'text', placeholder = '', hint = '', attrs = '' }) {
  const input = type === 'textarea'
    ? `<textarea id="f-${name}" name="${name}" rows="3" placeholder="${esc(placeholder)}" ${attrs}>${esc(value)}</textarea>`
    : `<input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${attrs}>`;
  return `<label class="field" for="f-${name}"><span class="field-label">${esc(label)}</span>${input}
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}<span class="field-error" data-error-for="${name}"></span></label>`;
}

// ---------- Bestätigung ----------

export function confirmDialog(message, { title = 'Bitte bestätigen', confirmLabel = 'Löschen', danger = true } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `<p class="confirm-text">${message}</p>`,
      submitLabel: confirmLabel,
      danger,
      focus: false,
      onSubmit: () => {
        answered = true;
        resolve(true);
      },
    });
    const prev = sheetCleanup;
    sheetCleanup = () => {
      prev?.();
      if (!answered) resolve(false);
    };
    document.querySelector('#sheetRoot .sheet-foot .btn:last-child')?.focus();
  });
}

// ---------- Hinweis ----------

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- Icons (inline SVG, erben die Textfarbe) ----------

const PATHS = {
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  today: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  plan: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  skip: '<path d="M5 5l14 14"/><circle cx="12" cy="12" r="8"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  equal: '<path d="M6 9h12M6 15h12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  mixed: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? ''}</svg>`;
}

const TONE_ICON = { pos: 'arrowUp', neg: 'arrowDown', neutral: 'equal', info: 'info' };
const TONE_LABEL = { pos: 'Verbesserung', neg: 'Rückgang', neutral: 'Vergleich', info: 'Hinweis' };

// Feedback-Liste; Ton wird über Icon + verstecktes Label vermittelt, nie nur über Farbe.
export function feedbackList(msgs, { empty = 'Noch kein Feedback verfügbar.', linkExercises = true } = {}) {
  if (!msgs.length) return `<p class="muted">${esc(empty)}</p>`;
  return `<ul class="feedback">${msgs.map((m) => {
    const body = esc(m.text);
    const link = linkExercises && m.key ? ` <a class="fb-link" href="#/uebung/${encodeURIComponent(m.key)}">Verlauf</a>` : '';
    return `<li class="fb fb-${m.tone}">${icon(TONE_ICON[m.tone] ?? 'info')}<span><span class="sr-only">${TONE_LABEL[m.tone] ?? ''}: </span>${body}${link}</span></li>`;
  }).join('')}</ul>`;
}

const VERDICT_ICON = { besser: 'arrowUp', schlechter: 'arrowDown', gleich: 'equal', gemischt: 'mixed' };
const VERDICT_TEXT = { besser: 'besser', schlechter: 'schwächer', gleich: 'gleich', gemischt: 'gemischt' };

export function verdictBadge(verdict) {
  if (!verdict) return '<span class="badge">kein Vergleich</span>';
  return `<span class="verdict v-${verdict}">${icon(VERDICT_ICON[verdict])}${VERDICT_TEXT[verdict]}</span>`;
}

const TREND_ICON = { steigend: 'arrowUp', fallend: 'arrowDown', stabil: 'equal' };
export function trendBadge(trend) {
  if (trend.status !== 'ok') return '<span class="badge">zu wenig Daten</span>';
  const v = trend.dir === 'steigend' ? 'besser' : trend.dir === 'fallend' ? 'schlechter' : 'gleich';
  return `<span class="verdict v-${v}">${icon(TREND_ICON[trend.dir])}${trend.dir}</span>`;
}
