// Auswertungen auf Basis ALLER gespeicherten, abgeschlossenen Trainingseinheiten.
// Alle Funktionen sind rein (keine DOM-Zugriffe) und daher mit node --test prüfbar.

import {
  addDays, daysBetween, startOfWeek, monthKey, monthStart, monthEnd, addMonths, fmtDate,
  relativeLabel, durationLabel, weekdayIndex, WEEKDAYS_SHORT, isoWeek, monthLabel,
} from './dates.js';
import { completedSessions, exerciseKey, performedSets, plannedInRange, sessionTotals, unitOf, UNITS } from './model.js';
import { fmtNum, fmtDelta } from './format.js';
import { catalogFor, MUSCLES } from './catalog.js';

const EPS = 1e-9;
const round2 = (n) => Math.round(n * 100) / 100;
// "… 7/7/6 Wdh.." → "… 7/7/6 Wdh."
const tidy = (m) => ({ ...m, text: m.text.replace(/\.\.$/, '.') });
const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

// ---------- Kennzahlen einer einzelnen Übungsausführung ----------

export function entryMetrics(sets) {
  let totalReps = 0;
  let volume = 0;
  let topWeight = 0;
  let maxReps = 0;
  let e1rm = null;
  for (const s of sets) {
    totalReps += s.reps;
    volume += s.reps * s.weight;
    if (s.weight > topWeight) topWeight = s.weight;
    if (s.reps > maxReps) maxReps = s.reps;
    if (s.weight > 0) {
      // Geschätztes Einwiederholungsmaximum nach Epley – nur für die Trendrichtung.
      const est = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30);
      if (e1rm == null || est > e1rm) e1rm = est;
    }
  }
  let repsAtTop = 0;
  for (const s of sets) if (Math.abs(s.weight - topWeight) < EPS && s.reps > repsAtTop) repsAtTop = s.reps;
  return {
    setCount: sets.length,
    totalReps,
    volume: round2(volume),
    topWeight,
    repsAtTop,
    maxReps,
    e1rm: e1rm == null ? null : round2(e1rm),
    weighted: topWeight > 0,
  };
}

// Schlüssel einer Übungshistorie: Name, bei Zeitübungen zusätzlich die Einheit
// (30 s Plank werden nie mit 30 Wiederholungen verglichen).
export function indexKey(name, unit = 'wdh') {
  const k = exerciseKey(name);
  return unit === 'wdh' ? k : `${k}|${unit}`;
}

// Index aller Übungen: key -> { key, name, unit, entries: [chronologisch] }
export function buildExerciseIndex(data) {
  const map = new Map();
  for (const s of completedSessions(data)) {
    for (const ex of s.exercises) {
      const sets = performedSets(ex);
      if (!sets.length) continue;
      const unit = unitOf(ex);
      const key = indexKey(ex.name, unit);
      if (!map.has(key)) map.set(key, { key, name: ex.name, unit, catalogId: null, entries: [] });
      const rec = map.get(key);
      rec.name = ex.name;
      if (ex.catalogId) rec.catalogId = ex.catalogId;
      const m = entryMetrics(sets);
      // Bei Zeitübungen ist die Dauer das Maß – ein Zusatzgewicht wird angezeigt, aber nicht verglichen.
      if (unit !== 'wdh') {
        m.weighted = false;
        m.e1rm = null;
        m.volume = 0;
      }
      rec.entries.push({ sessionId: s.id, date: s.date, sets, unit, ...m });
    }
  }
  return map;
}

export function isWeighted(entries) {
  return entries.some((e) => e.weighted);
}

// ---------- Vergleiche ----------

function verdictOf(a, b) {
  if (a === 0 && b === 0) return 'gleich';
  if (a >= 0 && b >= 0) return 'besser';
  if (a <= 0 && b <= 0) return 'schlechter';
  return 'gemischt';
}

