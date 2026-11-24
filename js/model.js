// Datenmodell und reine Funktionen für Plan, Wochenplan-Historie und Trainingseinheiten.
//
// Aufbau der gespeicherten Daten:
// {
//   version: 1,
//   plan: { id, name, createdAt, days: [{ id, name, weekdays: [0..6], exercises: [PlanExercise] }] } | null,
//   scheduleHistory: [{ from: 'YYYY-MM-DD', slots: [{ weekday, dayId, name }] }],
//   sessions: [Session]
// }
// Jede Session ist ein eigenständiger historischer Eintrag mit einer Kopie der Übungen.
// Planänderungen verändern daher nie bereits erfasste Einheiten.

import { weekdayIndex, eachDay, isValidISO } from './dates.js';
import { parseNum } from './format.js';

export const SCHEMA_VERSION = 1;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function emptyData() {
  return { version: SCHEMA_VERSION, plan: null, scheduleHistory: [], sessions: [] };
}

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyData();
  const d = { ...emptyData(), ...raw };
  if (!Array.isArray(d.sessions)) d.sessions = [];
  if (!Array.isArray(d.scheduleHistory)) d.scheduleHistory = [];
  d.scheduleHistory.sort((a, b) => a.from.localeCompare(b.from));
  d.version = SCHEMA_VERSION;
  return d;
}

export function validateData(raw) {
  const fail = (error) => ({ ok: false, error });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Die Datei enthält keine Trainingsdaten.');
  if (raw.plan != null && (typeof raw.plan !== 'object' || !Array.isArray(raw.plan.days))) {
    return fail('Der Trainingsplan in der Datei ist ungültig.');
  }
  if (!Array.isArray(raw.sessions)) return fail('Die Datei enthält keine Liste von Trainingseinheiten.');
  for (const s of raw.sessions) {
    if (!s || typeof s !== 'object' || !s.id || !isValidISO(s.date) || !Array.isArray(s.exercises)) {
      return fail('Mindestens eine Trainingseinheit in der Datei ist ungültig.');
    }
    for (const ex of s.exercises) {
      if (!ex || typeof ex.name !== 'string' || !Array.isArray(ex.sets)) {
        return fail(`Die Einheit vom ${s.date} enthält eine ungültige Übung.`);
      }
    }
  }
  if (raw.scheduleHistory != null && !Array.isArray(raw.scheduleHistory)) return fail('Der Planverlauf in der Datei ist ungültig.');
  return { ok: true };
}

