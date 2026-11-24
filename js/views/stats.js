// Auswertung: Woche, Monat, Gesamt, Übungen und Verlauf einer einzelnen Übung.

import { store } from '../store.js';
import {
  todayISO, isValidISO, startOfWeek, addDays, fmtDate, fmtDateShort, weekLabel, isoWeek, monthKey, monthStart, monthEnd,
  addMonths, monthLabel, weekdayIndex, WEEKDAYS_SHORT, daysBetween, relativeLabel, eachDay,
} from '../dates.js';
import { esc, fmtNum, fmtDelta, plural } from '../format.js';
import { completedSessions, plannedOn } from '../model.js';
import {
  buildExerciseIndex, weekFeedback, monthFeedback, weekStats, monthStats, overallStats, overallFeedback,
  analyzeExercise, exerciseFeedback, describeSets, describeTop, describeDiff, periodMuscleSets,
} from '../analytics.js';
import { catalogFor, MUSCLES } from '../catalog.js';
import { feedbackList, verdictBadge, trendBadge, icon } from '../ui.js';
import { chartSlot } from '../charts.js';
import { emptyState, refsTable, weekdayOf, musclesText, unitShort } from './common.js';

// Balken: Sätze je Muskelgruppe im Zeitraum (laut Katalog).
function muscleCard(data, start, end, title) {
  const ms = periodMuscleSets(data, start, end);
  if (!ms.list.length && !ms.unassigned) return '';
  const max = Math.max(1, ...ms.list.map((m) => m.sets));
  return `<section class="card"><h2>${esc(title)}</h2>
    <p class="small muted">Sätze, an denen der Bereich laut Übungskatalog beteiligt ist – ein Satz zählt für jeden beteiligten Bereich.</p>
    <div class="muscle-bars">${ms.list.map((m) => `
      <div class="mb-row"><span>${esc(m.label)}</span><span class="mb-track" aria-hidden="true"><span style="width:${Math.round((m.sets / max) * 100)}%"></span></span><strong>${m.sets}</strong></div>`).join('')}</div>
    ${ms.missing.length ? `<p class="small" style="margin-top:12px"><strong>Ohne Satz:</strong> ${esc(ms.missing.map((m) => MUSCLES[m]).join(', '))}</p>` : ''}
    ${ms.unassigned ? `<p class="small muted">${plural(ms.unassigned, 'Satz', 'Sätze')} aus eigenen Übungen ohne Katalogeintrag sind nicht zugeordnet.</p>` : ''}
  </section>`;
}

const MODES = [['woche', 'Woche'], ['monat', 'Monat'], ['gesamt', 'Gesamt'], ['uebungen', 'Fortschritt']];

function modeNav(active) {
  return `<nav class="segmented" aria-label="Auswertungszeitraum">${MODES.map(([k, l]) => `<a href="#/auswertung/${k}" ${k === active ? 'aria-current="page" class="on"' : ''}>${l}</a>`).join('')}</nav>`;
}

function deltaTag(diff, frac = 0, unit = '') {
  const r = Math.round(diff * 10 ** frac) / 10 ** frac;
  const cls = r > 0 ? 'up' : r < 0 ? 'down' : 'flat';
  const ic = r > 0 ? 'arrowUp' : r < 0 ? 'arrowDown' : 'equal';
  return `<span class="delta ${cls}">${icon(ic)}${fmtDelta(r, unit, frac)}</span>`;
}

function tile(label, value, prev, avgVal, prevLabel, avgLabel, { unit = '', frac = 0 } = {}) {
  return `<div class="tile">
    <span class="tile-label">${label}</span>
    <strong class="tile-value">${fmtNum(value, frac)}${unit}</strong>
    <span class="tile-sub">${deltaTag(value - prev, frac, unit)} ggü. ${prevLabel}</span>
    ${avgVal != null ? `<span class="tile-sub muted">Ø ${avgLabel}: ${fmtNum(avgVal, 1)}${unit}</span>` : ''}
  </div>`;
}

function avgOf(list, key) {
  return list.length ? list.reduce((a, x) => a + x[key], 0) / list.length : null;
}

