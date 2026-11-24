// Plan-Editor: Plan, Trainingstage (mit Wochentagen & Schwerpunkt) und Übungen – alles frei bearbeitbar.

import { store } from '../store.js';
import { todayISO, WEEKDAYS_SHORT, WEEKDAYS_LONG } from '../dates.js';
import { esc, plural } from '../format.js';
import { addDay, findDay, removeDay, duplicateDay, moveItem, recordSchedule, deletePlan, normWeekdays, normFocus } from '../model.js';
import { EXERCISES, FOCUS, catalogFor, suggestForFocus, inferFocus, getExercise } from '../catalog.js';
import { DAY_TEMPLATES, getDayTemplate, buildDay } from '../templates.js';
import { onAction, openSheet, commit, navigate, confirmDialog, field, showFieldErrors, toast, icon } from '../ui.js';
import {
  targetText, weekdaysText, openCreatePlanSheet, openStartSheet, dayFocus, focusBadges, focusLabel, musclesText,
  featurePanel, openExerciseInfo,
} from './common.js';
import { openPlanExerciseForm } from './exercise-form.js';
import { openCatalogPicker } from './catalog.js';

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
      html: `
        <section class="hero plain">
          <div class="hero-top"><span class="hero-tag">${icon('plan')}Dein Trainingsplan</span></div>
          <div class="hero-info"><div><h3>Noch kein Plan angelegt</h3><p class="meta">${icon('sparkle')}Vorlage wählen oder komplett selbst bauen</p></div></div>
        </section>
        <div class="quick-grid">
          <a class="quick" href="#/vorlagen"><span class="q-ico">${icon('layers')}</span><strong>Mit Vorlage starten</strong><span>Push/Pull/Beine, Ganzkörper, Ober-/Unterkörper, Cardio, Mobility</span></a>
          <button class="quick" data-action="create-plan" style="text-align:left;cursor:pointer"><span class="q-ico">${icon('edit')}</span><strong>Eigenen Plan erstellen</strong><span>Tage, Übungen, Sätze und Wiederholungen selbst festlegen</span></button>
        </div>
        ${HISTORY_NOTE}`,
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
        <span class="small muted">${esc(weekdaysText(d.weekdays))} · ${plural(d.exercises.length, 'Übung', 'Übungen')}</span>
        ${dayFocus(d).length ? `<span class="badge-row">${focusBadges(dayFocus(d))}</span>` : ''}
      </a>
      <div class="row-actions">
        <button class="icon-btn plain small" data-action="day-move" data-id="${d.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(d.name)} nach oben">${icon('up')}</button>
        <button class="icon-btn plain small" data-action="day-move" data-id="${d.id}" data-dir="1" ${i === plan.days.length - 1 ? 'disabled' : ''} aria-label="${esc(d.name)} nach unten">${icon('down')}</button>
        <button class="icon-btn plain small" data-action="day-edit" data-id="${d.id}" aria-label="${esc(d.name)} bearbeiten">${icon('edit')}</button>
        <button class="icon-btn plain small" data-action="day-duplicate" data-id="${d.id}" aria-label="${esc(d.name)} duplizieren">${icon('copy')}</button>
        <button class="icon-btn plain small danger" data-action="day-delete" data-id="${d.id}" aria-label="${esc(d.name)} löschen">${icon('trash')}</button>
      </div>
    </li>`).join('');

  return {
    title: 'Plan', tab: 'plan',
    html: `
      <section class="card">
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
      <div class="quick-grid">
        <a class="quick" href="#/vorlagen"><span class="q-ico">${icon('layers')}</span><strong>Vorlagen</strong><span>Plan oder einzelne Tage übernehmen</span></a>
        <a class="quick" href="#/katalog"><span class="q-ico">${icon('dumbbell')}</span><strong>Übungskatalog</strong><span>${EXERCISES.length} Übungen mit Anleitung</span></a>
      </div>
      <div class="section-head"><h2>Trainingstage</h2>
        <button class="btn primary small" data-action="day-add">${icon('plus')}Trainingstag</button></div>
      ${plan.days.length ? `<ul class="list">${dayCards}</ul>` : '<p class="muted">Noch keine Trainingstage. Lege einen leeren Tag an oder übernimm einen Tag aus einer Vorlage, z. B. „Push“.</p>'}
      ${HISTORY_NOTE}`,
  };
}

function weekdayPicker(selected) {
  return `<fieldset><legend class="field-label">Wochentage</legend>
    <div class="wd-row">${WEEKDAYS_SHORT.map((wd, i) => `
      <label class="toggle-chip"><input type="checkbox" name="weekdays" value="${i}" aria-label="${WEEKDAYS_LONG[i]}" ${selected.includes(i) ? 'checked' : ''}><span aria-hidden="true">${wd}</span></label>`).join('')}
    </div><span class="field-hint">Optional – an diesen Tagen ist der Trainingstag geplant.</span></fieldset>`;
}

function focusPicker(selected) {
  return `<fieldset><legend class="field-label">Schwerpunkt</legend>
    <div class="focus-row">${Object.entries(FOCUS).map(([k, f]) => `
      <label class="toggle-chip"><input type="checkbox" name="focus" value="${k}" ${selected.includes(k) ? 'checked' : ''}><span>${esc(f.label)}</span></label>`).join('')}
    </div><span class="field-hint">Bestimmt, welche Übungen dir vorgeschlagen werden (z. B. bei Push nur Brust, Schultern und Trizeps).</span></fieldset>`;
}

function openDaySheet(day = null) {
  const initialFocus = day ? dayFocus(day) : [];
  openSheet({
    title: day ? 'Trainingstag bearbeiten' : 'Neuer Trainingstag',
    submitLabel: day ? 'Speichern' : 'Anlegen',
    body: `${field({ label: 'Name', name: 'name', value: day?.name ?? '', placeholder: 'z. B. Push, Oberkörper, Tag A', attrs: 'maxlength="50" autocomplete="off"' })}
      ${weekdayPicker(day?.weekdays ?? [])}
      ${focusPicker(initialFocus)}`,
    onMount: (form) => {
      if (day) return;
      // Neuer Tag: Schwerpunkt aus dem Namen vorschlagen, solange er nicht selbst gewählt wurde.
      let touched = false;
      form.querySelectorAll('input[name=focus]').forEach((c) => c.addEventListener('change', () => { touched = true; }));
      form.elements.name.addEventListener('input', () => {
        if (touched) return;
        const f = inferFocus(form.elements.name.value);
        form.querySelectorAll('input[name=focus]').forEach((c) => { c.checked = f.includes(c.value); });
      });
    },
    onSubmit: (form) => {
      const name = form.elements.name.value.trim();
      if (!name) {
        showFieldErrors(form, { name: 'Bitte einen Namen eingeben.' });
        return false;
      }
      const weekdays = normWeekdays([...form.querySelectorAll('input[name=weekdays]:checked')].map((c) => c.value));
      const focus = normFocus([...form.querySelectorAll('input[name=focus]:checked')].map((c) => c.value));
      if (day) {
        day.name = name;
        day.weekdays = weekdays;
        day.focus = focus;
        commitPlan();
      } else {
        const created = addDay(store.data.plan, { name, weekdays, focus });
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
  const ok = await confirmDialog('Der gesamte Plan mit allen Trainingstagen und Übungen wird gelöscht. <strong>Deine erfassten Trainings und Auswertungen bleiben vollständig erhalten.</strong> Danach kannst du einen neuen Plan anlegen oder eine Vorlage wählen.', { title: 'Plan löschen?', confirmLabel: 'Plan löschen' });
  if (!ok) return;
  deletePlan(store.data, todayISO());
  commit();
  toast('Plan gelöscht – deine Trainingshistorie ist erhalten.');
});

// Neuer Tag: leer oder aus einer Tagesvorlage
onAction('day-add', () => {
  openSheet({
    title: 'Trainingstag hinzufügen',
    submitLabel: 'Weiter',
    focus: false,
    body: `<fieldset class="choices"><legend class="sr-only">Art des Trainingstags</legend>
      <label class="choice"><input type="radio" name="tpl" value="" checked>
        <span><strong>Leerer Trainingstag</strong><small>Name, Wochentage, Schwerpunkt und Übungen selbst festlegen</small></span></label>
      ${DAY_TEMPLATES.map((t) => `<label class="choice"><input type="radio" name="tpl" value="${t.id}">
        <span><strong>${esc(t.name)}</strong><small>Vorlage · ${esc(focusLabel(t.focus))} · ${plural(t.exercises.length, 'Übung', 'Übungen')}: ${esc(t.exercises.map(([id]) => getExercise(id).name).join(', '))}</small></span></label>`).join('')}
    </fieldset>`,
    onSubmit: (form) => {
      const tpl = getDayTemplate(form.querySelector('input[name=tpl]:checked')?.value);
      if (!tpl) {
        setTimeout(() => openDaySheet(), 0);
        return;
      }
      const d = buildDay(tpl, { keepWeekdays: false });
      store.data.plan.days.push(d);
      commitPlan();
      navigate(`#/plan/tag/${d.id}`);
      toast(`„${d.name}“ angelegt – lege noch die Wochentage fest.`);
    },
  });
});

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