// Übungen werden über ihren normalisierten Namen verglichen – so bleiben Vergleiche
// auch dann erhalten, wenn eine Übung in einem anderen Trainingstag vorkommt.
export function exerciseKey(name) {
  return String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------- Eingaben für Planübungen ----------

export function parseRepsTarget(value) {
  const m = String(value ?? '').trim().match(/^(\d+)\s*(?:[-–]\s*(\d+))?$/);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  if (min <= 0 || max < min || max > 1000) return null;
  return { min, max };
}

export function fmtRepsTarget(value) {
  const t = parseRepsTarget(value);
  if (!t) return String(value ?? '');
  return t.min === t.max ? String(t.min) : `${t.min}–${t.max}`;
}

// Pausenzeit in Sekunden; akzeptiert auch "1:30".
export function parseRest(value) {
  const s = String(value ?? '').trim();
  if (s === '') return null;
  const mm = s.match(/^(\d+):(\d{1,2})$/);
  if (mm) return Number(mm[1]) * 60 + Number(mm[2]);
  const n = parseNum(s);
  return n == null ? NaN : Math.round(n);
}

export function validateExerciseFields(f) {
  const errors = {};
  const name = String(f.name ?? '').trim();
  if (!name) errors.name = 'Bitte einen Namen eingeben.';
  else if (name.length > 80) errors.name = 'Höchstens 80 Zeichen.';
  const sets = Number(String(f.sets ?? '').trim());
  if (!Number.isInteger(sets) || sets < 1 || sets > 30) errors.sets = 'Ganze Zahl von 1 bis 30.';
  const target = parseRepsTarget(f.reps);
  if (!target) errors.reps = 'Zahl oder Bereich, z. B. 10 oder 8-12.';
  const weightRaw = String(f.weight ?? '').trim();
  const weight = parseNum(weightRaw);
  if (weightRaw !== '' && (weight == null || weight < 0 || weight > 1000)) errors.weight = 'Gewicht in kg, z. B. 62,5.';
  const rest = parseRest(f.rest);
  if (rest != null && (!Number.isFinite(rest) || rest < 0 || rest > 1800)) errors.rest = 'Sekunden (z. B. 90) oder Minuten:Sekunden (1:30).';
  const value = {
    name,
    sets,
    reps: target ? (target.min === target.max ? String(target.min) : `${target.min}-${target.max}`) : '',
    weight: weightRaw === '' ? null : weight,
    rest: rest || null,
    notes: String(f.notes ?? '').trim(),
  };
  return { ok: Object.keys(errors).length === 0, errors, value };
}

// ---------- Plan ----------

export function createPlan(data, name, today) {
  data.plan = { id: uid(), name: String(name ?? '').trim() || 'Mein Trainingsplan', createdAt: today, days: [] };
  recordSchedule(data, today);
  return data.plan;
}

export function deletePlan(data, today) {
  data.plan = null;
  recordSchedule(data, today);
}

export function normWeekdays(list) {
  return [...new Set((list ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b);
}

export function addDay(plan, { name, weekdays = [] }) {
  const day = { id: uid(), name: String(name).trim(), weekdays: normWeekdays(weekdays), exercises: [] };
  plan.days.push(day);
  return day;
}

export function findDay(plan, id) {
  return plan?.days.find((d) => d.id === id) ?? null;
}

export function removeDay(plan, id) {
  const i = plan.days.findIndex((d) => d.id === id);
  if (i >= 0) plan.days.splice(i, 1);
}

// Kopie ohne Wochentage, damit nicht versehentlich doppelt geplant wird.
export function duplicateDay(plan, id) {
  const i = plan.days.findIndex((d) => d.id === id);
  if (i < 0) return null;
  const src = plan.days[i];
  const copy = {
    id: uid(),
    name: `${src.name} (Kopie)`,
    weekdays: [],
    exercises: src.exercises.map((ex) => ({ ...ex, id: uid() })),
  };
  plan.days.splice(i + 1, 0, copy);
  return copy;
}

export function addPlanExercise(day, value) {
  const ex = { id: uid(), ...value };
  day.exercises.push(ex);
  return ex;
}

export function moveItem(arr, index, delta) {
  const j = index + delta;
  if (index < 0 || j < 0 || j >= arr.length) return false;
  [arr[index], arr[j]] = [arr[j], arr[index]];
  return true;
}

// ---------- Wochenplan-Historie ----------
// Bei jeder Planänderung wird festgehalten, welche Trainingstage ab welchem Datum
// geplant sind. So zählen frühere Wochen mit dem damals gültigen Plan.

export function scheduleSnapshot(plan) {
  if (!plan) return [];
  const slots = [];
  for (const day of plan.days) {
    for (const weekday of day.weekdays) slots.push({ weekday, dayId: day.id, name: day.name });
  }
  return slots.sort((a, b) => a.weekday - b.weekday);
}

export function recordSchedule(data, today) {
  const slots = scheduleSnapshot(data.plan);
  const hist = data.scheduleHistory;
  const last = hist[hist.length - 1];
  if (last && JSON.stringify(last.slots) === JSON.stringify(slots)) return;
  if (last && last.from >= today) {
    last.slots = slots;
    const prev = hist[hist.length - 2];
    if (prev && JSON.stringify(prev.slots) === JSON.stringify(slots)) hist.pop();
  } else {
    hist.push({ from: today, slots });
  }
}

export function scheduleAt(data, iso) {
  let found = null;
  for (const s of data.scheduleHistory) {
    if (s.from <= iso) found = s;
    else break;
  }
  return found;
}

export function plannedOn(data, iso) {
  const snap = scheduleAt(data, iso);
  if (!snap) return [];
  const wd = weekdayIndex(iso);
  return snap.slots.filter((s) => s.weekday === wd).map((s) => ({ date: iso, dayId: s.dayId, name: s.name }));
}

export function plannedInRange(data, start, end) {
  return eachDay(start, end).flatMap((d) => plannedOn(data, d));
}

// ---------- Trainingseinheiten ----------

export function sortSessions(list) {
  return [...list].sort(
    (a, b) => a.date.localeCompare(b.date) || (a.completedAt || a.createdAt || '').localeCompare(b.completedAt || b.createdAt || ''),
  );
}

export function completedSessions(data) {
  return sortSessions(data.sessions.filter((s) => s.status === 'completed'));
}

export function activeSession(data) {
  return data.sessions.find((s) => s.status === 'active') ?? null;
}

export function findSession(data, id) {
  return data.sessions.find((s) => s.id === id) ?? null;
}

// Nur abgehakte Sätze mit mindestens einer Wiederholung zählen als absolviert.
export function performedSets(ex) {
  if (ex.skipped) return [];
  return ex.sets
    .filter((s) => s.done && Number(s.reps) > 0)
    .map((s) => ({ reps: Number(s.reps), weight: Number(s.weight) > 0 ? Number(s.weight) : 0 }));
}

export function newSessionExercise({ name, target = null, planExerciseId = null }, lastSets = null) {
  const repsTarget = target ? parseRepsTarget(target.reps) : null;
  const count = target?.sets ?? lastSets?.length ?? 3;
  const sets = Array.from({ length: count }, (_, i) => {
    const last = lastSets?.[i] ?? lastSets?.[lastSets.length - 1] ?? null;
    return {
      reps: repsTarget ? repsTarget.min : (last?.reps ?? null),
      weight: target?.weight ?? (last && last.weight > 0 ? last.weight : null),
      done: false,
    };
  });
  return { id: uid(), name: String(name).trim(), planExerciseId, target, skipped: false, notes: '', sets };
}

// lastSetsFor(name) liefert die zuletzt absolvierten Sätze dieser Übung (für Vorschläge).
export function createSession(data, { dayId = null, date, now = new Date().toISOString(), lastSetsFor = () => null }) {
  const day = dayId ? findDay(data.plan, dayId) : null;
  const session = {
    id: uid(),
    date,
    dayId: day?.id ?? null,
    title: day ? day.name : 'Freies Training',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    notes: '',
    exercises: [],
  };
  if (day) {
    for (const ex of day.exercises) {
      const target = { sets: ex.sets, reps: ex.reps, weight: ex.weight ?? null, rest: ex.rest ?? null, notes: ex.notes ?? '' };
      session.exercises.push(newSessionExercise({ name: ex.name, target, planExerciseId: ex.id }, lastSetsFor(ex.name)));
    }
  }
  data.sessions.push(session);
  return session;
}

export function finishSession(session, now = new Date().toISOString()) {
  session.status = 'completed';
  session.completedAt = session.completedAt || now;
  session.updatedAt = now;
}

// Ersetzt eine abgeschlossene Einheit durch ihre korrigierte Fassung.
export function replaceSession(data, edited, now = new Date().toISOString()) {
  const i = data.sessions.findIndex((s) => s.id === edited.id);
  if (i < 0) return false;
  data.sessions[i] = { ...edited, updatedAt: now, revision: (data.sessions[i].revision ?? 0) + 1 };
  return true;
}

export function deleteSession(data, id) {
  const i = data.sessions.findIndex((s) => s.id === id);
  if (i >= 0) data.sessions.splice(i, 1);
}

export function sessionTotals(session) {
  const t = { exercises: session.exercises.length, performed: 0, skipped: 0, sets: 0, setsSkipped: 0, reps: 0, volume: 0 };
  for (const ex of session.exercises) {
    if (ex.skipped) {
      t.skipped++;
      continue;
    }
    const done = performedSets(ex);
    if (done.length) t.performed++;
    else t.skipped++;
    t.sets += done.length;
    t.setsSkipped += ex.sets.length - done.length;
    for (const s of done) {
      t.reps += s.reps;
      t.volume += s.reps * s.weight;
    }
  }
  return t;
}

export function knownExerciseNames(data) {
  const names = new Map();
  for (const s of data.sessions) for (const ex of s.exercises) names.set(exerciseKey(ex.name), ex.name);
  for (const d of data.plan?.days ?? []) for (const ex of d.exercises) names.set(exerciseKey(ex.name), ex.name);
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'de'));
}
