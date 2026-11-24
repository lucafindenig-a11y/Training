// Verlauf aller Trainingseinheiten und Detailansicht einer Einheit mit Vergleichen.

import { store } from '../store.js';
import { todayISO, toISO, fmtDate, fmtDateLong, monthKey, monthLabel, startOfWeek } from '../dates.js';
import { esc, fmtNum, plural } from '../format.js';
import { findSession, activeSession, sortSessions, exerciseKey, sessionTotals, performedSets } from '../model.js';
import { buildExerciseIndex, analyzeExercise, exerciseFeedback, weekFeedback } from '../analytics.js';
import { onAction, feedbackList, icon } from '../ui.js';
import { sessionSummary, emptyState, openStartSheet, weekdayOf, refsTable } from './common.js';
import { hasUnsavedDraft } from './session.js';

export function historyView() {
  const data = store.data;
  const running = activeSession(data);
  const done = sortSessions(data.sessions.filter((s) => s.status === 'completed')).reverse();
  const groups = new Map();
  for (const s of done) {
    const mk = monthKey(s.date);
    if (!groups.has(mk)) groups.set(mk, []);
    groups.get(mk).push(s);
  }
  const list = [...groups.entries()].map(([mk, sessions]) => `
    <h2 class="group-title">${monthLabel(mk)} <span class="muted">· ${plural(sessions.length, 'Einheit', 'Einheiten')}</span></h2>
    <ul class="list">${sessions.map((s) => `
      <li><a class="card session-item" href="#/verlauf/${s.id}">
        <span class="date-badge"><small>${weekdayOf(s.date)}</small><strong>${s.date.slice(8)}</strong></span>
        <span class="si-main"><strong>${esc(s.title)}</strong><span class="small muted">${esc(sessionSummary(s))}</span></span>
        ${s.revision ? '<span class="badge">korrigiert</span>' : ''}
      </a></li>`).join('')}</ul>`).join('');

  return {
    title: 'Verlauf', tab: 'verlauf',
    html: `
      ${running ? `<a class="card banner-live" href="#/training/${running.id}">${icon('play')}<span><strong>Training läuft: ${esc(running.title)}</strong><span class="small">${fmtDate(running.date)} · weiter erfassen</span></span></a>` : ''}
      <div class="section-head"><p class="muted">${plural(done.length, 'abgeschlossene Einheit', 'abgeschlossene Einheiten')} gespeichert</p>
        <button class="btn small" data-action="history-add">${icon('plus')}Training nachtragen</button></div>
      ${done.length ? list : emptyState('Noch keine Trainings', 'Sobald du ein Training abschließt, erscheint es hier – jede Einheit bleibt dauerhaft gespeichert.')}`,
  };
}

onAction('history-add', () => openStartSheet({}));

export function sessionDetailView([id], params) {
  const data = store.data;
  const s = findSession(data, id);
  if (!s) return { redirect: '#/verlauf' };
  if (s.status === 'active') return { redirect: `#/training/${id}` };
  const today = todayISO();
  const isNew = params.get('neu') === '1';
  const index = buildExerciseIndex(data);
  const t = sessionTotals(s);

  const exercises = s.exercises.map((ex) => {
    const sets = performedSets(ex);
    const setList = ex.sets.map((set) => {
      const ok = !ex.skipped && set.done && Number(set.reps) > 0;
      const txt = `${set.weight ? `${fmtNum(Number(set.weight))} kg × ` : ''}${set.reps ?? 0}`;
      return `<li class="${ok ? '' : 'set-skipped'}">${esc(txt)}${ok ? '' : '<span class="sr-only"> (ausgelassen)</span>'}</li>`;
    }).join('');
    let analysis = '';
    if (sets.length) {
      const rec = index.get(exerciseKey(ex.name));
      const idx = rec ? rec.entries.findIndex((e) => e.sessionId === s.id) : -1;
      if (idx >= 0) {
        const an = analyzeExercise(rec, idx);
        analysis = `${feedbackList(exerciseFeedback(an, today, { brief: true }), { empty: 'Erstes Mal erfasst – noch kein Vergleich möglich.' })}
          ${an.refs.length ? `<details class="refs"><summary>Alle Vergleiche zu früheren Einheiten</summary>${refsTable(an)}</details>` : ''}`;
      }
    }
    return `
      <section class="card">
        <div class="detail-ex-head">
          <h3>${esc(ex.name)}</h3>
          <a class="small" href="#/uebung/${encodeURIComponent(exerciseKey(ex.name))}">Verlauf der Übung</a>
        </div>
        ${ex.skipped || !sets.length ? '<p class="skipped-note">' + icon('skip') + 'Ausgelassen</p>' : ''}
        ${!ex.skipped && ex.sets.length ? `<ol class="set-list">${setList}</ol>` : ''}
        ${ex.notes ? `<p class="small note-inline">${esc(ex.notes)}</p>` : ''}
        ${analysis}
      </section>`;
  }).join('');

  const week = isNew ? weekFeedback(data, index, startOfWeek(s.date), today).msgs[0] : null;

  return {
    title: s.title, tab: 'verlauf', back: '#/verlauf',
    html: `
      ${isNew ? `<p class="success">${icon('check')}Training gespeichert.</p>` : ''}
      ${hasUnsavedDraft(id) ? `<a class="card banner-warn" href="#/training/${id}">Du hast ungespeicherte Korrekturen an dieser Einheit – weiter bearbeiten</a>` : ''}
      <section class="card">
        <span class="eyebrow">${esc(fmtDateLong(s.date))}</span>
        <h2>${esc(s.title)}</h2>
        <div class="kpis small-kpis">
          <div><span>Übungen</span><strong>${t.performed}/${t.exercises}</strong></div>
          <div><span>Sätze</span><strong>${t.sets}</strong></div>
          <div><span>Wiederholungen</span><strong>${fmtNum(t.reps)}</strong></div>
          <div><span>Volumen</span><strong>${t.volume ? `${fmtNum(t.volume, 0)} kg` : '–'}</strong></div>
        </div>
        ${t.setsSkipped || t.skipped ? `<p class="small muted">Ausgelassen: ${t.skipped ? plural(t.skipped, 'Übung', 'Übungen') : ''}${t.skipped && t.setsSkipped ? ', ' : ''}${t.setsSkipped ? plural(t.setsSkipped, 'Satz', 'Sätze') : ''}</p>` : ''}
        ${s.notes ? `<p class="note-inline">${esc(s.notes)}</p>` : ''}
        ${week ? feedbackList([week]) : ''}
        <div class="btn-row">
          <a class="btn" href="#/training/${id}">${icon('edit')}Korrigieren</a>
        </div>
        <p class="small muted">${s.revision ? `Zuletzt korrigiert am ${fmtDate(toISO(new Date(s.updatedAt)))} (${plural(s.revision, 'Korrektur', 'Korrekturen')}).` : ''}</p>
      </section>
      ${exercises || '<p class="muted">Diese Einheit enthält keine Übungen.</p>'}`,
  };
}
