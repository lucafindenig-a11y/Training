// Plan-Editor: Plan, Trainingstage und Übungen anlegen, bearbeiten, löschen und sortieren.

import { store } from '../store.js';
import { todayISO, WEEKDAYS_SHORT, WEEKDAYS_LONG } from '../dates.js';
import { esc, plural } from '../format.js';
import {
  addDay, findDay, removeDay, duplicateDay, moveItem, addPlanExercise, validateExerciseFields,
  recordSchedule, deletePlan, knownExerciseNames, normWeekdays, fmtRepsTarget,
} from '../model.js';
import { onAction, openSheet, commit, navigate, confirmDialog, field, showFieldErrors, toast, icon } from '../ui.js';
import { targetText, weekdaysText, openCreatePlanSheet, emptyState, openStartSheet, fmtRest } from './common.js';

// Jede Planänderung aktualisiert die Wochenplan-Historie (gilt ab heute) und speichert.
function commitPlan() {
  recordSchedule(store.data, todayISO());
  commit();
}

const HISTORY_NOTE = '<p class="note">Änderungen am Plan gelten nur für zukünftige Trainings. Bereits erfasste Einheiten und frühere Wochen bleiben unverändert.</p>';

// ---------- Übersicht ----------

export function planView() {
  const plan = store.data.plan;
  if (!plan) {
    return {
      title: 'Plan', tab: 'plan',
      html: emptyState('Noch kein Trainingsplan',
        'Stelle deinen Plan selbst zusammen: Trainingstage, Wochentage, Übungen, Sätze und Wiederholungen bestimmst du.',
        `<button class="btn primary" data-action="create-plan">${icon('plus')}Plan erstellen</button>`) + HISTORY_NOTE,
    };
  }
  const week = WEEKDAYS_SHORT.map((wd, i) => {
    const days = plan.days.filter((d) => d.weekdays.includes(i));
    return `<div class="wk-col ${days.length ? 'has' : ''}"><span class="wk-day">${wd}</span>${days.map((d) => `<span class="wk-chip" title="${esc(d.name)}">${esc(d.name)}</span>`).join('') || '<span class="wk-rest">–</span>'}</div>`;
  }).join('');
  const perWeek = plan.days.reduce((a, d) => a + d.weekdays.length, 0);

  const dayCards = plan.days.map((d, i) => `
    <li class="card day-card">
      <a class="day-main" href="#/plan/tag/${d.id}">
        <strong>${esc(d.name)}</strong>
        <span class="muted">${esc(weekdaysText(d.weekdays))} · ${plural(d.exercises.length, 'Übung', 'Übungen')}</span>
        ${d.exercises.length ? `<span class="small muted ellipsis">${esc(d.exercises.map((e) => e.name).join(', '))}</span>` : ''}
      </a>
      <div class="row-actions">
        <button class="icon-btn" data-action="day-move" data-id="${d.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(d.name)} nach oben">${icon('up')}</button>
        <button class="icon-btn" data-action="day-move" data-id="${d.id}" data-dir="1" ${i === plan.days.length - 1 ? 'disabled' : ''} aria-label="${esc(d.name)} nach unten">${icon('down')}</button>
        <button class="icon-btn" data-action="day-edit" data-id="${d.id}" aria-label="${esc(d.name)} umbenennen / Wochentage">${icon('edit')}</button>
        <button class="icon-btn" data-action="day-duplicate" data-id="${d.id}" aria-label="${esc(d.name)} duplizieren">${icon('copy')}</button>
        <button class="icon-btn danger" data-action="day-delete" data-id="${d.id}" aria-label="${esc(d.name)} löschen">${icon('trash')}</button>
      </div>
    </li>`).join('');

  return {
    title: 'Plan', tab: 'plan',
    html: `
      <section class="card plan-head">
        <div class="plan-title">
          <div><span class="eyebrow">Mein Trainingsplan</span><h2>${esc(plan.name)}</h2></div>
          <div class="row-actions">
            <button class="icon-btn" data-action="plan-rename" aria-label="Plan umbenennen">${icon('edit')}</button>
            <button class="icon-btn danger" data-action="plan-delete" aria-label="Plan löschen">${icon('trash')}</button>
          </div>
        </div>
        <div class="wk-strip" aria-label="Wochenübersicht">${week}</div>
        <p class="small muted">${perWeek ? `${plural(perWeek, 'Einheit', 'Einheiten')} pro Woche geplant.` : 'Noch keine Wochentage festgelegt – lege bei den Trainingstagen fest, wann du trainierst.'}</p>
      </section>

      <div class="section-head"><h2>Trainingstage</h2>
        <button class="btn primary small" data-action="day-add">${icon('plus')}Trainingstag</button></div>
      ${plan.days.length ? `<ul class="list">${dayCards}</ul>` : '<p class="muted">Noch keine Trainingstage. Lege deinen ersten Trainingstag an, z. B. „Oberkörper“ oder „Tag A“.</p>'}
      ${HISTORY_NOTE}`,
  };
}

