// Gemeinsame Bausteine mehrerer Ansichten.

import { store } from '../store.js';
import { todayISO, isValidISO, fmtDate, WEEKDAYS_SHORT, weekdayIndex, durationLabel } from '../dates.js';
import { esc, fmtNum, plural } from '../format.js';
import { activeSession, createSession, createPlan, fmtRepsTarget, plannedOn, sessionTotals, unitOf, UNITS } from '../model.js';
import { buildExerciseIndex, describeSets, describeDiff, indexKey } from '../analytics.js';
import { MUSCLES, EQUIPMENT, TYPES, LEVELS, FOCUS, SOURCES, catalogFor, inferFocus } from '../catalog.js';
import { openSheet, commit, navigate, confirmDialog, field, showFieldErrors, icon, verdictBadge } from '../ui.js';

export function fmtRest(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
}

export function unitShort(unit) {
  return UNITS[unit]?.short ?? 'Wdh.';
}

// "3 × 8–12 · 60 kg · Pause 1:30 min" bzw. "3 × 30–45 s"
export function targetText(t) {
  if (!t) return '';
  const unit = unitOf(t);
  const parts = [`${t.sets} × ${fmtRepsTarget(t.reps)}${unit === 'wdh' ? '' : ` ${unitShort(unit)}`}`];
  if (t.weight != null) parts.push(`${fmtNum(t.weight)} kg`);
  if (t.rest) parts.push(`Pause ${fmtRest(t.rest)}`);
  return parts.join(' · ');
}

export function weekdaysText(list) {
  return list?.length ? list.map((d) => WEEKDAYS_SHORT[d]).join(', ') : 'ohne festen Wochentag';
}

export function dayFocus(day) {
  return day?.focus?.length ? day.focus : inferFocus(day?.name ?? '');
}

export function focusBadges(focus) {
  return (focus ?? []).filter((f) => FOCUS[f]).map((f) => `<span class="badge lav">${esc(FOCUS[f].label)}</span>`).join('');
}

export function focusLabel(focus) {
  return (focus ?? []).filter((f) => FOCUS[f]).map((f) => FOCUS[f].label).join(' / ');
}

export function featurePanel(items) {
  return `<div class="features">${items.map(([ic, value, label]) => `
    <div class="feat">${icon(ic)}<strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join('')}</div>`;
}

export function sessionSummary(s) {
  const t = sessionTotals(s);
  const parts = [`${t.performed} ${t.performed === 1 ? 'Übung' : 'Übungen'}`, plural(t.sets, 'Satz', 'Sätze')];
  if (t.volume > 0) parts.push(`${fmtNum(t.volume, 0)} kg Volumen`);
  if (t.seconds > 0) parts.push(fmtSeconds(t.seconds));
  if (t.skipped) parts.push(`${t.skipped} ausgelassen`);
  return parts.join(' · ');
}

export function fmtSeconds(sec) {
  if (sec < 60) return `${sec} s`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} Min.` : `${Math.floor(m / 60)} Std. ${m % 60} Min.`;
}

export function emptyState(title, text, actions = '') {
  return `<section class="empty"><h2>${esc(title)}</h2><p>${text}</p>${actions}</section>`;
}

// Zuletzt absolvierte Sätze je Übung (für Vorschlagswerte beim Start).
export function lastSetsLookup(data = store.data) {
  const index = buildExerciseIndex(data);
  return (name, unit = 'wdh') => {
    const rec = index.get(indexKey(name, unit));
    return rec ? rec.entries[rec.entries.length - 1].sets : null;
  };
}

export async function startTraining({ dayId = null, date = todayISO() } = {}) {
  const data = store.data;
  const running = activeSession(data);
  if (running) {
    const go = await confirmDialog(`Es läuft bereits ein Training („${esc(running.title)}“ vom ${fmtDate(running.date)}). Schließe es zuerst ab oder verwirf es.`, {
      title: 'Training läuft bereits', confirmLabel: 'Zum laufenden Training', danger: false,
    });
    if (go) navigate(`#/training/${running.id}`);
    return;
  }
  const session = createSession(data, { dayId, date, lastSetsFor: lastSetsLookup(data) });
  commit();
  navigate(`#/training/${session.id}`);
}