// Vergleicht cur mit ref. Mit Gewicht: bester Satz (Gewicht, dann Wiederholungen bei
// diesem Gewicht); ist der beste Satz identisch, entscheidet das Gesamtvolumen.
// Ohne Gewicht: meiste Wiederholungen in einem Satz, dann Wiederholungen gesamt.
export function compareEntries(cur, ref, weighted = cur.weighted || ref.weighted) {
  const base = { weighted, unit: cur.unit ?? 'wdh', dVolume: round2(cur.volume - ref.volume), dTotalReps: cur.totalReps - ref.totalReps };
  if (weighted) {
    const dWeight = round2(cur.topWeight - ref.topWeight);
    const dReps = cur.repsAtTop - ref.repsAtTop;
    let verdict = verdictOf(dWeight, dReps);
    if (verdict === 'gleich' && Math.abs(base.dVolume) > EPS) verdict = base.dVolume > 0 ? 'besser' : 'schlechter';
    return { ...base, dWeight, dReps, verdict };
  }
  const dMaxReps = cur.maxReps - ref.maxReps;
  return { ...base, dMaxReps, verdict: verdictOf(dMaxReps, base.dTotalReps) };
}

// > 0, wenn a die bessere Leistung ist (für Bestleistungen).
export function rankCompare(a, b, weighted) {
  if (weighted) return a.topWeight - b.topWeight || a.repsAtTop - b.repsAtTop || a.volume - b.volume;
  return a.maxReps - b.maxReps || a.totalReps - b.totalReps;
}

export function bestEntry(entries, weighted = isWeighted(entries)) {
  let best = null;
  for (const e of entries) if (!best || rankCompare(e, best, weighted) > 0) best = e;
  return best;
}

// ---------- Textbausteine ----------

const short = (unit) => UNITS[unit]?.short ?? 'Wdh.';

export function describeTop(e, weighted) {
  const unit = e.unit ?? 'wdh';
  if (weighted) return `${fmtNum(e.topWeight)} kg × ${e.repsAtTop}`;
  return `${e.maxReps} ${short(unit)}`;
}

// Kompakte Satzliste, z. B. "60 kg × 10/10/8", "60 kg × 10 · 65 kg × 8", "12/10/9 Wdh." oder "45/40 s".
export function describeSets(e) {
  const unit = e.unit ?? 'wdh';
  const suffix = unit === 'wdh' ? '' : ` ${short(unit)}`;
  const weights = [...new Set(e.sets.map((s) => s.weight))];
  if (weights.length === 1) {
    const reps = e.sets.map((s) => s.reps).join('/');
    return weights[0] > 0 ? `${fmtNum(weights[0])} kg × ${reps}${suffix}` : `${reps} ${short(unit)}`;
  }
  return e.sets.map((s) => (s.weight > 0 ? `${fmtNum(s.weight)} kg × ${s.reps}${suffix}` : `${s.reps} ${short(unit)}`)).join(' · ');
}

export function describeDiff(cmp) {
  const parts = [];
  const u = short(cmp.unit);
  if (cmp.weighted) {
    if (cmp.dWeight !== 0) parts.push(fmtDelta(cmp.dWeight, ' kg', 2));
    if (cmp.dReps !== 0) parts.push(`${fmtDelta(cmp.dReps)} Wdh. im schwersten Satz`);
    if (!parts.length && Math.abs(cmp.dVolume) > EPS) parts.push(`Volumen ${fmtDelta(cmp.dVolume, ' kg', 0)}`);
  } else {
    if (cmp.dMaxReps !== 0) parts.push(`${fmtDelta(cmp.dMaxReps)} ${u} im besten Satz`);
    if (cmp.dTotalReps !== 0) parts.push(`${fmtDelta(cmp.dTotalReps)} ${u} gesamt`);
  }
  return parts.length ? parts.join(', ') : 'keine Veränderung';
}

export const VERDICT_LABEL = { besser: 'besser', schlechter: 'schwächer', gleich: 'gleich', gemischt: 'gemischt' };

// ---------- Trend über die gesamte Historie ----------

