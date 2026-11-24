// Formular für Planübungen – genutzt beim manuellen Anlegen, aus dem Katalog und aus Vorschlägen.

import { store } from '../store.js';
import { todayISO } from '../dates.js';
import { esc } from '../format.js';
import { addPlanExercise, validateExerciseFields, recordSchedule, knownExerciseNames, fmtRepsTarget, UNITS, unitOf, findDay } from '../model.js';
import { EXERCISES, catalogFor } from '../catalog.js';
import { planExerciseFromCatalog } from '../templates.js';
import { openSheet, commit, field, showFieldErrors, toast } from '../ui.js';
import { fmtRest, musclesText, unitShort, weekdaysText } from './common.js';

function amountLabel(unit) {
  return unit === 'wdh' ? 'Wiederholungen' : `Dauer (${UNITS[unit].label})`;
}

export function openPlanExerciseForm({ day, ex = null, entry = null, onSaved = null }) {
  const cat = entry ?? (ex ? catalogFor(ex) : null);
  const init = ex ?? (entry ? planExerciseFromCatalog(entry) : { name: '', sets: 3, reps: '10', unit: 'wdh', weight: null, rest: null, notes: '' });
  const unit = unitOf(init);
  const names = [...new Set([...knownExerciseNames(store.data), ...EXERCISES.map((e) => e.name)])].sort((a, b) => a.localeCompare(b, 'de'));
  const restValue = init.rest ? (init.rest >= 60 ? fmtRest(init.rest).replace(' min', '') : String(init.rest)) : '';

  openSheet({
    title: ex ? 'Übung bearbeiten' : 'Übung hinzufügen',
    submitLabel: ex ? 'Speichern' : `Zu „${day.name}“ hinzufügen`,
    focus: !entry && !ex,
    body: `
      ${cat ? `<details class="info-box"><summary>Übungsinfo: ${esc(cat.name)}</summary>
        <p class="small">${esc(musclesText(cat))}</p>
        <ol class="small">${cat.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <a class="small" href="#/katalog/${cat.id}" data-close-sheet-link>Ganze Anleitung mit Quelle öffnen</a></details>` : ''}
      ${field({ label: 'Übung', name: 'name', value: init.name, placeholder: 'z. B. Bankdrücken', attrs: 'list="exercise-names" maxlength="80" autocomplete="off"' })}
      <datalist id="exercise-names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      <input type="hidden" name="catalogId" value="${esc(cat?.id ?? '')}">
      <fieldset><legend class="field-label">Messen in</legend>
        <div class="segmented-input">${Object.entries(UNITS).map(([k, u]) => `
          <label><input type="radio" name="unit" value="${k}" ${k === unit ? 'checked' : ''}><span>${esc(u.label)}</span></label>`).join('')}</div>
      </fieldset>
      <div class="field-row">
        ${field({ label: 'Sätze', name: 'sets', value: init.sets, attrs: 'inputmode="numeric" maxlength="2"' })}
        ${field({ label: amountLabel(unit), name: 'reps', value: fmtRepsTarget(init.reps).replace('–', '-'), placeholder: '10 oder 8-12', attrs: 'inputmode="numeric" maxlength="9"' })}
      </div>
      <div class="field-row">
        ${field({ label: 'Gewicht (kg, optional)', name: 'weight', value: init.weight != null ? String(init.weight).replace('.', ',') : '', placeholder: 'z. B. 62,5', attrs: 'inputmode="decimal" maxlength="7"' })}
        ${field({ label: 'Pause (optional)', name: 'rest', value: restValue, placeholder: '90 oder 1:30', attrs: 'inputmode="numeric" maxlength="5"', hint: 'Sekunden oder Min:Sek' })}
      </div>
      ${field({ label: 'Notizen (optional)', name: 'notes', type: 'textarea', value: init.notes ?? '', placeholder: 'z. B. Sitzhöhe 4, enger Griff' })}
      ${entry && !ex ? '<p class="small muted">Sätze, Wiederholungen und Pause sind Startwerte als Vorschlag – passe sie an dich an.</p>' : ''}
      ${ex ? '<p class="small muted">Der Name dient auch zum Vergleich mit früheren Trainings dieser Übung.</p>' : ''}`,
    onMount: (form) => {
      const repsLabel = form.querySelector('label[for="f-reps"] .field-label');
      form.querySelectorAll('input[name=unit]').forEach((r) => r.addEventListener('change', () => {
        repsLabel.textContent = amountLabel(form.querySelector('input[name=unit]:checked').value);
      }));
      form.querySelector('[data-close-sheet-link]')?.addEventListener('click', () => setTimeout(() => document.querySelector('#sheetRoot [data-sheet-close]')?.click(), 0));
    },
    onSubmit: (form) => {
      const f = Object.fromEntries(new FormData(form));
      const { ok, errors, value } = validateExerciseFields(f);
      if (!ok) {
        showFieldErrors(form, errors);
        return false;
      }
      if (!value.catalogId) delete value.catalogId;
      if (ex) {
        Object.assign(ex, value);
        if (!value.catalogId) delete ex.catalogId;
      } else addPlanExercise(day, value);
      recordSchedule(store.data, todayISO());
      commit();
      if (!ex) toast(`„${value.name}“ zu „${day.name}“ hinzugefügt.`);
      onSaved?.();
    },
  });
}

// Für Katalog-Seiten: Trainingstag wählen, dann das Formular öffnen.
export function openAddToPlan(entry) {
  const plan = store.data.plan;
  if (!plan?.days.length) {
    toast(plan ? 'Lege zuerst einen Trainingstag an.' : 'Lege zuerst einen Plan an.');
    return;
  }
  if (plan.days.length === 1) {
    openPlanExerciseForm({ day: plan.days[0], entry });
    return;
  }
  openSheet({
    title: 'Zu welchem Trainingstag?',
    submitLabel: 'Weiter',
    focus: false,
    body: `<fieldset class="choices"><legend class="sr-only">Trainingstag</legend>${plan.days.map((d, i) => `
      <label class="choice"><input type="radio" name="dayId" value="${d.id}" ${i === 0 ? 'checked' : ''}>
      <span><strong>${esc(d.name)}</strong><small>${esc(weekdaysText(d.weekdays))} · ${d.exercises.length} Übungen</small></span></label>`).join('')}</fieldset>
      <p class="small muted">${esc(entry.name)} · Startwert ${entry.defaults.sets} × ${esc(fmtRepsTarget(entry.defaults.reps))}${entry.unit === 'wdh' ? '' : ` ${unitShort(entry.unit)}`}</p>`,
    onSubmit: (form) => {
      const day = findDay(plan, form.querySelector('input[name=dayId]:checked')?.value);
      if (day) setTimeout(() => openPlanExerciseForm({ day, entry }), 0);
    },
  });
}