// ---------- Trainingstag mit Übungen und Vorschlägen ----------

export function dayView([id]) {
  const day = findDay(store.data.plan, id);
  if (!day) return { redirect: '#/plan' };
  const focus = dayFocus(day);
  const inferred = !day.focus?.length && focus.length > 0;
  const sets = day.exercises.reduce((a, e) => a + Number(e.sets || 0), 0);

  const list = day.exercises.map((ex, i) => {
    const cat = catalogFor(ex);
    return `
    <li class="card ex-card">
      <div class="ex-main">
        <span class="ex-num">${i + 1}</span>
        <div>
          <strong>${esc(ex.name)}</strong>
          <span class="small muted">${esc(targetText(ex))}</span>
          ${ex.notes ? `<span class="small note-inline">${esc(ex.notes)}</span>` : ''}
          ${cat ? `<button class="info-link" style="background:none;border:none;padding:0;cursor:pointer" data-action="ex-info" data-day="${day.id}" data-id="${ex.id}">${icon('info')}Anleitung · ${esc(musclesText(cat))}</button>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn plain small" data-action="ex-move" data-day="${day.id}" data-id="${ex.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach oben">${icon('up')}</button>
        <button class="icon-btn plain small" data-action="ex-move" data-day="${day.id}" data-id="${ex.id}" data-dir="1" ${i === day.exercises.length - 1 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach unten">${icon('down')}</button>
        <button class="icon-btn plain small" data-action="ex-edit" data-day="${day.id}" data-id="${ex.id}" aria-label="${esc(ex.name)} bearbeiten">${icon('edit')}</button>
        <button class="icon-btn plain small danger" data-action="ex-delete" data-day="${day.id}" data-id="${ex.id}" aria-label="${esc(ex.name)} löschen">${icon('trash')}</button>
      </div>
    </li>`;
  }).join('');

  const suggestions = suggestForFocus(focus, { excludeNames: day.exercises.map((e) => e.name) }).slice(0, 10);
  const suggestBlock = focus.length
    ? `<div class="section-head"><h2>Vorschläge für ${esc(focusLabel(focus))}</h2>
        <button class="btn small ghost" data-action="ex-add" data-day="${day.id}">Ganzer Katalog</button></div>
      ${inferred ? `<p class="small muted">Schwerpunkt aus dem Namen erkannt – ändern über ${icon('edit')} Bearbeiten.</p>` : ''}
      ${suggestions.length ? `<div class="suggest-row">${suggestions.map((e) => `
        <div class="suggest">
          <div><strong>${esc(e.name)}</strong><span class="block">${esc(musclesText(e))}</span></div>
          <div class="row">
            <button class="chip small" data-action="sug-info" data-id="${e.id}">${icon('info')}Info</button>
            <button class="icon-btn dark small" data-action="sug-add" data-day="${day.id}" data-id="${e.id}" aria-label="${esc(e.name)} hinzufügen">${icon('plus')}</button>
          </div>
        </div>`).join('')}</div>` : '<p class="muted small">Alle passenden Katalogübungen sind schon in diesem Tag.</p>'}`
    : `<section class="card"><h3>Passende Vorschläge</h3><p class="small muted">Lege über ${icon('edit')} einen Schwerpunkt fest (z. B. Push), dann siehst du hier passende Übungen. Den ganzen Katalog erreichst du jederzeit über „Übung“.</p></section>`;

  return {
    title: day.name, tab: 'plan', back: '#/plan',
    html: `
      <section class="card">
        <div class="plan-title">
          <div><span class="eyebrow">Trainingstag</span><h2>${esc(day.name)}</h2>
            <p class="small muted">${esc(weekdaysText(day.weekdays))}</p>
            ${focus.length ? `<div class="badge-row">${focusBadges(focus)}</div>` : ''}</div>
          <div class="row-actions">
            <button class="icon-btn" data-action="day-edit" data-id="${day.id}" aria-label="Name, Wochentage und Schwerpunkt bearbeiten">${icon('edit')}</button>
            <button class="icon-btn danger" data-action="day-delete" data-id="${day.id}" aria-label="Trainingstag löschen">${icon('trash')}</button>
          </div>
        </div>
        ${day.exercises.length ? featurePanel([['dumbbell', String(day.exercises.length), 'Übungen'], ['layers', String(sets), 'Sätze'], ['target', focus.length ? focusLabel(focus) : '–', 'Schwerpunkt']]) : ''}
      </section>
      <div class="section-head"><h2>Übungen</h2>
        <button class="btn primary small" data-action="ex-add" data-day="${day.id}">${icon('plus')}Übung</button></div>
      ${day.exercises.length ? `<ol class="list">${list}</ol>` : '<p class="muted">Noch keine Übungen. Wähle unten einen Vorschlag, öffne den Katalog oder lege eine eigene Übung an.</p>'}
      ${suggestBlock}
      ${HISTORY_NOTE}
      ${day.exercises.length ? `<div class="action-bar">
        <div class="ab-info"><strong>${plural(day.exercises.length, 'Übung', 'Übungen')} · ${plural(sets, 'Satz', 'Sätze')}</strong><span>${esc(weekdaysText(day.weekdays))}</span></div>
        <button class="btn primary" data-action="start-day" data-id="${day.id}">${icon('play')}Starten</button>
      </div>` : ''}`,
  };
}

function getEx(el) {
  const day = findDay(store.data.plan, el.dataset.day);
  const idx = day ? day.exercises.findIndex((e) => e.id === el.dataset.id) : -1;
  return { day, idx, ex: idx >= 0 ? day.exercises[idx] : null };
}

onAction('ex-add', (el) => {
  const day = findDay(store.data.plan, el.dataset.day);
  if (!day) return;
  openCatalogPicker({
    title: `Übung für „${day.name}“`,
    focus: dayFocus(day),
    onPick: (entry) => openPlanExerciseForm({ day, entry }),
    onCustom: () => openPlanExerciseForm({ day }),
  });
});
onAction('sug-add', (el) => {
  const day = findDay(store.data.plan, el.dataset.day);
  const entry = getExercise(el.dataset.id);
  if (day && entry) openPlanExerciseForm({ day, entry });
});
onAction('sug-info', (el) => {
  const entry = getExercise(el.dataset.id);
  if (entry) openExerciseInfo(entry);
});
onAction('ex-info', (el) => {
  const { ex } = getEx(el);
  const entry = catalogFor(ex);
  if (entry) openExerciseInfo(entry);
});
onAction('ex-edit', (el) => {
  const { day, ex } = getEx(el);
  if (ex) openPlanExerciseForm({ day, ex });
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