export function exerciseTrend(entries, weighted = isWeighted(entries)) {
  const pts = weighted ? entries.filter((e) => e.weighted) : entries;
  const n = pts.length;
  const unit = entries[0]?.unit ?? 'wdh';
  const metricLabel = weighted ? 'geschätzte Maximalkraft (1RM)' : unit === 'wdh' ? 'Wiederholungen im besten Satz' : 'Dauer des längsten Satzes';
  if (n < 3) {
    return { status: 'insufficient', n, metricLabel, reason: `Erst ${n === 1 ? 'eine Einheit' : `${n} Einheiten`} erfasst – für eine Trendaussage sind mindestens 3 nötig.` };
  }
  const span = daysBetween(pts[0].date, pts[n - 1].date);
  if (span < 14) {
    return { status: 'insufficient', n, metricLabel, reason: `Die ${n} Einheiten liegen nur ${durationLabel(span)} auseinander – für eine Trendaussage sind mindestens 2 Wochen nötig.` };
  }
  const metric = (e) => (weighted ? e.e1rm : e.maxReps);
  const k = n >= 6 ? 3 : 1;
  const startValue = avg(pts.slice(0, k).map(metric));
  const endValue = avg(pts.slice(-k).map(metric));
  const pct = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
  const dir = pct > 2.5 ? 'steigend' : pct < -2.5 ? 'fallend' : 'stabil';
  return {
    status: 'ok', dir, pct, n, k, span, metricLabel, unit: weighted ? ' kg' : ` ${short(unit)}`,
    startValue: round2(startValue), endValue: round2(endValue), from: pts[0].date, to: pts[n - 1].date,
    first: pts[0], last: pts[n - 1],
  };
}

// ---------- Analyse einer Übung (bis zu einem bestimmten Eintrag) ----------

function findBack(earlier, date, minDays) {
  for (let i = earlier.length - 1; i >= 0; i--) if (daysBetween(earlier[i].date, date) >= minDays) return earlier[i];
  return null;
}

export function analyzeExercise(rec, upto = rec.entries.length - 1) {
  const entries = rec.entries.slice(0, upto + 1);
  const latest = entries[entries.length - 1];
  const earlier = entries.slice(0, -1);
  const weighted = isWeighted(entries);
  const res = {
    key: rec.key, name: rec.name, weighted, latest, entries, count: entries.length,
    previous: earlier[earlier.length - 1] ?? null,
    best: bestEntry(entries, weighted), bestBefore: bestEntry(earlier, weighted),
    refs: [], records: [], lastBetter: null, olderBetter: [], trend: exerciseTrend(entries, weighted),
  };
  if (!earlier.length) return res;

  const add = (label, e) => {
    if (e && !res.refs.some((r) => r.entry === e)) {
      res.refs.push({ label, entry: e, gap: daysBetween(e.date, latest.date), cmp: compareEntries(latest, e, weighted) });
    }
  };
  add('Letzte Einheit davor', res.previous);
  add('Mind. 3 Wochen davor', findBack(earlier, latest.date, 21));
  add('Mind. 2½ Monate davor', findBack(earlier, latest.date, 75));
  add('Erste erfasste Einheit', earlier[0]);
  add('Bisherige Bestleistung', res.bestBefore);

  // Ältere Einheiten (vor der letzten), in denen klar mehr geschafft wurde:
  // die jüngste davon und die bisherige Bestleistung.
  // War schon die letzte Einheit besser, ist eine ältere nur dann zusätzlich interessant,
  // wenn sie noch besser war als diese.
  const older = earlier.slice(0, -1);
  const worseThan = (e) => compareEntries(latest, e, weighted).verdict === 'schlechter';
  const prevBetter = worseThan(res.previous);
  const informative = (e) => worseThan(e) && (!prevBetter || rankCompare(e, res.previous, weighted) > 0);
  res.lastBetter = [...older].reverse().find(informative) ?? null;
  res.olderBetter = [];
  if (res.lastBetter) res.olderBetter.push({ kind: 'recent', entry: res.lastBetter });
  const bb = res.bestBefore;
  if (bb && bb !== res.previous && informative(bb) && !res.olderBetter.some((o) => rankCompare(o.entry, bb, weighted) === 0)) {
    res.olderBetter.push({ kind: 'best', entry: bb });
  }

  // Rekorde – nur, wenn sie eindeutig über allen früheren Einträgen liegen.
  if (weighted) {
    const prevTop = Math.max(...earlier.map((e) => e.topWeight));
    if (latest.topWeight > prevTop + EPS) {
      res.records.push({ type: 'weight', entry: latest, prev: bestEntry(earlier, true) });
    } else {
      let prevReps = null;
      let prevEntry = null;
      for (const e of earlier) {
        for (const s of e.sets) {
          if (Math.abs(s.weight - latest.topWeight) < EPS && (prevReps == null || s.reps > prevReps)) {
            prevReps = s.reps;
            prevEntry = e;
          }
        }
      }
      if (prevReps != null && latest.repsAtTop > prevReps) {
        res.records.push({ type: 'repsAtWeight', entry: latest, weight: latest.topWeight, reps: latest.repsAtTop, prevReps, prev: prevEntry });
      }
    }
  } else {
    const prev = bestEntry(earlier, false);
    if (latest.maxReps > Math.max(...earlier.map((e) => e.maxReps))) res.records.push({ type: 'reps', entry: latest, prev });
  }
  return res;
}