export function openStartSheet({ dayId = null, date = todayISO() } = {}) {
  const days = store.data.plan?.days ?? [];
  const planned = new Set(plannedOn(store.data, date).map((p) => p.dayId));
  const preset = dayId ?? [...planned][0] ?? (days[0]?.id || '');
  const options = days.map((d) => `
    <label class="choice">
      <input type="radio" name="dayId" value="${d.id}" ${d.id === preset ? 'checked' : ''}>
      <span><strong>${esc(d.name)}</strong><small>${plural(d.exercises.length, 'Übung', 'Übungen')} · ${esc(weekdaysText(d.weekdays))}</small></span>
    </label>`).join('');
  openSheet({
    title: 'Training starten',
    submitLabel: 'Starten',
    focus: false,
    body: `
      ${field({ label: 'Datum', name: 'date', type: 'date', value: date, hint: 'Für vergangene Tage kannst du ein Training nachtragen.' })}
      <fieldset class="choices"><legend class="field-label">Trainingstag</legend>
        ${options}
        <label class="choice">
          <input type="radio" name="dayId" value="" ${preset === '' ? 'checked' : ''}>
          <span><strong>Freies Training</strong><small>Ohne Vorlage – Übungen fügst du selbst hinzu.</small></span>
        </label>
      </fieldset>`,
    onSubmit: (form) => {
      const d = form.elements.date.value;
      if (!isValidISO(d)) {
        showFieldErrors(form, { date: 'Bitte ein gültiges Datum wählen.' });
        return false;
      }
      if (d > todayISO()) {
        showFieldErrors(form, { date: 'Trainings in der Zukunft können nicht erfasst werden.' });
        return false;
      }
      const chosen = form.querySelector('input[name=dayId]:checked')?.value || null;
      setTimeout(() => startTraining({ dayId: chosen, date: d }), 0);
    },
  });
}

export function openCreatePlanSheet() {
  openSheet({
    title: 'Eigenen Plan anlegen',
    submitLabel: 'Plan anlegen',
    body: `${field({ label: 'Name des Plans', name: 'name', placeholder: 'z. B. Mein Ganzkörperplan', attrs: 'maxlength="60" autocomplete="off"' })}
      <p class="muted small">Danach legst du Trainingstage, Wochentage und Übungen selbst fest. Bereits erfasste Trainings bleiben unverändert.</p>`,
    onSubmit: (form) => {
      createPlan(store.data, form.elements.name.value, todayISO());
      commit();
      navigate('#/plan');
    },
  });
}

export function weekdayOf(iso) {
  return WEEKDAYS_SHORT[weekdayIndex(iso)];
}