function weekdayPicker(selected) {
  return `<fieldset class="weekday-picker"><legend class="field-label">Wochentage</legend>
    <div class="wd-row">${WEEKDAYS_SHORT.map((wd, i) => `
      <label class="wd"><input type="checkbox" name="weekdays" value="${i}" aria-label="${WEEKDAYS_LONG[i]}" ${selected.includes(i) ? 'checked' : ''}><span aria-hidden="true">${wd}</span></label>`).join('')}
    </div><span class="field-hint">Optional – an diesen Tagen ist der Trainingstag geplant.</span></fieldset>`;
}

function openDaySheet(day = null) {
  openSheet({
    title: day ? 'Trainingstag bearbeiten' : 'Neuer Trainingstag',
    submitLabel: day ? 'Speichern' : 'Anlegen',
    body: `${field({ label: 'Name', name: 'name', value: day?.name ?? '', placeholder: 'z. B. Oberkörper, Push, Tag A', attrs: 'maxlength="50" autocomplete="off"' })}
      ${weekdayPicker(day?.weekdays ?? [])}`,
    onSubmit: (form) => {
      const name = form.elements.name.value.trim();
      if (!name) {
        showFieldErrors(form, { name: 'Bitte einen Namen eingeben.' });
        return false;
      }
      const weekdays = normWeekdays([...form.querySelectorAll('input[name=weekdays]:checked')].map((c) => c.value));
      if (day) {
        day.name = name;
        day.weekdays = weekdays;
        commitPlan();
      } else {
        const created = addDay(store.data.plan, { name, weekdays });
        commitPlan();
        navigate(`#/plan/tag/${created.id}`);
      }
    },
  });
}

onAction('create-plan', () => openCreatePlanSheet());

onAction('plan-rename', () => {
  const plan = store.data.plan;
  openSheet({
    title: 'Plan umbenennen',
    body: field({ label: 'Name des Plans', name: 'name', value: plan.name, attrs: 'maxlength="60" autocomplete="off"' }),
    onSubmit: (form) => {
      const name = form.elements.name.value.trim();
      if (!name) {
        showFieldErrors(form, { name: 'Bitte einen Namen eingeben.' });
        return false;
      }
      plan.name = name;
      commitPlan();
    },
  });
});

onAction('plan-delete', async () => {
  const ok = await confirmDialog('Der gesamte Plan mit allen Trainingstagen und Übungen wird gelöscht. <strong>Deine erfassten Trainings und Auswertungen bleiben vollständig erhalten.</strong> Danach kannst du einen neuen Plan anlegen.', { title: 'Plan löschen?', confirmLabel: 'Plan löschen' });
  if (!ok) return;
  deletePlan(store.data, todayISO());
  commit();
  toast('Plan gelöscht – deine Trainingshistorie ist erhalten.');
});

onAction('day-add', () => openDaySheet());
onAction('day-edit', (el) => openDaySheet(findDay(store.data.plan, el.dataset.id)));

onAction('day-move', (el) => {
  const days = store.data.plan.days;
  if (moveItem(days, days.findIndex((d) => d.id === el.dataset.id), Number(el.dataset.dir))) commitPlan();
});

onAction('day-duplicate', (el) => {
  const copy = duplicateDay(store.data.plan, el.dataset.id);
  if (copy) {
    commitPlan();
    toast(`„${copy.name}“ angelegt (ohne Wochentage).`);
  }
});

onAction('day-delete', async (el) => {
  const day = findDay(store.data.plan, el.dataset.id);
  if (!day) return;
  const ok = await confirmDialog(`Trainingstag „${esc(day.name)}“ mit ${plural(day.exercises.length, 'Übung', 'Übungen')} löschen? Bereits erfasste Trainings bleiben erhalten.`, { title: 'Trainingstag löschen?' });
  if (!ok) return;
  removeDay(store.data.plan, day.id);
  commitPlan();
  if (location.hash.startsWith('#/plan/tag/')) navigate('#/plan');
});

// ---------- Trainingstag mit Übungen ----------