// Feedback-Nachrichten: { tone: 'pos'|'neg'|'neutral'|'info', text, key? }
export function exerciseFeedback(an, today, { brief = false } = {}) {
  const msgs = [];
  const { name, latest, weighted, previous } = an;
  const key = an.key;
  if (an.count === 1) {
    if (!brief) msgs.push({ tone: 'info', key, text: `${name}: Erst eine Einheit erfasst (${fmtDate(latest.date)}) – noch kein Vergleich möglich.` });
    return msgs;
  }
  for (const r of an.records) {
    if (r.type === 'weight') {
      msgs.push({ tone: 'pos', key, text: `${name}: Neues Höchstgewicht am ${fmtDate(latest.date)} – ${describeTop(latest, true)} (bisher ${describeTop(r.prev, true)} am ${fmtDate(r.prev.date)}).` });
    } else if (r.type === 'repsAtWeight') {
      msgs.push({ tone: 'pos', key, text: `${name}: ${r.reps} Wdh. mit ${fmtNum(r.weight)} kg am ${fmtDate(latest.date)} – so viele wie noch nie mit diesem Gewicht (bisher ${r.prevReps} am ${fmtDate(r.prev.date)}).` });
    } else {
      msgs.push({ tone: 'pos', key, text: `${name}: Neuer Bestwert am ${fmtDate(latest.date)} – ${latest.maxReps} Wdh. in einem Satz (bisher ${r.prev.maxReps} am ${fmtDate(r.prev.date)}).` });
    }
  }
  msgs.push(...olderBetterMessages(an, today));
  if (previous) {
    const cmp = compareEntries(latest, previous, weighted);
    const prevTxt = `${fmtDate(previous.date)}: ${describeSets(previous)}`;
    const curTxt = describeSets(latest);
    if (cmp.verdict === 'besser') msgs.push({ tone: 'pos', key, text: `${name}: Mehr als beim letzten Mal (${prevTxt}) – am ${fmtDate(latest.date)}: ${curTxt} (${describeDiff(cmp)}).` });
    else if (cmp.verdict === 'schlechter') msgs.push({ tone: 'neg', key, text: `${name}: Weniger als beim letzten Mal (${prevTxt}) – am ${fmtDate(latest.date)}: ${curTxt} (${describeDiff(cmp)}).` });
    else if (cmp.verdict === 'gleich') msgs.push({ tone: 'neutral', key, text: `${name}: Gleiche Leistung wie beim letzten Mal (${prevTxt}).` });
    else msgs.push({ tone: 'neutral', key, text: `${name}: Anders belastet als beim letzten Mal (${prevTxt}) – am ${fmtDate(latest.date)}: ${curTxt} (${describeDiff(cmp)}).` });
  }
  if (!brief) msgs.push(trendMessage(an));
  return msgs.map(tidy);
}

// "Vor drei Wochen hast du … geschafft, heute waren es …" – für ältere, klar bessere Einheiten.
export function olderBetterMessages(an, today) {
  const cur = `am ${fmtDate(an.latest.date)}${an.latest.date === today ? ' (heute)' : ''} waren es ${describeSets(an.latest)}`;
  return (an.olderBetter ?? []).map(({ kind, entry: e }) => ({
    tone: 'neg', key: an.key,
    text: kind === 'best'
      ? `${an.name}: Deine bisherige Bestleistung war am ${fmtDate(e.date)} (${relativeLabel(e.date, today)}) mit ${describeSets(e)} – ${cur}.`
      : `${an.name}: Am ${fmtDate(e.date)} (${relativeLabel(e.date, today)}) hast du ${describeSets(e)} geschafft – ${cur}.`,
  }));
}

