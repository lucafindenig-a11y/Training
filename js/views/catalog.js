// Übungskatalog: Suche & Filter, Detailseite mit Anleitung, Quellenübersicht und Auswahl-Panel.

import { store } from '../store.js';
import { fmtDate, relativeLabel, todayISO } from '../dates.js';
import { esc, plural } from '../format.js';
import { fmtRepsTarget } from '../model.js';
import { buildExerciseIndex, indexKey } from '../analytics.js';
import {
  EXERCISES, MUSCLES, TYPES, EQUIPMENT, LEVELS, FOCUS, SOURCES, SOURCES_CHECKED, getExercise, filterExercises, fold,
} from '../catalog.js';
import { onAction, openSheet, icon } from '../ui.js';
import { catalogIcon, musclesText, levelText, entryFeatures, exerciseInfoHtml, emptyState, unitShort, focusLabel } from './common.js';
import { openAddToPlan } from './exercise-form.js';

const FOCUS_CHIPS = ['push', 'pull', 'beine', 'core', 'ganzkoerper', 'cardio', 'mobility'];

const browse = { q: '', focus: '', muscle: '', type: '', equipment: '', level: '' };

function selectPill(name, label, options, value) {
  return `<label class="select-pill"><span class="sr-only">${esc(label)}</span>
    <select data-filter="${name}" class="${value ? 'active' : ''}">
      <option value="">${esc(label)}</option>
      ${Object.entries(options).map(([k, v]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select></label>`;
}

function controlsHtml(state, { focusToggle = null } = {}) {
  return `
    <div class="search">
      <input type="search" data-search value="${esc(state.q)}" placeholder="Übung, Muskel oder Equipment" aria-label="Übungen durchsuchen" autocomplete="off">
      <span class="icon-btn" aria-hidden="true">${icon('search')}</span>
    </div>
    ${focusToggle ?? `<div class="chips" role="group" aria-label="Schwerpunkt">
      <button type="button" class="chip ${state.focus ? '' : 'on'}" data-focus="" aria-pressed="${!state.focus}">Alle</button>
      ${FOCUS_CHIPS.map((f) => `<button type="button" class="chip ${state.focus === f ? 'on' : ''}" data-focus="${f}" aria-pressed="${state.focus === f}">${esc(FOCUS[f].label)}</button>`).join('')}
    </div>`}
    <div class="filters">
      ${selectPill('muscle', 'Muskelgruppe', MUSCLES, state.muscle)}
      ${selectPill('type', 'Trainingsart', TYPES, state.type)}
      ${selectPill('equipment', 'Equipment', EQUIPMENT, state.equipment)}
      ${selectPill('level', 'Level', LEVELS, state.level)}
    </div>`;
}

function itemHtml(e, { mode, canAdd }) {
  const level = e.level ? `<span class="badge">${esc(LEVELS[e.level])}</span>` : '';
  const equip = e.equipment.includes('keins') ? '<span class="badge">Ohne Equipment</span>' : `<span class="badge">${esc(EQUIPMENT[e.equipment[0]])}</span>`;
  const body = `<strong>${esc(e.name)}</strong><span class="small">${esc(musclesText(e))}</span><span class="badge-row">${level}${equip}</span>`;
  if (mode === 'pick') {
    return `<li class="card cat-item">${catalogIcon(e)}
      <button type="button" class="cat-main" data-pick="${e.id}" style="background:none;border:none;padding:0;text-align:left;cursor:pointer">${body}</button>
      <button type="button" class="icon-btn dark" data-pick="${e.id}" aria-label="${esc(e.name)} auswählen">${icon('plus')}</button></li>`;
  }
  return `<li class="card cat-item">${catalogIcon(e)}
    <a class="cat-main" href="#/katalog/${e.id}">${body}</a>
    ${canAdd ? `<button type="button" class="icon-btn dark" data-action="cat-add" data-id="${e.id}" aria-label="${esc(e.name)} zum Plan hinzufügen">${icon('plus')}</button>` : ''}</li>`;
}

function resultsHtml(list, opts) {
  if (!list.length) return '<li><p class="muted center">Keine Übung passt zu Suche und Filtern.</p></li>';
  return list.map((e) => itemHtml(e, opts)).join('');
}

