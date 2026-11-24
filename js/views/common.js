// Gemeinsame Bausteine mehrerer Ansichten.

import { store } from '../store.js';
import { todayISO, isValidISO, fmtDate, WEEKDAYS_SHORT, weekdayIndex, durationLabel } from '../dates.js';
import { esc, fmtNum, plural } from '../format.js';
import { activeSession, createSession, createPlan, exerciseKey, fmtRepsTarget, plannedOn, sessionTotals } from '../model.js';
import { buildExerciseIndex, describeSets, describeDiff } from '../analytics.js';
import { openSheet, commit, navigate, confirmDialog, field, showFieldErrors, icon, verdictBadge } from '../ui.js';

export function fmtRest(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')} min` : `${s} s`;
}

export function targetText(t) {
  if (!t) return '';
  const parts = [`${t.sets} × ${fmtRepsTarget(t.reps)}`];
  if (t.weight != null) parts.push(`${fmtNum(t.weight)} kg`);
  if (t.rest) parts.push(`Pause ${fmtRest(t.rest)}`);
  return parts.join(' · ');
}

export function weekdaysText(list) {
  return list.length ? list.map((d) => WEEKDAYS_SHORT[d]).join(', ') : 'ohne festen Wochentag';
}

export function sessionSummary(s) {
  const t = sessionTotals(s);
  const parts = [`${t.performed} ${t.performed === 1 ? 'Übung' : 'Übungen'}`, plural(t.sets, 'Satz', 'Sätze')];
  if (t.volume > 0) parts.push(`${fmtNum(t.volume, 0)} kg Volumen`);
  if (t.skipped) parts.push(`${t.skipped} ausgelassen`);
  return parts.join(' · ');
}

export function emptyState(title, text, actions = '') {
  return `<section class="empty"><h2>${esc(title)}</h2><p>${text}</p>${actions}</section>`;
}

// Liefert die zuletzt absolvierten Sätze je Übung (für Vorschlagswerte beim Start).
function lastSetsLookup(data) {
  const index = buildExerciseIndex(data);
  return (name) => {
    const rec = index.get(exerciseKey(name));
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
    title: 'Neuen Trainingsplan anlegen',
    submitLabel: 'Plan anlegen',
    body: `${field({ label: 'Name des Plans', name: 'name', placeholder: 'z. B. Mein Ganzkörperplan', attrs: 'maxlength="60" autocomplete="off"' })}
      <p class="muted small">Danach legst du deine Trainingstage, Wochentage und Übungen selbst fest. Bereits erfasste Trainings bleiben unverändert.</p>`,
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

// Tabelle: aktuelle Leistung vs. letzte Einheit, ca. 1 bzw. 3 Monate davor, erste Einheit, Bestleistung.
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

export { icon };
