// Startseite: heutiges Training, laufende Einheit, Wochenstand und aktuelles Feedback.

import { store } from '../store.js';
import { todayISO, fmtDate, fmtDateLong, startOfWeek, addDays, WEEKDAYS_SHORT, relativeLabel } from '../dates.js';
import { esc, plural } from '../format.js';
import { activeSession, completedSessions, findDay, plannedOn, exerciseKey } from '../model.js';
import { buildExerciseIndex, weekFeedback, analyzeExercise, exerciseFeedback } from '../analytics.js';
import { onAction, feedbackList, icon } from '../ui.js';
import { openStartSheet, startTraining, sessionSummary } from './common.js';
import { lastExportAt } from './settings.js';

export function todayView() {
  const data = store.data;
  const today = todayISO();
  const running = activeSession(data);
  const done = completedSessions(data);

  if (!data.plan && !done.length && !running) {
    return {
      title: 'Heute', tab: 'heute',
      html: `
        <section class="card welcome">
          <h2>Willkommen!</h2>
          <p>Hier stellst du deinen <strong>eigenen Trainingsplan</strong> zusammen – die App gibt dir keinen Plan vor.
          Du legst fest, an welchen Tagen du trainierst, welche Übungen dazugehören, in welcher Reihenfolge und mit wie vielen Sätzen und Wiederholungen.</p>
          <ol class="steps">
            <li>Plan anlegen und Trainingstage mit Wochentagen festlegen</li>
            <li>Übungen mit Sätzen, Wiederholungen und optional Gewicht, Pause und Notizen eintragen</li>
            <li>Trainings erfassen – jede Einheit wird dauerhaft gespeichert und ausgewertet</li>
          </ol>
          <button class="btn primary big" data-action="create-plan">${icon('plus')}Eigenen Plan erstellen</button>
          <button class="btn link" data-action="start-free">Ohne Plan ein freies Training erfassen</button>
        </section>`,
    };
  }

  const index = buildExerciseIndex(data);
  const wk = weekFeedback(data, index, startOfWeek(today), today);
  const todays = plannedOn(data, today);
  const doneToday = done.filter((s) => s.date === today);

  const todayBlock = todays.length
    ? `<ul class="list">${todays.map((p) => {
      const day = findDay(data.plan, p.dayId);
      const already = doneToday.some((s) => s.dayId === p.dayId);
      return `<li class="card today-item">
          <div><strong>${esc(day?.name ?? p.name)}</strong>
            <span class="small muted">${day ? plural(day.exercises.length, 'Übung', 'Übungen') : 'Trainingstag existiert nicht mehr'}${already ? ' · heute bereits erledigt' : ''}</span></div>
          ${day && !running ? `<button class="btn ${already ? '' : 'primary'}" data-action="start-planned" data-id="${day.id}">${icon('play')}Starten</button>` : ''}
        </li>`;
    }).join('')}</ul>`
    : `<p class="muted">Heute ist kein Training geplant.${data.plan ? '' : ' Du hast noch keinen Plan angelegt.'}</p>`;

  // Wochenleiste Mo–So: geplant / absolviert
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
      const rec = index.get(exerciseKey(ex.name));
      const idx = rec ? rec.entries.findIndex((e) => e.sessionId === last.id) : -1;
      if (idx >= 0) lastFb.push(...exerciseFeedback(analyzeExercise(rec, idx), today, { brief: true }));
    }
    lastFb = [...lastFb.filter((m) => m.tone !== 'neutral'), ...lastFb.filter((m) => m.tone === 'neutral')].slice(0, 6);
  }

  // Reiner Handy-Modus: an regelmäßige Sicherung erinnern
  const exp = lastExportAt();
  const needsBackup = store.deviceOnly && done.length >= 3 && (!exp || Date.now() - new Date(exp).getTime() > 14 * 86400000);

  return {
    title: 'Heute', tab: 'heute',
    html: `
      ${needsBackup ? `<a class="card banner-warn" href="#/einstellungen">Deine Daten liegen nur auf diesem Gerät. ${exp ? 'Letzte Sicherung ist über 2 Wochen her' : 'Du hast noch keine Sicherung exportiert'} – tippe hier, um sie zu exportieren.</a>` : ''}
      ${running ? `<a class="card banner-live" href="#/training/${running.id}">${icon('play')}<span><strong>Training läuft: ${esc(running.title)}</strong><span class="small">${fmtDate(running.date)} · tippen zum Fortsetzen</span></span></a>` : ''}
      <section class="card">
        <span class="eyebrow">${esc(fmtDateLong(today))}</span>
        <h2>Heute geplant</h2>
        ${todayBlock}
        ${running ? '' : `<button class="btn" data-action="start-other">${icon('plus')}Anderes Training starten oder nachtragen</button>`}
      </section>

      <section class="card">
        <div class="section-head"><h2>Diese Woche</h2><a class="small" href="#/auswertung/woche">Wochenauswertung</a></div>
        <ul class="week-strip" aria-label="Wochenübersicht">${strip}</ul>
        ${feedbackList([wk.msgs[0]], { linkExercises: false })}
      </section>

      ${last ? `<section class="card">
        <div class="section-head"><h2>Letztes Training</h2><a class="small" href="#/verlauf/${last.id}">Details</a></div>
        <p><strong>${esc(last.title)}</strong> · ${fmtDate(last.date)} (${relativeLabel(last.date, today)})</p>
        <p class="small muted">${esc(sessionSummary(last))}</p>
        ${feedbackList(lastFb, { empty: 'Noch keine Vergleichswerte – ab der zweiten Einheit einer Übung siehst du hier Veränderungen.' })}
      </section>` : ''}

      ${!data.plan ? `<section class="card"><h2>Kein Plan angelegt</h2><p class="muted">Lege einen eigenen Plan an, damit geplante und absolvierte Einheiten verglichen werden können.</p>
        <button class="btn primary" data-action="create-plan">${icon('plus')}Plan erstellen</button></section>` : ''}`,
  };
}

onAction('start-planned', (el) => startTraining({ dayId: el.dataset.id }));
onAction('start-other', () => openStartSheet({}));
onAction('start-free', () => startTraining({ dayId: null }));
// "create-plan" wird in plan.js registriert.