// Langfristige Entwicklung in Alltagssprache – immer mit den konkreten Werten und Daten.
export function trendMessage(an) {
  const t = an.trend;
  if (t.status !== 'ok') return { tone: 'info', key: an.key, text: `${an.name}: ${t.reason}` };
  const tone = t.dir === 'steigend' ? 'pos' : t.dir === 'fallend' ? 'neg' : 'neutral';
  const phrase = t.dir === 'steigend' ? 'zeigt sich ein Aufwärtstrend'
    : t.dir === 'fallend' ? 'zeigt sich ein Abwärtstrend'
      : 'ist deine Leistung etwa gleich geblieben (Veränderung unter 2,5 %)';
  const basis = t.k > 1 ? `Schnitt der ersten und der letzten ${t.k} Einheiten` : 'erste und letzte Einheit';
  const values = an.weighted
    ? `Die geschätzte Maximalkraft (${basis}) ging von ${fmtNum(t.startValue, 1)} auf ${fmtNum(t.endValue, 1)} kg (${fmtDelta(t.pct, ' %')}).`
    : `${t.metricLabel} (${basis}): ${fmtNum(t.startValue, 1)} → ${fmtNum(t.endValue, 1)}${t.unit} (${fmtDelta(t.pct, ' %')}).`;
  return {
    tone, key: an.key,
    text: `${an.name}: Über ${durationLabel(t.span)} und ${t.n} Einheiten ${phrase}. Bester Satz am ${fmtDate(t.from)}: ${describeTop(t.first, an.weighted)}, zuletzt am ${fmtDate(t.to)}: ${describeTop(t.last, an.weighted)}. ${values}`,
  };
}

// ---------- Zeiträume (Woche / Monat) ----------

export function periodStats(data, start, end, today) {
  const sessions = completedSessions(data).filter((s) => s.date >= start && s.date <= end);
  const st = { start, end, sessions, count: sessions.length, sets: 0, setsSkipped: 0, exercisesSkipped: 0, reps: 0, volume: 0, seconds: 0 };
  const keys = new Set();
  for (const s of sessions) {
    const t = sessionTotals(s);
    st.sets += t.sets;
    st.setsSkipped += t.setsSkipped;
    st.exercisesSkipped += t.skipped;
    st.reps += t.reps;
    st.volume += t.volume;
    st.seconds += t.seconds;
    for (const ex of s.exercises) if (performedSets(ex).length) keys.add(indexKey(ex.name, unitOf(ex)));
  }
  st.volume = round2(st.volume);
  st.exercises = keys.size;
  st.planned = plannedInRange(data, start, end);
  st.plannedCount = st.planned.length;
  st.plannedToDate = st.planned.filter((p) => p.date <= today).length;
  st.ongoing = today >= start && today <= end;
  st.future = today < start;
  return st;
}

export function weekStats(data, weekStart, today) {
  return periodStats(data, weekStart, addDays(weekStart, 6), today);
}

export function monthStats(data, mk, today) {
  return periodStats(data, monthStart(mk), monthEnd(mk), today);
}