export function dayView([id]) {
  const day = findDay(store.data.plan, id);
  if (!day) return { redirect: '#/plan' };
  const list = day.exercises.map((ex, i) => `
    <li class="card ex-card">
      <div class="ex-main">
        <span class="ex-num">${i + 1}</span>
        <div>
          <strong>${esc(ex.name)}</strong>
          <span class="muted">${esc(targetText(ex))}</span>
          ${ex.notes ? `<span class="small note-inline">${esc(ex.notes)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-action="ex-move" data-day="${day.id}" data-id="${ex.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach oben">${icon('up')}</button>
        <button class="icon-btn" data-action="ex-move" data-day="${day.id}" data-id="${ex.id}" data-dir="1" ${i === day.exercises.length - 1 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach unten">${icon('down')}</button>
        <button class="icon-btn" data-action="ex-edit" data-day="${day.id}" data-id="${ex.id}" aria-label="${esc(ex.name)} bearbeiten">${icon('edit')}</button>
        <button class="icon-btn danger" data-action="ex-delete" data-day="${day.id}" data-id="${ex.id}" aria-label="${esc(ex.name)} löschen">${icon('trash')}</button>
      </div>
    </li>`).join('');

  return {
    title: day.name, tab: 'plan', back: '#/plan',
    html: `
      <section class="card">
        <div class="plan-title">
          <div><span class="eyebrow">Trainingstag</span><h2>${esc(day.name)}</h2>
            <p class="muted">${esc(weekdaysText(day.weekdays))}</p></div>
          <div class="row-actions">
            <button class="icon-btn" data-action="day-edit" data-id="${day.id}" aria-label="Name und Wochentage bearbeiten">${icon('edit')}</button>
            <button class="icon-btn danger" data-action="day-delete" data-id="${day.id}" aria-label="Trainingstag löschen">${icon('trash')}</button>
          </div>
        </div>
        ${day.exercises.length ? `<button class="btn" data-action="start-day" data-id="${day.id}">${icon('play')}Training mit diesem Tag starten</button>` : ''}
      </section>
      <div class="section-head"><h2>Übungen</h2>
        <button class="btn primary small" data-action="ex-add" data-day="${day.id}">${icon('plus')}Übung</button></div>
      ${day.exercises.length ? `<ol class="list">${list}</ol>` : '<p class="muted">Noch keine Übungen. Füge die erste Übung hinzu – Sätze, Wiederholungen und optional Gewicht, Pause und Notizen legst du selbst fest.</p>'}
      ${HISTORY_NOTE}`,
  };
}

function openExerciseSheet(day, ex = null) {
  const names = knownExerciseNames(store.data);
  openSheet({
    title: ex ? 'Übung bearbeiten' : 'Übung hinzufügen',
    submitLabel: ex ? 'Speichern' : 'Hinzufügen',
    body: `
      ${field({ label: 'Übung', name: 'name', value: ex?.name ?? '', placeholder: 'z. B. Bankdrücken', attrs: 'list="exercise-names" maxlength="80" autocomplete="off"' })}
      <datalist id="exercise-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="field-row">
        ${field({ label: 'Sätze', name: 'sets', value: ex?.sets ?? 3, attrs: 'inputmode="numeric" maxlength="2"' })}
        ${field({ label: 'Wiederholungen', name: 'reps', value: ex ? fmtRepsTarget(ex.reps).replace('–', '-') : '10', placeholder: '10 oder 8-12', attrs: 'inputmode="numeric" maxlength="9"' })}
      </div>
      <div class="field-row">
        ${field({ label: 'Gewicht (kg, optional)', name: 'weight', value: ex?.weight != null ? String(ex.weight).replace('.', ',') : '', placeholder: 'z. B. 62,5', attrs: 'inputmode="decimal" maxlength="7"' })}
        ${field({ label: 'Pause (optional)', name: 'rest', value: ex?.rest ? (ex.rest >= 60 ? fmtRest(ex.rest).replace(' min', '') : String(ex.rest)) : '', placeholder: '90 oder 1:30', attrs: 'inputmode="numeric" maxlength="5"', hint: 'Sekunden oder Min:Sek' })}
      </div>
      ${field({ label: 'Notizen (optional)', name: 'notes', type: 'textarea', value: ex?.notes ?? '', placeholder: 'z. B. Sitzhöhe 4, enger Griff' })}
      ${ex ? '<p class="small muted">Der Name dient auch zum Vergleich mit früheren Trainings dieser Übung.</p>' : ''}`,
    onSubmit: (form) => {
      const f = Object.fromEntries(new FormData(form));
      const { ok, errors, value } = validateExerciseFields(f);
      if (!ok) {
        showFieldErrors(form, errors);
        return false;
      }
      if (ex) Object.assign(ex, value);
      else addPlanExercise(day, value);
      commitPlan();
    },
  });
}

function getEx(el) {
  const day = findDay(store.data.plan, el.dataset.day);
  const idx = day ? day.exercises.findIndex((e) => e.id === el.dataset.id) : -1;
  return { day, idx, ex: idx >= 0 ? day.exercises[idx] : null };
}

onAction('ex-add', (el) => openExerciseSheet(findDay(store.data.plan, el.dataset.day)));
onAction('ex-edit', (el) => {
  const { day, ex } = getEx(el);
  if (ex) openExerciseSheet(day, ex);
});
onAction('ex-move', (el) => {
  const { day, idx } = getEx(el);
  if (day && moveItem(day.exercises, idx, Number(el.dataset.dir))) commitPlan();
});
onAction('ex-delete', async (el) => {
  const { day, idx, ex } = getEx(el);
  if (!ex) return;
  const ok = await confirmDialog(`„${esc(ex.name)}“ aus „${esc(day.name)}“ entfernen? Frühere Trainings dieser Übung bleiben gespeichert.`, { title: 'Übung entfernen?', confirmLabel: 'Entfernen' });
  if (!ok) return;
  day.exercises.splice(idx, 1);
  commitPlan();
});
onAction('start-day', (el) => openStartSheet({ dayId: el.dataset.id }));