// Tabelle: aktuelle Leistung vs. letzte Einheit, mind. 3 Wochen / 2½ Monate davor, erste Einheit, Bestleistung.
export function refsTable(an, { caption = '' } = {}) {
  if (!an.refs.length) return '<p class="small muted">Noch keine früheren Einträge zum Vergleich.</p>';
  const rows = an.refs.map((r) => `
    <tr>
      <th scope="row">${esc(r.label)}</th>
      <td>${fmtDate(r.entry.date)}<span class="small muted block">${esc(gapText(r.gap))}</span></td>
      <td>${esc(describeSets(r.entry))}</td>
      <td>${verdictBadge(r.cmp.verdict)}<span class="small muted block">${esc(describeDiff(r.cmp))}</span></td>
    </tr>`).join('');
  return `<div class="table-wrap"><table class="table">
    ${caption ? `<caption>${esc(caption)}</caption>` : ''}
    <thead><tr><th scope="col">Vergleich mit</th><th scope="col">Datum</th><th scope="col">Damals</th><th scope="col">Aktuell (${fmtDate(an.latest.date)}: ${esc(describeSets(an.latest))})</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

function gapText(days) {
  if (days === 0) return 'am selben Tag';
  return `${durationLabel(days)} davor`;
}

// ---------- Katalog-Darstellung ----------

export const TYPE_ICON = { kraft: 'dumbbell', cardio: 'heart', mobility: 'stretch' };

export function catalogIcon(entry) {
  const t = entry.types[0];
  return `<span class="cat-ico t-${t}">${icon(TYPE_ICON[t] ?? 'dumbbell')}</span>`;
}

export function musclesText(entry) {
  return entry.muscles.map((m) => MUSCLES[m]).join(', ');
}

export function equipmentText(entry) {
  return entry.equipment.map((x) => EQUIPMENT[x]).join(', ');
}

export function levelText(entry) {
  return entry.level ? LEVELS[entry.level] : 'keine Angabe';
}

export function entryFeatures(entry) {
  return featurePanel([
    ['target', levelText(entry), 'Level'],
    [TYPE_ICON[entry.types[0]] ?? 'dumbbell', entry.types.map((t) => TYPES[t]).join(' & '), 'Trainingsart'],
    ['dumbbell', entry.equipment.includes('keins') ? 'Keins' : equipmentText(entry), 'Equipment'],
  ]);
}

// Beschreibung einer Katalogübung: Ausgangsposition, Schritte, Hinweise, Fehler, Varianten, Quelle.
export function exerciseInfoHtml(entry, { compact = false } = {}) {
  const list = (items, cls, ic) => `<ul class="icon-list ${cls}">${items.map((t) => `<li>${icon(ic)}<span>${esc(t)}</span></li>`).join('')}</ul>`;
  const related = entry.related.map((id) => catalogFor({ catalogId: id })).filter(Boolean);
  const src = entry.source;
  return `
    <section class="${compact ? '' : 'card'}">
      <h3>Ausgangsposition</h3>
      <p>${esc(entry.start)}</p>
    </section>
    <section class="${compact ? '' : 'card'}">
      <h3>Ausführung</h3>
      <ol class="steps-list">${entry.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
    </section>
    ${entry.cues.length ? `<section class="${compact ? '' : 'card'}"><h3>Wichtige Hinweise</h3>${list(entry.cues, 'good', 'check')}</section>` : ''}
    <section class="${compact ? '' : 'card'}">
      <h3>Typische Fehler</h3>
      ${entry.mistakes.length ? list(entry.mistakes, 'bad', 'x') : '<p class="muted small">Die Quelle nennt für diese Übung keine typischen Fehler.</p>'}
      ${entry.mistakes.length && entry.mistakesDerived ? '<p class="derived-note">Aus den Ausführungshinweisen der Quelle abgeleitet (die Quelle nennt keine eigene Fehlerliste).</p>' : ''}
    </section>
    ${entry.variations.length || related.length ? `<section class="${compact ? '' : 'card'}">
      <h3>Varianten</h3>
      ${entry.variations.length ? list(entry.variations, 'lav', 'sparkle') : '<p class="muted small">Die Quelle nennt keine Varianten.</p>'}
      ${related.length ? `<p class="small muted" style="margin-top:12px">Verwandte Übungen im Katalog:</p><div class="badge-row">${related.map((r) => `<a class="chip small" href="#/katalog/${r.id}">${esc(r.name)}</a>`).join('')}</div>` : ''}
    </section>` : ''}
    <section class="${compact ? '' : 'card'}">
      <h3>Quelle</h3>
      <div class="source-box">${esc(SOURCES[src.key].name)}<br>
        <a href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">${esc(src.title)} ${icon('external')}</a>
        <span class="block small" style="margin-top:6px">Eigene, gekürzte Zusammenfassung · Muskeln, Equipment und Level laut Quelle · <a href="#/quellen">Mehr zu den Quellen</a></span>
      </div>
    </section>`;
}

export function openExerciseInfo(entry) {
  openSheet({
    title: entry.name,
    footer: false,
    tall: true,
    focus: false,
    body: `<p class="meta-row">${icon('target')}${esc(musclesText(entry))}</p>${entryFeatures(entry)}${exerciseInfoHtml(entry, { compact: true })}
      <p class="small center" style="margin-top:16px"><a href="#/katalog/${entry.id}" data-sheet-link>Ganze Seite öffnen</a></p>`,
    onMount: (form) => form.querySelector('[data-sheet-link]')?.addEventListener('click', () => setTimeout(() => document.querySelector('#sheetRoot [data-sheet-close]')?.click(), 0)),
  });
}

export { icon };