// Analysen für jede Übung, die im Zeitraum trainiert wurde (Stand: letzte Ausführung im Zeitraum).
export function periodExerciseAnalyses(index, start, end) {
  const out = [];
  for (const rec of index.values()) {
    let idx = -1;
    rec.entries.forEach((e, i) => { if (e.date >= start && e.date <= end) idx = i; });
    if (idx >= 0) out.push(analyzeExercise(rec, idx));
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Vergleich: letzter Stand im Zeitraum vs. letzter Stand vor dem Zeitraum.
export function periodExerciseComparison(index, start, end) {
  const out = [];
  for (const rec of index.values()) {
    const inPeriod = rec.entries.filter((e) => e.date >= start && e.date <= end);
    if (!inPeriod.length) continue;
    const cur = inPeriod[inPeriod.length - 1];
    const before = rec.entries.filter((e) => e.date < start);
    const ref = before[before.length - 1] ?? null;
    const weighted = isWeighted(rec.entries);
    out.push({ key: rec.key, name: rec.name, cur, ref, cmp: ref ? compareEntries(cur, ref, weighted) : null, weighted });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

// Absolvierte Sätze je Muskelgruppe laut Katalog (ein Satz zählt für jede beteiligte Gruppe).
// Eigene Übungen ohne Katalogeintrag werden separat als „nicht zugeordnet“ gezählt.
export const MAIN_MUSCLES = ['brust', 'schultern', 'ruecken', 'bizeps', 'trizeps', 'bauch', 'gesaess', 'oberschenkel', 'waden'];

export function periodMuscleSets(data, start, end) {
  const counts = new Map();
  let unassigned = 0;
  for (const s of completedSessions(data)) {
    if (s.date < start || s.date > end) continue;
    for (const ex of s.exercises) {
      const n = performedSets(ex).length;
      if (!n) continue;
      const entry = catalogFor(ex);
      if (!entry) {
        unassigned += n;
        continue;
      }
      for (const m of entry.muscles) counts.set(m, (counts.get(m) ?? 0) + n);
    }
  }
  const list = [...counts.entries()].map(([id, sets]) => ({ id, label: MUSCLES[id] ?? id, sets })).sort((a, b) => b.sets - a.sets);
  const missing = MAIN_MUSCLES.filter((m) => !counts.has(m));
  return { list, unassigned, missing };
}

function muscleMessage(data, start, end, label) {
  const ms = periodMuscleSets(data, start, end);
  if (!ms.list.length) return null;
  let text = `${label} trainierte Bereiche (Sätze, an denen der Bereich laut Übungskatalog beteiligt ist): ${ms.list.map((m) => `${m.label} ${m.sets}`).join(', ')}.`;
  if (ms.missing.length) text += ` Ohne Satz: ${ms.missing.map((m) => MUSCLES[m]).join(', ')}.`;
  if (ms.unassigned) text += ` ${ms.unassigned} ${ms.unassigned === 1 ? 'Satz' : 'Sätze'} aus eigenen Übungen ohne Katalogeintrag sind nicht zugeordnet.`;
  return { tone: 'neutral', text, kind: 'muscles' };
}

function deltaText(cur, prev, label, unit = '', frac = 0) {
  return `${label} ${fmtNum(prev, frac)}${unit} → ${fmtNum(cur, frac)}${unit} (${fmtDelta(cur - prev, '', frac)})`;
}

function adherenceMessage(st, label, today) {
  const remaining = st.planned.filter((p) => p.date > today);
  if (st.future) {
    return { tone: 'info', text: `${label} sind ${st.plannedCount} Einheiten geplant.` };
  }
  if (st.plannedCount > 0) {
    let text = `${label} hast du ${st.count} von ${st.plannedCount} geplanten Einheiten absolviert.`;
    if (st.ongoing && remaining.length) {
      text += ` Noch geplant: ${remaining.map((p) => `${WEEKDAYS_SHORT[weekdayIndex(p.date)]} ${fmtDate(p.date).slice(0, 6)} (${p.name})`).join(', ')}.`;
    }
    const tone = st.count >= st.plannedCount ? 'pos' : st.ongoing ? 'neutral' : 'neg';
    return { tone, text };
  }
  if (st.count > 0) return { tone: 'neutral', text: `${label} hast du ${st.count} ${st.count === 1 ? 'Einheit' : 'Einheiten'} absolviert – dafür war kein Training geplant.` };
  return { tone: 'info', text: `${label} war kein Training geplant und es wurde keines erfasst.` };
}

export function weekFeedback(data, index, weekStart, today) {
  const st = weekStats(data, weekStart, today);
  const isCurrent = st.ongoing;
  const label = isCurrent ? 'Diese Woche' : `In KW ${isoWeek(weekStart).week}`;
  const msgs = [adherenceMessage(st, label, today)];
  const prev = weekStats(data, addDays(weekStart, -7), today);
  if (!st.future && (st.count || prev.count)) {
    msgs.push({
      tone: 'neutral',
      text: `Vergleich zur Vorwoche${isCurrent ? ' (diese Woche läuft noch)' : ''}: ${deltaText(st.count, prev.count, 'Einheiten')}, ${deltaText(st.sets, prev.sets, 'Sätze')}, ${deltaText(st.volume, prev.volume, 'Volumen', ' kg')}.`,
    });
  }
  const mm = muscleMessage(data, weekStart, addDays(weekStart, 6), isCurrent ? 'Diese Woche' : 'In dieser Woche');
  if (mm) msgs.push(mm);
  for (const an of periodExerciseAnalyses(index, weekStart, addDays(weekStart, 6))) msgs.push(...exerciseFeedback(an, today, { brief: true }));
  return { stats: st, prev, msgs: msgs.map(tidy) };
}

export function monthFeedback(data, index, mk, today) {
  const st = monthStats(data, mk, today);
  const isCurrent = st.ongoing;
  const label = isCurrent ? 'Diesen Monat' : `Im ${monthLabel(mk)}`;
  const msgs = [adherenceMessage(st, label, today)];
  const prevMk = addMonths(mk, -1);
  const prev = monthStats(data, prevMk, today);
  if (!st.future && (st.count || prev.count)) {
    msgs.push({
      tone: 'neutral',
      text: `Vergleich zum ${monthLabel(prevMk)}${isCurrent ? ' (dieser Monat läuft noch)' : ''}: ${deltaText(st.count, prev.count, 'Einheiten')}, ${deltaText(st.sets, prev.sets, 'Sätze')}, ${deltaText(st.volume, prev.volume, 'Volumen', ' kg')}.`,
    });
  }
  const comps = periodExerciseComparison(index, monthStart(mk), monthEnd(mk));
  const withRef = comps.filter((c) => c.cmp);
  if (withRef.length) {
    const count = (v) => withRef.filter((c) => c.cmp.verdict === v).length;
    msgs.push({
      tone: 'neutral',
      text: `Stand am Monatsende vs. letzter Stand davor: ${count('besser')} von ${withRef.length} Übungen besser, ${count('schlechter')} schwächer, ${count('gleich')} gleich, ${count('gemischt')} gemischt.`,
    });
    for (const c of withRef.filter((x) => x.cmp.verdict === 'schlechter')) {
      msgs.push({ tone: 'neg', key: c.key, text: `${c.name}: Zuletzt am ${fmtDate(c.cur.date)} ${describeSets(c.cur)} – vor dem Monat (${fmtDate(c.ref.date)}) waren es ${describeSets(c.ref)}.` });
    }
  }
  if (comps.length && !withRef.length) msgs.push({ tone: 'info', text: 'Für die Übungen dieses Monats gibt es noch keine früheren Einträge zum Vergleich.' });
  return { stats: st, prev, comps, msgs: msgs.map(tidy) };
}

// ---------- Gesamtbild ----------

export function overallStats(data, index, today) {
  const sessions = completedSessions(data);
  if (!sessions.length) return { empty: true };
  const firstDate = sessions[0].date;
  const firstPlan = data.scheduleHistory[0]?.from;
  const startW = startOfWeek(firstPlan && firstPlan < firstDate ? firstPlan : firstDate);
  const curW = startOfWeek(today);
  const weeks = [];
  for (let w = startW; w <= curW; w = addDays(w, 7)) weeks.push(weekStats(data, w, today));
  const months = [];
  for (let m = monthKey(startW < firstDate ? firstDate : startW); m <= monthKey(today); m = addMonths(m, 1)) months.push(monthStats(data, m, today));

  const complete = weeks.filter((w) => !w.ongoing);
  const plannedWeeks = complete.filter((w) => w.plannedCount > 0);
  const adherence = plannedWeeks.length
    ? { done: plannedWeeks.reduce((a, w) => a + Math.min(w.count, w.plannedCount), 0), planned: plannedWeeks.reduce((a, w) => a + w.plannedCount, 0), weeks: plannedWeeks.length }
    : null;

  // Serie: Wochen mit mindestens einer Einheit (aktuelle Woche zählt mit, sobald trainiert wurde).
  let streak = 0;
  let longest = 0;
  let run = 0;
  for (const w of weeks) {
    run = w.count > 0 ? run + 1 : w.ongoing ? run : 0;
    longest = Math.max(longest, run);
  }
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].count > 0) streak++;
    else if (!weeks[i].ongoing) break;
  }

  const totals = sessions.reduce((t, s) => {
    const x = sessionTotals(s);
    t.sets += x.sets; t.reps += x.reps; t.volume += x.volume;
    return t;
  }, { sets: 0, reps: 0, volume: 0 });

  const exercises = [...index.values()].map((rec) => analyzeExercise(rec)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const firstWeekCompleteIdx = weeks.findIndex((w) => w.end >= firstDate);
  const activeComplete = complete.slice(Math.max(0, firstWeekCompleteIdx));
  return {
    empty: false, firstDate, lastDate: sessions[sessions.length - 1].date, count: sessions.length,
    weeks, months, adherence, streak, longest, totals, exercises,
    avgPerWeek: activeComplete.length ? activeComplete.reduce((a, w) => a + w.count, 0) / activeComplete.length : null,
    completeWeeks: activeComplete.length,
  };
}

export function overallFeedback(data, ov, today) {
  if (ov.empty) return [{ tone: 'info', text: 'Noch keine abgeschlossenen Trainingseinheiten gespeichert – sobald du Einheiten erfasst, erscheint hier dein Gesamtbild.' }];
  const msgs = [];
  const spanDays = daysBetween(ov.firstDate, today);
  msgs.push({
    tone: 'neutral',
    text: `Seit dem ${fmtDate(ov.firstDate)} (${relativeLabel(ov.firstDate, today)}) hast du ${ov.count} ${ov.count === 1 ? 'Einheit' : 'Einheiten'} absolviert${ov.avgPerWeek != null ? ` – Ø ${fmtNum(ov.avgPerWeek, 1)} pro abgeschlossener Woche` : ''}.`,
  });
  if (spanDays < 28) msgs.push({ tone: 'info', text: `Deine Daten umfassen erst ${durationLabel(spanDays + 1)}. Für verlässliche langfristige Aussagen sind mindestens 4 Wochen nötig.` });
  if (ov.adherence) {
    const pct = Math.round((ov.adherence.done / ov.adherence.planned) * 100);
    msgs.push({ tone: pct >= 80 ? 'pos' : pct >= 50 ? 'neutral' : 'neg', text: `Plan-Erfüllung in ${ov.adherence.weeks} abgeschlossenen ${ov.adherence.weeks === 1 ? 'Woche' : 'Wochen'} mit Plan: ${ov.adherence.done} von ${ov.adherence.planned} geplanten Einheiten (${pct} %).` });
  }
  if (ov.streak > 1) msgs.push({ tone: 'pos', text: `Du trainierst seit ${ov.streak} Wochen in Folge mindestens einmal pro Woche (längste Serie: ${ov.longest} Wochen).` });

  const withTrend = ov.exercises.filter((a) => a.trend.status === 'ok');
  const lacking = ov.exercises.filter((a) => a.trend.status !== 'ok');
  if (withTrend.length) {
    const c = (d) => withTrend.filter((a) => a.trend.dir === d).length;
    msgs.push({ tone: 'neutral', text: `Langfristige Entwicklung von ${withTrend.length} ${withTrend.length === 1 ? 'Übung' : 'Übungen'} mit genug Daten: ${c('steigend')} steigend, ${c('stabil')} stabil, ${c('fallend')} fallend.` });
    for (const an of withTrend.filter((a) => a.trend.dir === 'fallend')) msgs.push(trendMessage(an));
  }
  if (lacking.length) {
    msgs.push({ tone: 'info', text: `Für ${lacking.length} ${lacking.length === 1 ? 'Übung' : 'Übungen'} reichen die Daten noch nicht für eine Trendaussage (mind. 3 Einheiten über mind. 2 Wochen): ${lacking.map((a) => a.name).join(', ')}.` });
  }
  for (const an of ov.exercises) {
    if (an.previous && compareEntries(an.latest, an.previous, an.weighted).verdict === 'schlechter') {
      msgs.push({ tone: 'neg', key: an.key, text: `${an.name}: Zuletzt am ${fmtDate(an.latest.date)} ${describeSets(an.latest)} – davor am ${fmtDate(an.previous.date)} ${describeSets(an.previous)}.` });
    }
    msgs.push(...olderBetterMessages(an, today));
  }
  // Übungen aus dem aktuellen Plan, die länger nicht absolviert wurden.
  const index = new Map(ov.exercises.map((a) => [a.key, a]));
  const seen = new Set();
  for (const day of data.plan?.days ?? []) {
    if (!day.weekdays.length) continue;
    for (const ex of day.exercises) {
      const key = indexKey(ex.name, unitOf(ex));
      if (seen.has(key)) continue;
      seen.add(key);
      const an = index.get(key);
      if (an && daysBetween(an.latest.date, today) >= 21) {
        msgs.push({ tone: 'info', key, text: `${an.name} steht in deinem Plan, wurde aber zuletzt am ${fmtDate(an.latest.date)} (${relativeLabel(an.latest.date, today)}) absolviert.` });
      }
    }
  }
  return msgs.map(tidy);
}
