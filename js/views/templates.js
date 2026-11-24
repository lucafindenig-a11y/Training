// Planvorlagen: ansehen und als Startpunkt übernehmen (danach frei bearbeitbar).

import { store } from '../store.js';
import { todayISO, WEEKDAYS_SHORT } from '../dates.js';
import { esc, plural } from '../format.js';
import { recordSchedule, uid, fmtRepsTarget } from '../model.js';
import { getExercise, FOCUS } from '../catalog.js';
import { PLAN_TEMPLATES, getPlanTemplate, buildDay, templateStats } from '../templates.js';
import { onAction, openSheet, commit, navigate, toast, icon } from '../ui.js';
import { featurePanel, focusBadges, unitShort } from './common.js';

function stats(tpl) {
  const s = templateStats(tpl);
  return featurePanel([
    ['layers', String(s.days), s.days === 1 ? 'Trainingstag' : 'Trainingstage'],
    ['today', `${s.perWeek}×`, 'pro Woche'],
    ['dumbbell', String(s.exercises), 'Übungen'],
  ]);
}

export function templatesView() {
  const cards = PLAN_TEMPLATES.map((t) => {
    const focus = [...new Set(t.days.flatMap((d) => d.focus))];
    return `
      <a class="card tpl-card" href="#/vorlagen/${t.id}">
        <div class="tpl-banner"><span class="hero-tag">${icon('sparkle')}${esc(focus.map((f) => FOCUS[f]?.label).filter(Boolean).join(' · '))}</span></div>
        <h3>${esc(t.name)}</h3>
        <p class="small muted">${esc(t.description)}</p>
        ${stats(t)}
      </a>`;
  }).join('');
  return {
    title: 'Vorlagen', tab: 'plan', back: '#/plan',
    html: `
      <p class="page-intro">Wähle einen Vorschlag als Startpunkt. Danach sind Trainingstage, Übungen, Sätze, Wiederholungen und Reihenfolge frei bearbeitbar – oder du baust deinen Plan komplett selbst.</p>
      ${cards}
      <section class="card">
        <h3>Lieber ganz eigener Plan?</h3>
        <p class="small muted">Starte leer und stelle alles selbst zusammen – mit Übungen aus dem Katalog oder eigenen.</p>
        <button class="btn primary" data-action="create-plan">${icon('plus')}Leeren Plan anlegen</button>
      </section>`,
  };
}

export function templateDetailView([id]) {
  const tpl = getPlanTemplate(id);
  if (!tpl) return { redirect: '#/vorlagen' };
  const s = templateStats(tpl);
  const days = tpl.days.map((d) => `
    <section class="card">
      <div class="plan-title" style="margin-bottom:4px"><div><h3>${esc(d.name)}</h3>
        <p class="small muted">${d.weekdays.map((w) => WEEKDAYS_SHORT[w]).join(', ')}</p></div>
        <div class="badge-row" style="margin-top:0">${focusBadges(d.focus)}</div></div>
      <ol class="steps-list">${d.exercises.map(([eid, sets, reps]) => {
        const e = getExercise(eid);
        const amount = `${sets ?? e.defaults.sets} × ${fmtRepsTarget(reps ?? e.defaults.reps)}${e.unit === 'wdh' ? '' : ` ${unitShort(e.unit)}`}`;
        return `<li><span><a href="#/katalog/${e.id}">${esc(e.name)}</a><span class="small muted block">${esc(amount)}</span></span></li>`;
      }).join('')}</ol>
    </section>`).join('');
  return {
    title: tpl.name, tab: 'plan', back: '#/vorlagen',
    html: `
      <section class="detail-head"><span class="eyebrow">Vorlage</span><h2>${esc(tpl.name)}</h2>
        <p class="muted">${esc(tpl.description)}</p></section>
      ${stats(tpl)}
      <p class="note">Sätze, Wiederholungen und Wochentage sind Startwerte als Vorschlag. Nach der Übernahme kannst du alles ändern. Deine bisherigen Trainings bleiben unverändert.</p>
      ${days}
      <div class="action-bar">
        <div class="ab-info"><strong>${plural(s.days, 'Tag', 'Tage')} · ${s.perWeek}× pro Woche</strong><span>frei anpassbar</span></div>
        <button class="btn primary" data-action="tpl-apply" data-id="${tpl.id}">Übernehmen</button>
      </div>`,
  };
}

function applyAsNewPlan(tpl) {
  const today = todayISO();
  store.data.plan = { id: uid(), name: tpl.name, createdAt: today, templateId: tpl.id, days: tpl.days.map((d) => buildDay(d)) };
  recordSchedule(store.data, today);
  commit();
  navigate('#/plan');
  toast('Vorlage übernommen – alles ist frei bearbeitbar.');
}

function appendDays(tpl) {
  store.data.plan.days.push(...tpl.days.map((d) => buildDay(d, { keepWeekdays: false })));
  recordSchedule(store.data, todayISO());
  commit();
  navigate('#/plan');
  toast(`${plural(tpl.days.length, 'Tag', 'Tage')} hinzugefügt – Wochentage kannst du jetzt festlegen.`);
}

onAction('tpl-apply', (el) => {
  const tpl = getPlanTemplate(el.dataset.id);
  if (!tpl) return;
  const plan = store.data.plan;
  if (!plan) {
    applyAsNewPlan(tpl);
    return;
  }
  openSheet({
    title: 'Vorlage übernehmen',
    submitLabel: 'Übernehmen',
    focus: false,
    body: `<fieldset class="choices"><legend class="sr-only">Art der Übernahme</legend>
      <label class="choice"><input type="radio" name="mode" value="replace" checked>
        <span><strong>Als neuen Plan</strong><small>Ersetzt „${esc(plan.name)}“. Deine erfassten Trainings und Auswertungen bleiben vollständig erhalten.</small></span></label>
      <label class="choice"><input type="radio" name="mode" value="append">
        <span><strong>Tage zu „${esc(plan.name)}“ hinzufügen</strong><small>${plural(tpl.days.length, 'Trainingstag', 'Trainingstage')} ohne Wochentage – die legst du danach fest.</small></span></label>
    </fieldset>`,
    onSubmit: (form) => {
      const mode = form.querySelector('input[name=mode]:checked').value;
      setTimeout(() => (mode === 'replace' ? applyAsNewPlan(tpl) : appendDays(tpl)), 0);
    },
  });
});
