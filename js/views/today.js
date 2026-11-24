// Startseite: heutiges Training (Hero-Karte), laufende Einheit, Wochenstand und Feedback.

import { store } from '../store.js';
import { todayISO, fmtDate, fmtDateLong, startOfWeek, addDays, WEEKDAYS_SHORT, relativeLabel } from '../dates.js';
import { esc, plural } from '../format.js';
import { activeSession, completedSessions, findDay, plannedOn, unitOf } from '../model.js';
import { buildExerciseIndex, weekFeedback, analyzeExercise, exerciseFeedback, indexKey } from '../analytics.js';
import { onAction, feedbackList, icon } from '../ui.js';
import { openStartSheet, startTraining, sessionSummary, dayFocus, focusLabel } from './common.js';
import { lastExportAt } from './settings.js';

function heroFor(day, { done }) {
  const sets = day.exercises.reduce((a, e) => a + Number(e.sets || 0), 0);
  const focus = focusLabel(dayFocus(day));
  return `
    <section class="hero">
      <div class="hero-top">
        <span class="hero-tag">${icon(done ? 'check' : 'today')}${done ? 'Heute erledigt' : 'Heute geplant'}</span>
        ${focus ? `<span class="hero-tag">${icon('target')}${esc(focus)}</span>` : ''}
      </div>
      <div class="hero-info">
        <div><h3>${esc(day.name)}</h3><p class="meta">${icon('dumbbell')}${plural(day.exercises.length, 'Übung', 'Übungen')} · ${plural(sets, 'Satz', 'Sätze')}</p></div>
        <button class="btn primary" data-action="start-planned" data-id="${day.id}">${done ? 'Nochmal' : 'Starten'}</button>
      </div>
    </section>`;
}