// Beginn der Aufzeichnungen (erste Einheit oder erster Plan) – Zeiträume davor zählen nicht in Durchschnitte.
function dataStart(data) {
  const first = completedSessions(data)[0]?.date;
  const plan = data.scheduleHistory[0]?.from;
  if (!first) return plan ?? null;
  return plan && plan < first ? plan : first;
}

function coveredPeriods(list, data) {
  const start = dataStart(data);
  return start ? list.filter((p) => p.start >= start) : [];
}

function avgLabel(n, one, many) {
  return n === 1 ? `Vor${one}` : `${n} ${many} davor`;
}

function adherenceHero(st, periodWord) {
  const pct = st.plannedCount ? Math.min(100, Math.round((st.count / st.plannedCount) * 100)) : null;
  return `<div class="hero-stat">
    <div><strong class="hero-num">${st.count}${st.plannedCount ? `<span class="hero-of"> / ${st.plannedCount}</span>` : ''}</strong>
    <span class="hero-label">${st.plannedCount ? `geplante Einheiten ${periodWord} absolviert` : `${st.count === 1 ? 'Einheit' : 'Einheiten'} ${periodWord} – kein Training geplant`}</span></div>
    ${pct != null ? `<div class="meter" role="meter" aria-valuemin="0" aria-valuemax="${st.plannedCount}" aria-valuenow="${Math.min(st.count, st.plannedCount)}" aria-label="Plan-Erfüllung"><span style="width:${pct}%"></span></div>` : ''}
    ${st.ongoing && st.plannedCount ? `<span class="small muted">Bis heute geplant: ${st.plannedToDate}</span>` : ''}
  </div>`;
}

function periodNav(prevHref, label, nextHref, todayHref) {
  return `<div class="period-nav">
    <a class="icon-btn" href="${prevHref}" aria-label="Vorheriger Zeitraum">${icon('back')}</a>
    <strong>${esc(label)}</strong>
    ${nextHref ? `<a class="icon-btn" href="${nextHref}" aria-label="Nächster Zeitraum">${icon('next')}</a>` : '<span class="icon-btn" aria-hidden="true"></span>'}
  </div>${todayHref ? `<p class="center"><a class="small" href="${todayHref}">Zum aktuellen Zeitraum</a></p>` : ''}`;
}

export function statsView([mode, param]) {
  const base = { tab: 'auswertung' };
  if (mode === 'woche') return { ...base, title: 'Auswertung · Woche', html: modeNav(mode) + weekMode(param) };
  if (mode === 'monat') return { ...base, title: 'Auswertung · Monat', html: modeNav(mode) + monthMode(param) };
  if (mode === 'gesamt') return { ...base, title: 'Auswertung · Gesamt', html: modeNav(mode) + overallMode(param) };
  return { ...base, title: 'Auswertung · Übungen', html: modeNav('uebungen') + exercisesMode() };
}

// ---------- Woche ----------