// Steuerelemente verdrahten; aktualisiert nur die Ergebnisliste (Eingabefokus bleibt erhalten).
function bindControls(root, state, getList, opts) {
  const results = root.querySelector('[data-results]');
  const count = root.querySelector('[data-count]');
  const update = () => {
    const list = getList();
    results.innerHTML = resultsHtml(list, opts);
    count.textContent = `${plural(list.length, 'Übung', 'Übungen')}`;
  };
  root.querySelector('[data-search]')?.addEventListener('input', (e) => {
    state.q = e.target.value;
    update();
  });
  root.querySelectorAll('[data-filter]').forEach((sel) => sel.addEventListener('change', () => {
    state[sel.dataset.filter] = sel.value;
    sel.classList.toggle('active', Boolean(sel.value));
    update();
  }));
  root.querySelectorAll('[data-focus]').forEach((chip) => chip.addEventListener('click', () => {
    state.focus = chip.dataset.focus;
    root.querySelectorAll('[data-focus]').forEach((c) => {
      const on = c.dataset.focus === state.focus;
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    update();
  }));
  update();
  return update;
}

// ---------- Katalog-Seite ----------

export function catalogView() {
  const canAdd = Boolean(store.data.plan?.days.length);
  return {
    title: 'Übungen', tab: 'katalog',
    html: `
      <p class="page-intro">${EXERCISES.length} Übungen mit Anleitung und Quelle. Tippe auf eine Übung für Details${canAdd ? ' oder auf ＋, um sie deinem Plan hinzuzufügen' : ''}.</p>
      ${controlsHtml(browse)}
      <p class="result-count" data-count></p>
      <ul class="list" data-results></ul>
      <p class="small center"><a href="#/quellen">${icon('book')} Quellen & Hinweise zu den Beschreibungen</a></p>`,
    mount: (root) => bindControls(root, browse, () => filterExercises({ ...browse, focus: browse.focus ? [browse.focus] : [] }), { mode: 'browse', canAdd }),
  };
}

onAction('cat-add', (el) => {
  const entry = getExercise(el.dataset.id);
  if (entry) openAddToPlan(entry);
});

// ---------- Detailseite ----------

export function catalogDetailView([id]) {
  const entry = getExercise(id);
  if (!entry) return { redirect: '#/katalog' };
  const index = buildExerciseIndex(store.data);
  const rec = index.get(indexKey(entry.name, entry.unit))
    ?? [...index.values()].find((r) => r.catalogId === entry.id || fold(r.name) === fold(entry.name) || entry.aliases.some((a) => fold(a) === fold(r.name)));
  const last = rec?.entries[rec.entries.length - 1];
  const canAdd = Boolean(store.data.plan?.days.length);
  const def = entry.defaults;
  return {
    title: entry.name, tab: 'katalog', back: '#/katalog',
    html: `
      <section class="detail-head">
        <span class="eyebrow">${esc(entry.types.map((t) => TYPES[t]).join(' & '))}${entry.splits.length ? ` · passt zu ${esc(focusLabel(entry.splits.filter((s) => FOCUS[s])))}` : ''}</span>
        <h2>${esc(entry.name)}</h2>
        <p class="meta-row">${icon('target')}<span>${esc(musclesText(entry))}</span></p>
      </section>
      ${entryFeatures(entry)}
      ${rec ? `<a class="card" href="#/uebung/${encodeURIComponent(rec.key)}" style="margin-top:14px">
          <span class="eyebrow">Deine Daten</span>
          <strong>${plural(rec.entries.length, 'Einheit', 'Einheiten')} erfasst</strong>
          <span class="small muted block">Zuletzt am ${fmtDate(last.date)} (${relativeLabel(last.date, todayISO())}) · Verlauf und Vergleiche ansehen</span></a>` : '<div style="height:14px"></div>'}
      ${exerciseInfoHtml(entry)}
      <div class="action-bar">
        <div class="ab-info"><strong>${def.sets} × ${esc(fmtRepsTarget(def.reps))}${entry.unit === 'wdh' ? '' : ` ${unitShort(entry.unit)}`}</strong><span>Startwert (Vorschlag)</span></div>
        ${canAdd ? `<button class="btn primary" data-action="cat-add" data-id="${entry.id}">Zum Plan</button>` : '<a class="btn primary" href="#/vorlagen">Plan anlegen</a>'}
      </div>`,
  };
}

// ---------- Quellen ----------

export function sourcesView() {
  const bySource = new Map();
  for (const e of EXERCISES) {
    const k = e.source.key;
    if (!bySource.has(k)) bySource.set(k, []);
    bySource.get(k).push(e);
  }
  return {
    title: 'Quellen', tab: 'katalog', back: '#/katalog',
    html: `
      <section class="card">
        <h2>Woher die Übungsinfos stammen</h2>
        <p>Die Anleitungen im Katalog sind eigene, gekürzte deutsche Zusammenfassungen öffentlich zugänglicher Quellen. Jede Übung verlinkt die Seite, auf der sie beruht. Abgerufen am ${fmtDate(SOURCES_CHECKED)}.</p>
        <ul class="icon-list good">
          <li>${icon('check')}<span><strong>Aus der Quelle:</strong> Ausgangsposition, Schritte, Hinweise, Varianten, beanspruchte Bereiche, Equipment und Level (ACE: Beginner/Intermediate/Advanced → Einsteiger/Fortgeschritten/Erfahren).</span></li>
          <li>${icon('check')}<span><strong>Abgeleitet:</strong> Wo eine Quelle keine Fehlerliste hat, sind „Typische Fehler“ aus ihren Ausführungshinweisen abgeleitet und so gekennzeichnet. „Arme“ ist bei Druckübungen als Trizeps, bei Zugübungen als Bizeps eingeordnet.</span></li>
          <li>${icon('check')}<span><strong>Redaktionell:</strong> Die Zuordnung zu Push, Pull, Beine usw. sowie Startwerte für Sätze, Wiederholungen und Pausen sind Vorschläge zum Einordnen – keine Angaben der Quellen.</span></li>
        </ul>
        <p class="small muted">Übungen, für die keine Quelle abrufbar war, sind bewusst nicht im Katalog. Eigene Übungen kannst du jederzeit selbst anlegen. Die Beschreibungen ersetzen keine persönliche Anleitung.</p>
      </section>
      ${[...bySource.entries()].map(([k, list]) => `
        <section class="card">
          <h2>${esc(SOURCES[k].name)}</h2>
          <p><a href="${esc(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer">${esc(SOURCES[k].url)} ${icon('external')}</a></p>
          <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Übung</th><th scope="col">Quellseite</th></tr></thead><tbody>
            ${list.map((e) => `<tr><th scope="row"><a href="#/katalog/${e.id}">${esc(e.name)}</a></th><td><a href="${esc(e.source.url)}" target="_blank" rel="noopener noreferrer">${esc(e.source.title)}</a></td></tr>`).join('')}
          </tbody></table></div>
        </section>`).join('')}`,
  };
}

// ---------- Auswahl-Panel (Plan & Training) ----------
// focus: Schwerpunkt des Tages → standardmäßig nur passende Übungen; „Alle Übungen“ öffnet den ganzen Katalog.

export function openCatalogPicker({ title = 'Übung auswählen', focus = [], onPick, onCustom }) {
  const state = { q: '', focus: '', muscle: '', type: '', equipment: '', level: '', onlyFocus: focus.length > 0 };
  const label = focusLabel(focus);
  const toggle = focus.length
    ? `<div class="chips" role="group" aria-label="Auswahl">
        <button type="button" class="chip on" data-only="1" aria-pressed="true">${icon('target')}Passend zu ${esc(label)}</button>
        <button type="button" class="chip" data-only="0" aria-pressed="false">Alle Übungen</button>
      </div>`
    : null;
  openSheet({
    title,
    footer: false,
    tall: true,
    focus: false,
    body: `
      <button type="button" class="btn ghost wide" data-custom>${icon('edit')}Eigene Übung anlegen</button>
      <div style="height:12px"></div>
      ${controlsHtml(state, { focusToggle: toggle })}
      <p class="result-count" data-count></p>
      <ul class="list" data-results></ul>`,
    onMount: (form) => {
      const getList = () => filterExercises({ ...state, focus: state.onlyFocus ? focus : [] });
      const update = bindControls(form, state, getList, { mode: 'pick' });
      form.querySelectorAll('[data-only]').forEach((b) => b.addEventListener('click', () => {
        state.onlyFocus = b.dataset.only === '1';
        form.querySelectorAll('[data-only]').forEach((x) => {
          const on = x === b;
          x.classList.toggle('on', on);
          x.setAttribute('aria-pressed', String(on));
        });
        update();
      }));
      form.querySelector('[data-results]').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-pick]');
        if (!btn) return;
        const entry = getExercise(btn.dataset.pick);
        if (entry) onPick(entry);
      });
      form.querySelector('[data-custom]').addEventListener('click', () => onCustom());
    },
  });
}