export function todayView() {
  const data = store.data;
  const today = todayISO();
  const running = activeSession(data);
  const done = completedSessions(data);

  if (!data.plan && !done.length && !running) {
    return {
      title: 'Heute', tab: 'heute',
      html: `
        <section class="hello"><span class="eyebrow">${esc(fmtDateLong(today))}</span><h2>Willkommen!</h2></section>
        <section class="hero">
          <div class="hero-top"><span class="hero-tag">${icon('sparkle')}Dein Training, dein Plan</span></div>
          <div class="hero-info"><div><h3>Stell deinen Plan zusammen</h3><p class="meta">${icon('layers')}Vorlage als Start oder ganz eigener Plan</p></div></div>
        </section>
        <div class="quick-grid">
          <a class="quick" href="#/vorlagen"><span class="q-ico">${icon('layers')}</span><strong>Mit Vorlage starten</strong><span>Push/Pull/Beine, Ganzkörper, Cardio, Mobility … – danach frei anpassbar</span></a>
          <button class="quick" data-action="create-plan" style="text-align:left;cursor:pointer"><span class="q-ico">${icon('edit')}</span><strong>Eigenen Plan erstellen</strong><span>Tage, Übungen, Sätze und Wiederholungen selbst festlegen</span></button>
        </div>
        <section class="card">
          <ol class="steps">
            <li>Trainingstage mit Wochentagen und Schwerpunkt festlegen</li>
            <li>Übungen aus dem Katalog wählen oder eigene anlegen</li>
            <li>Trainings erfassen – jede Einheit wird dauerhaft gespeichert und ausgewertet</li>
          </ol>
          <button class="btn ghost wide" data-action="start-free">Ohne Plan ein freies Training erfassen</button>
        </section>`,
    };
  }

  const index = buildExerciseIndex(data);
  const wk = weekFeedback(data, index, startOfWeek(today), today);
  const todays = plannedOn(data, today);
  const doneToday = done.filter((s) => s.date === today);
  const plannedDays = todays.map((p) => findDay(data.plan, p.dayId)).filter(Boolean);

  let hero;
  if (running) {
    hero = `<section class="hero">
      <div class="hero-top"><span class="hero-tag">${icon('play')}Training läuft</span></div>
      <div class="hero-info"><div><h3>${esc(running.title)}</h3><p class="meta">${icon('clock')}${fmtDate(running.date)} · ${esc(sessionSummary(running))}</p></div>
        <a class="btn primary" href="#/training/${running.id}">Weiter</a></div>
    </section>`;
  } else if (plannedDays.length) {
    hero = plannedDays.map((d) => heroFor(d, { done: doneToday.some((s) => s.dayId === d.id) })).join('');
  } else {
    hero = `<section class="hero plain">
      <div class="hero-top"><span class="hero-tag">${icon('today')}Heute</span></div>
      <div class="hero-info"><div><h3>Kein Training geplant</h3><p class="meta">${icon('sparkle')}${data.plan ? 'Du kannst trotzdem trainieren oder nachtragen' : 'Noch kein Plan angelegt'}</p></div>
        <button class="btn primary" data-action="start-other">Starten</button></div>
    </section>`;
  }

  // Wochenleiste Mo–So
  const ws = startOfWeek(today);
  const strip = WEEKDAYS_SHORT.map((wd, i) => {
    const d = addDays(ws, i);
    const planned = plannedOn(data, d).length;
    const count = done.filter((s) => s.date === d).length;
    const state = count ? 'done' : planned && d < today ? 'missed' : planned ? 'planned' : 'free';
    const label = count ? `${plural(count, 'Einheit', 'Einheiten')} absolviert` : planned ? (d < today ? 'geplant, nicht absolviert' : 'geplant') : 'kein Training geplant';
    return `<li class="ws-day ws-${state} ${d === today ? 'is-today' : ''}" title="${wd} ${fmtDate(d)}: ${label}">
      <span>${wd}</span><span class="ws-mark" aria-hidden="true">${count ? icon('check') : ''}</span><span class="sr-only">${label}</span></li>`;
  }).join('');

  // Feedback zur zuletzt abgeschlossenen Einheit
  const last = done[done.length - 1];
  let lastFb = [];
  if (last) {
    for (const ex of last.exercises) {
      const rec = index.get(indexKey(ex.name, unitOf(ex)));
      const idx = rec ? rec.entries.findIndex((e) => e.sessionId === last.id) : -1;
      if (idx >= 0) lastFb.push(...exerciseFeedback(analyzeExercise(rec, idx), today, { brief: true }));
    }
    lastFb = [...lastFb.filter((m) => m.tone !== 'neutral'), ...lastFb.filter((m) => m.tone === 'neutral')].slice(0, 6);
  }

  const exp = lastExportAt();
  const needsBackup = store.deviceOnly && done.length >= 3 && (!exp || Date.now() - new Date(exp).getTime() > 14 * 86400000);
  const greeting = running ? 'Weiter geht’s!' : plannedDays.length ? 'Bereit fürs Training?' : 'Hallo!';

  return {
    title: 'Heute', tab: 'heute',
    html: `
      ${needsBackup ? `<a class="card banner-warn" href="#/einstellungen">Deine Daten liegen nur auf diesem Gerät. ${exp ? 'Die letzte Sicherung ist über 2 Wochen her' : 'Du hast noch keine Sicherung exportiert'} – tippe hier, um sie zu exportieren.</a>` : ''}
      <section class="hello"><span class="eyebrow">${esc(fmtDateLong(today))}</span><h2>${greeting}</h2></section>
      ${hero}
      ${running ? '' : `<button class="btn ghost wide" data-action="start-other" style="margin-bottom:16px">${icon('plus')}Anderes Training oder nachtragen</button>`}

      <section class="card">
        <div class="section-head"><h2>Diese Woche</h2><a class="small" href="#/auswertung/woche">Auswertung</a></div>
        <ul class="week-strip" aria-label="Wochenübersicht">${strip}</ul>
        ${feedbackList([wk.msgs[0]], { linkExercises: false })}
      </section>

      ${last ? `<section class="card">
        <div class="section-head"><h2>Letztes Training</h2><a class="small" href="#/verlauf/${last.id}">Details</a></div>
        <p><strong>${esc(last.title)}</strong> · ${fmtDate(last.date)} (${relativeLabel(last.date, today)})</p>
        <p class="small muted">${esc(sessionSummary(last))}</p>
        ${feedbackList(lastFb, { empty: 'Noch keine Vergleichswerte – ab der zweiten Einheit einer Übung siehst du hier Veränderungen.' })}
      </section>` : ''}

      ${!data.plan ? `<div class="quick-grid">
        <a class="quick" href="#/vorlagen"><span class="q-ico">${icon('layers')}</span><strong>Vorlage wählen</strong><span>als Startpunkt für deinen Plan</span></a>
        <button class="quick" data-action="create-plan" style="text-align:left;cursor:pointer"><span class="q-ico">${icon('edit')}</span><strong>Eigener Plan</strong><span>alles selbst festlegen</span></button>
      </div>` : ''}`,
  };
}

onAction('start-planned', (el) => startTraining({ dayId: el.dataset.id }));
onAction('start-other', () => openStartSheet({}));
onAction('start-free', () => startTraining({ dayId: null }));
// "create-plan" wird in plan.js registriert.