function weekMode(param) {
  const data = store.data;
  const today = todayISO();
  const curW = startOfWeek(today);
  const ws = param && isValidISO(param) ? startOfWeek(param) : curW;
  const index = buildExerciseIndex(data);
  const fb = weekFeedback(data, index, ws, today);
  const st = fb.stats;
  const prev4 = coveredPeriods([1, 2, 3, 4].map((k) => weekStats(data, addDays(ws, -7 * k), today)), data);
  const prevLbl = avgLabel(prev4.length, 'woche', 'Wochen');
  const done = completedSessions(data);

  const days = eachDay(ws, addDays(ws, 6)).map((d) => {
    const planned = plannedOn(data, d);
    const sessions = done.filter((s) => s.date === d);
    const plannedHtml = planned.map((p) => `<span class="chip">${esc(p.name)}</span>`).join('');
    const doneHtml = sessions.map((s) => `<a class="chip chip-done" href="#/verlauf/${s.id}">${icon('check')}${esc(s.title)}</a>`).join('');
    const status = sessions.length ? '' : planned.length ? (d < today ? '<span class="small muted">nicht absolviert</span>' : '<span class="small muted">geplant</span>') : '';
    return `<li class="day-row ${d === today ? 'is-today' : ''}">
      <span class="dr-date"><strong>${weekdayOf(d)}</strong><small>${fmtDateShort(d)}</small></span>
      <span class="dr-body">${planned.length ? `<span class="dr-planned"><span class="sr-only">Geplant: </span>${plannedHtml}</span>` : ''}
        ${sessions.length ? `<span class="dr-done"><span class="sr-only">Absolviert: </span>${doneHtml}</span>` : ''} ${status}
        ${!planned.length && !sessions.length ? '<span class="small muted">–</span>' : ''}</span>
    </li>`;
  }).join('');

  const rows = [];
  for (let k = 0; k < 8; k++) {
    const w = addDays(ws, -7 * k);
    const s = k === 0 ? st : weekStats(data, w, today);
    rows.push(`<tr ${k === 0 ? 'class="is-current"' : ''}><th scope="row"><a href="#/auswertung/woche/${w}">KW ${isoWeek(w).week}</a><span class="small muted block">${fmtDateShort(w)}–${fmtDateShort(addDays(w, 6))}</span></th>
      <td>${s.count}${s.plannedCount ? ` / ${s.plannedCount}` : ''}</td><td>${s.sets}</td><td>${fmtNum(s.reps)}</td><td>${fmtNum(s.volume, 0)} kg</td></tr>`);
  }

  const nextW = addDays(ws, 7);
  return `
    ${periodNav(`#/auswertung/woche/${addDays(ws, -7)}`, weekLabel(ws), nextW <= addDays(curW, 28) ? `#/auswertung/woche/${nextW}` : null, ws !== curW ? '#/auswertung/woche' : null)}
    <section class="card">${adherenceHero(st, st.ongoing ? 'diese Woche' : 'in dieser Woche')}
      <ul class="day-list">${days}</ul></section>
    <div class="tiles">
      ${tile('Einheiten', st.count, fb.prev.count, avgOf(prev4, 'count'), 'Vorwoche', prevLbl)}
      ${tile('Sätze', st.sets, fb.prev.sets, avgOf(prev4, 'sets'), 'Vorwoche', prevLbl)}
      ${tile('Wiederholungen', st.reps, fb.prev.reps, avgOf(prev4, 'reps'), 'Vorwoche', prevLbl)}
      ${tile('Volumen', st.volume, fb.prev.volume, avgOf(prev4, 'volume'), 'Vorwoche', prevLbl, { unit: ' kg' })}
    </div>
    ${st.ongoing ? '<p class="small muted">Die aktuelle Woche läuft noch – Vergleiche mit abgeschlossenen Wochen sind vorläufig.</p>' : ''}
    <section class="card"><h2>Feedback</h2>${feedbackList(fb.msgs.filter((m) => m.kind !== 'muscles'))}</section>
    ${muscleCard(data, ws, addDays(ws, 6), 'Trainierte Bereiche')}
    <section class="card"><h2>Wochenvergleich</h2>
      <div class="table-wrap"><table class="table num">
        <thead><tr><th scope="col">Woche</th><th scope="col">Einheiten (absolviert / geplant)</th><th scope="col">Sätze</th><th scope="col">Wdh.</th><th scope="col">Volumen</th></tr></thead>
        <tbody>${rows.join('')}</tbody></table></div></section>`;
}

// ---------- Monat ----------

function monthMode(param) {
  const data = store.data;
  const today = todayISO();
  const curM = monthKey(today);
  const mk = param && /^\d{4}-\d{2}$/.test(param) ? param : curM;
  const index = buildExerciseIndex(data);
  const fb = monthFeedback(data, index, mk, today);
  const st = fb.stats;
  const prev3 = coveredPeriods([1, 2, 3].map((k) => monthStats(data, addMonths(mk, -k), today)), data);
  const prevLbl = avgLabel(prev3.length, 'monat', 'Monate');
  const done = completedSessions(data);

  const start = monthStart(mk);
  const lead = weekdayIndex(start);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cal-cell cal-blank" aria-hidden="true"></span>');
  for (const d of eachDay(start, monthEnd(mk))) {
    const sessions = done.filter((s) => s.date === d);
    const planned = plannedOn(data, d).length;
    const state = sessions.length ? 'done' : planned ? (d < today ? 'missed' : 'planned') : '';
    const label = `${fmtDate(d)}: ${sessions.length ? `${plural(sessions.length, 'Einheit', 'Einheiten')} absolviert` : planned ? (d < today ? 'geplant, nicht absolviert' : 'geplant') : 'kein Training'}`;
    const inner = `<span class="cal-num">${Number(d.slice(8))}</span><span class="cal-mark" aria-hidden="true"></span>`;
    cells.push(sessions.length
      ? `<a class="cal-cell ${state} ${d === today ? 'is-today' : ''}" href="#/verlauf/${sessions[0].id}" title="${label}" aria-label="${label}">${inner}</a>`
      : `<span class="cal-cell ${state} ${d === today ? 'is-today' : ''}" title="${label}" aria-label="${label}">${inner}</span>`);
  }

  const weekRows = [];
  for (let w = startOfWeek(start); w <= monthEnd(mk); w = addDays(w, 7)) {
    const s = weekStats(data, w, today);
    weekRows.push(`<tr><th scope="row"><a href="#/auswertung/woche/${w}">KW ${isoWeek(w).week}</a><span class="small muted block">${fmtDateShort(w)}–${fmtDateShort(addDays(w, 6))}</span></th><td>${s.count}${s.plannedCount ? ` / ${s.plannedCount}` : ''}</td><td>${s.sets}</td><td>${fmtNum(s.volume, 0)} kg</td></tr>`);
  }

  const compRows = fb.comps.map((c) => `<tr>
      <th scope="row"><a href="#/uebung/${encodeURIComponent(c.key)}">${esc(c.name)}</a></th>
      <td>${fmtDate(c.cur.date)}<span class="small block">${esc(describeSets(c.cur))}</span></td>
      <td>${c.ref ? `${fmtDate(c.ref.date)}<span class="small block">${esc(describeSets(c.ref))}</span>` : '<span class="muted">–</span>'}</td>
      <td>${c.cmp ? `${verdictBadge(c.cmp.verdict)}<span class="small muted block">${esc(describeDiff(c.cmp))}</span>` : '<span class="badge">erstmals</span>'}</td></tr>`).join('');

  const monthRows = [];
  for (let k = 0; k < 6; k++) {
    const m = addMonths(mk, -k);
    const s = k === 0 ? st : monthStats(data, m, today);
    monthRows.push(`<tr ${k === 0 ? 'class="is-current"' : ''}><th scope="row"><a href="#/auswertung/monat/${m}">${monthLabel(m)}</a></th><td>${s.count}${s.plannedCount ? ` / ${s.plannedCount}` : ''}</td><td>${s.sets}</td><td>${fmtNum(s.volume, 0)} kg</td></tr>`);
  }

  const nextM = addMonths(mk, 1);
  return `
    ${periodNav(`#/auswertung/monat/${addMonths(mk, -1)}`, monthLabel(mk), nextM <= addMonths(curM, 1) ? `#/auswertung/monat/${nextM}` : null, mk !== curM ? '#/auswertung/monat' : null)}
    <section class="card">${adherenceHero(st, st.ongoing ? 'diesen Monat' : 'in diesem Monat')}
      <div class="calendar" role="group" aria-label="Kalender ${monthLabel(mk)}">
        ${WEEKDAYS_SHORT.map((w) => `<span class="cal-head">${w}</span>`).join('')}${cells.join('')}
      </div>
      <p class="legend small"><span class="lg lg-done"></span>absolviert <span class="lg lg-missed"></span>geplant, nicht absolviert <span class="lg lg-planned"></span>geplant</p>
    </section>
    <div class="tiles">
      ${tile('Einheiten', st.count, fb.prev.count, avgOf(prev3, 'count'), 'Vormonat', prevLbl)}
      ${tile('Sätze', st.sets, fb.prev.sets, avgOf(prev3, 'sets'), 'Vormonat', prevLbl)}
      ${tile('Wiederholungen', st.reps, fb.prev.reps, avgOf(prev3, 'reps'), 'Vormonat', prevLbl)}
      ${tile('Volumen', st.volume, fb.prev.volume, avgOf(prev3, 'volume'), 'Vormonat', prevLbl, { unit: ' kg' })}
    </div>
    ${st.ongoing ? '<p class="small muted">Der aktuelle Monat läuft noch – Vergleiche sind vorläufig.</p>' : ''}
    <section class="card"><h2>Feedback</h2>${feedbackList(fb.msgs)}</section>
    ${compRows ? `<section class="card"><h2>Übungen im Vergleich zum Stand davor</h2>
      <p class="small muted">Letzte Ausführung im Monat vs. letzte Ausführung vor Monatsbeginn – auch wenn diese länger zurückliegt.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th scope="col">Übung</th><th scope="col">Zuletzt im Monat</th><th scope="col">Stand davor</th><th scope="col">Veränderung</th></tr></thead>
        <tbody>${compRows}</tbody></table></div></section>` : ''}
    <section class="card"><h2>Wochen in diesem Monat</h2>
      <div class="table-wrap"><table class="table num">
        <thead><tr><th scope="col">Woche</th><th scope="col">Einheiten (absolviert / geplant)</th><th scope="col">Sätze</th><th scope="col">Volumen</th></tr></thead>
        <tbody>${weekRows.join('')}</tbody></table></div></section>
    <section class="card"><h2>Monatsvergleich</h2>
      <div class="table-wrap"><table class="table num">
        <thead><tr><th scope="col">Monat</th><th scope="col">Einheiten (absolviert / geplant)</th><th scope="col">Sätze</th><th scope="col">Volumen</th></tr></thead>
        <tbody>${monthRows.join('')}</tbody></table></div></section>`;
}

// ---------- Gesamt ----------

function overallMode(param) {
  const data = store.data;
  const today = todayISO();
  const index = buildExerciseIndex(data);
  const ov = overallStats(data, index, today);
  const msgs = overallFeedback(data, ov, today);
  if (ov.empty) return `<section class="card"><h2>Gesamtbild</h2>${feedbackList(msgs)}</section>`;

  const showAll = param === 'alle';
  const weeks = showAll ? ov.weeks : ov.weeks.slice(-26);
  const chart = chartSlot({
    type: 'columns', integer: true,
    ariaLabel: `Absolvierte und geplante Einheiten pro Woche, ${weeks.length} Wochen`,
    items: weeks.map((w) => ({
      label: fmtDateShort(w.start),
      value: w.count,
      ref: w.plannedCount || null,
      tip: `<strong>KW ${isoWeek(w.start).week}</strong> · ${fmtDateShort(w.start)}–${fmtDate(w.end)}<br>Absolviert: ${w.count}<br>Geplant: ${w.plannedCount || '–'}`,
    })),
  });
  const adh = ov.adherence ? Math.round((ov.adherence.done / ov.adherence.planned) * 100) : null;

  const exRows = ov.exercises.map((an) => {
    const first = an.entries[0];
    return `<tr>
      <th scope="row"><a href="#/uebung/${encodeURIComponent(an.key)}">${esc(an.name)}</a></th>
      <td>${an.count}</td>
      <td>${fmtDate(first.date)}<span class="small block">${esc(describeTop(first, an.weighted))}</span></td>
      <td>${fmtDate(an.latest.date)}<span class="small block">${esc(describeTop(an.latest, an.weighted))}</span></td>
      <td>${fmtDate(an.best.date)}<span class="small block">${esc(describeTop(an.best, an.weighted))}</span></td>
      <td>${trendBadge(an.trend)}</td></tr>`;
  }).join('');

  const monthRows = [...ov.months].reverse().map((m) => `<tr><th scope="row"><a href="#/auswertung/monat/${monthKey(m.start)}">${monthLabel(monthKey(m.start))}</a></th>
    <td>${m.count}${m.plannedCount ? ` / ${m.plannedCount}` : ''}</td><td>${m.sets}</td><td>${fmtNum(m.reps)}</td><td>${fmtNum(m.volume, 0)} kg</td></tr>`).join('');

  return `
    <div class="tiles">
      <div class="tile"><span class="tile-label">Einheiten gesamt</span><strong class="tile-value">${ov.count}</strong><span class="tile-sub muted">seit ${fmtDate(ov.firstDate)}</span></div>
      <div class="tile"><span class="tile-label">Ø pro Woche</span><strong class="tile-value">${ov.avgPerWeek != null ? fmtNum(ov.avgPerWeek, 1) : '–'}</strong><span class="tile-sub muted">${ov.completeWeeks ? `${plural(ov.completeWeeks, 'abgeschlossene Woche', 'abgeschlossene Wochen')}` : 'noch keine Woche abgeschlossen'}</span></div>
      <div class="tile"><span class="tile-label">Plan-Erfüllung</span><strong class="tile-value">${adh != null ? `${adh} %` : '–'}</strong><span class="tile-sub muted">${ov.adherence ? `${ov.adherence.done} von ${ov.adherence.planned} geplanten` : 'noch keine Woche mit Plan abgeschlossen'}</span></div>
      <div class="tile"><span class="tile-label">Wochen in Folge</span><strong class="tile-value">${ov.streak}</strong><span class="tile-sub muted">längste Serie: ${ov.longest}</span></div>
    </div>
    <section class="card">
      <div class="section-head"><h2>Einheiten pro Woche</h2>
        <a class="small" href="#/auswertung/gesamt${showAll ? '' : '/alle'}">${showAll ? 'Letzte 26 Wochen' : `Alle ${ov.weeks.length} Wochen`}</a></div>
      <p class="legend small"><span class="lg lg-bar"></span>absolviert <span class="lg lg-ref"></span>geplant</p>
      ${chart}
    </section>
    <section class="card"><h2>Gesamtbild & Feedback</h2>${feedbackList(msgs)}</section>
    <section class="card"><h2>Fortschritt pro Übung</h2>
      <p class="small muted">Bester Satz jeweils: Gewicht × Wiederholungen (bei Übungen ohne Gewicht: meiste Wiederholungen in einem Satz). Trend über die gesamte Historie.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th scope="col">Übung</th><th scope="col">Einheiten</th><th scope="col">Erste</th><th scope="col">Aktuell</th><th scope="col">Bestleistung</th><th scope="col">Trend</th></tr></thead>
        <tbody>${exRows}</tbody></table></div></section>
    <section class="card"><h2>Alle Monate</h2>
      <div class="table-wrap"><table class="table num">
        <thead><tr><th scope="col">Monat</th><th scope="col">Einheiten (absolviert / geplant)</th><th scope="col">Sätze</th><th scope="col">Wdh.</th><th scope="col">Volumen</th></tr></thead>
        <tbody>${monthRows}</tbody></table></div></section>`;
}

// ---------- Übungen ----------

function exercisesMode() {
  const data = store.data;
  const today = todayISO();
  const index = buildExerciseIndex(data);
  const list = [...index.values()].map((rec) => analyzeExercise(rec)).sort((a, b) => b.latest.date.localeCompare(a.latest.date) || a.name.localeCompare(b.name, 'de'));
  if (!list.length) return emptyState('Noch keine Übungsdaten', 'Sobald du ein Training mit abgehakten Sätzen abschließt, siehst du hier den Verlauf jeder Übung.');
  return `<ul class="list">${list.map((an) => `
    <li><a class="card ex-item" href="#/uebung/${encodeURIComponent(an.key)}">
      <span class="ex-item-main"><strong>${esc(an.name)}</strong>
        <span class="small muted">${plural(an.count, 'Einheit', 'Einheiten')} · zuletzt ${relativeLabel(an.latest.date, today)} (${fmtDate(an.latest.date)})</span>
        <span class="small">Aktuell: ${esc(describeTop(an.latest, an.weighted))} · Bestleistung: ${esc(describeTop(an.best, an.weighted))}</span></span>
      ${trendBadge(an.trend)}
    </a></li>`).join('')}</ul>`;
}

// ---------- Einzelne Übung ----------

const METRICS_W = [
  ['top', 'Schwerster Satz', (e) => e.topWeight, ' kg'],
  ['reps', 'Wdh. im schwersten Satz', (e) => e.repsAtTop, ' Wdh.', true],
  ['volume', 'Volumen', (e) => e.volume, ' kg'],
  ['e1rm', 'Geschätztes 1RM', (e) => e.e1rm, ' kg'],
];
const METRICS_BW = [
  ['max', 'Max. Wdh. pro Satz', (e) => e.maxReps, ' Wdh.', true],
  ['total', 'Wdh. gesamt', (e) => e.totalReps, ' Wdh.', true],
];
const metricsTime = (unit) => [
  ['max', 'Längster Satz', (e) => e.maxReps, ` ${unitShort(unit)}`, true],
  ['total', 'Gesamtdauer', (e) => e.totalReps, ` ${unitShort(unit)}`, true],
];

export function exerciseView([key], params) {
  const data = store.data;
  const today = todayISO();
  const rec = buildExerciseIndex(data).get(key);
  if (!rec) {
    return {
      title: 'Übung', tab: 'auswertung', back: '#/auswertung/uebungen',
      html: emptyState('Noch keine Daten', 'Zu dieser Übung gibt es noch keine abgeschlossenen Sätze.'),
    };
  }
  const an = analyzeExercise(rec);
  const unit = rec.unit ?? 'wdh';
  const metrics = unit !== 'wdh' ? metricsTime(unit) : an.weighted ? METRICS_W : METRICS_BW;
  const cat = catalogFor({ name: rec.name, catalogId: rec.catalogId });
  const m = metrics.find((x) => x[0] === params.get('m')) ?? metrics[0];
  const [mKey, mLabel, mFn, mUnit, mInt] = m;
  const entries = an.entries.filter((e) => mFn(e) != null && (!an.weighted || e.weighted || mKey === 'volume'));
  const first = entries[0];
  const chart = entries.length
    ? chartSlot({
      type: 'line', unit: mUnit, integer: Boolean(mInt),
      ariaLabel: `${mLabel} von ${an.name} über ${entries.length} Einheiten`,
      points: entries.map((e) => ({
        x: daysBetween(first.date, e.date), value: mFn(e), label: fmtDateShort(e.date),
        tip: `<strong>${fmtDate(e.date)}</strong><br>${esc(describeSets(e))}<br>${esc(mLabel)}: ${fmtNum(mFn(e), 1)}${mUnit}`,
      })),
    })
    : '<p class="muted">Keine Werte für diese Kennzahl.</p>';

  const histRows = [...an.entries].reverse().map((e) => `<tr>
    <th scope="row"><a href="#/verlauf/${e.sessionId}">${fmtDate(e.date)}</a><span class="small muted block">${weekdayOf(e.date)} · ${relativeLabel(e.date, today)}</span></th>
    <td>${esc(describeSets(e))}</td><td>${esc(describeTop(e, an.weighted))}</td><td>${e.totalReps}${unit === 'wdh' ? '' : ` ${unitShort(unit)}`}</td><td>${e.volume ? `${fmtNum(e.volume, 0)} kg` : '–'}</td></tr>`).join('');

  const explain = unit !== 'wdh'
    ? 'Verglichen wird die Dauer: zuerst der längste Satz, dann die Gesamtdauer aller abgehakten Sätze.'
    : an.weighted
      ? 'Verglichen wird zuerst das Gewicht im schwersten Satz, dann die Wiederholungen mit diesem Gewicht; ist beides gleich, entscheidet das Gesamtvolumen (Gewicht × Wiederholungen).'
      : 'Verglichen werden zuerst die meisten Wiederholungen in einem Satz, dann die Wiederholungen insgesamt.';

  return {
    title: an.name, tab: 'auswertung', back: '#/auswertung/uebungen',
    html: `
      <section class="card">
        <span class="eyebrow">Fortschritt</span>
        <h2>${esc(an.name)}</h2>
        ${cat ? `<p class="meta-row">${icon('target')}<span>Trainiert laut Katalog: ${esc(musclesText(cat))}</span></p>
          <p class="small"><a href="#/katalog/${cat.id}">${icon('book')} Anleitung und Quelle ansehen</a></p>` : '<p class="small muted">Eigene Übung ohne Katalogeintrag.</p>'}
        <p class="small muted">${esc(explain)} Alle Angaben beruhen auf deinen gespeicherten Einheiten.</p>
      </section>
      <div class="tiles">
        <div class="tile"><span class="tile-label">Einheiten</span><strong class="tile-value">${an.count}</strong><span class="tile-sub muted">seit ${fmtDate(an.entries[0].date)}</span></div>
        <div class="tile"><span class="tile-label">Zuletzt</span><strong class="tile-value tv-small">${esc(describeTop(an.latest, an.weighted))}</strong><span class="tile-sub muted">${fmtDate(an.latest.date)}</span></div>
        <div class="tile"><span class="tile-label">Bestleistung</span><strong class="tile-value tv-small">${esc(describeTop(an.best, an.weighted))}</strong><span class="tile-sub muted">${fmtDate(an.best.date)}</span></div>
        <div class="tile"><span class="tile-label">Langfristiger Trend</span><strong class="tile-value tv-small">${trendBadge(an.trend)}</strong><span class="tile-sub muted">${an.trend.status === 'ok' ? `${fmtDelta(an.trend.pct, ' %')} · ${an.trend.n} Einheiten` : 'zu wenig Daten'}</span></div>
      </div>
      <section class="card">
        <h2>${esc(mLabel)} im Verlauf</h2>
        <nav class="segmented small" aria-label="Kennzahl">${metrics.map((x) => `<a href="#/uebung/${encodeURIComponent(key)}?m=${x[0]}" ${x[0] === mKey ? 'aria-current="true" class="on"' : ''}>${esc(x[1])}</a>`).join('')}</nav>
        ${chart}
      </section>
      <section class="card"><h2>Feedback</h2>${feedbackList(exerciseFeedback(an, today), { linkExercises: false })}</section>
      <section class="card"><h2>Vergleiche</h2>${refsTable(an)}</section>
      <section class="card"><h2>Alle Einheiten (${an.count})</h2>
        <div class="table-wrap"><table class="table" data-unit="${unit}">
          <thead><tr><th scope="col">Datum</th><th scope="col">Sätze</th><th scope="col">Bester Satz</th><th scope="col">${unit === 'wdh' ? 'Wdh. gesamt' : 'Gesamtdauer'}</th><th scope="col">Volumen</th></tr></thead>
          <tbody>${histRows}</tbody></table></div></section>
      <details class="card method"><summary>Wie wird verglichen?</summary>
        <p class="small">Mit Gewicht zählt zuerst das Gewicht im schwersten Satz, dann die Wiederholungen mit diesem Gewicht; ist beides gleich, entscheidet das Gesamtvolumen (Gewicht × Wiederholungen). Ohne Gewicht zählen die meisten Wiederholungen in einem Satz und dann die Gesamtwiederholungen.
        „Gemischt“ bedeutet: ein Wert ist gestiegen, ein anderer gesunken. Nur abgehakte Sätze zählen.</p>
        <p class="small">Der langfristige Trend vergleicht die ersten mit den letzten Einheiten (ab 6 Einheiten jeweils den Durchschnitt aus 3). Bei Übungen mit Gewicht wird dafür das geschätzte Einwiederholungsmaximum (1RM nach Epley: Gewicht × (1 + Wdh./30)) genutzt, weil es Gewichts- und Wiederholungsänderungen zusammenfasst. Änderungen unter 2,5 % gelten als stabil. Ein Trend wird erst ab 3 Einheiten über mindestens 2 Wochen angezeigt.</p>
      </details>`,
  };
}
