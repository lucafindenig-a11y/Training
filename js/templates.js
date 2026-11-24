// Vorgefertigte Trainingspläne und Trainingstage als frei bearbeitbarer Startpunkt.
// Übungen stammen aus dem Katalog; Sätze/Wiederholungen sind Startwerte, die du anpasst.

import { getExercise } from './catalog.js';
import { uid } from './model.js';

// [Katalog-ID, Sätze?, Wiederholungen/Dauer?]
const PUSH = { name: 'Push', focus: ['push'], exercises: [['bankdruecken'], ['kh-schraegbank'], ['schulterdruecken-kh'], ['seitheben'], ['trizeps-pushdown']] };
const PULL = { name: 'Pull', focus: ['pull'], exercises: [['latziehen'], ['kh-rudern'], ['kabelrudern'], ['reverse-fly'], ['hammer-curl']] };
const BEINE = { name: 'Beine', focus: ['beine'], exercises: [['kniebeuge'], ['rumaenisches-kreuzheben'], ['beinpresse'], ['ausfallschritte'], ['wadenheben']] };
const GK_A = { name: 'Ganzkörper A', focus: ['ganzkoerper'], exercises: [['kniebeuge'], ['bankdruecken'], ['kh-rudern'], ['schulterdruecken-kh'], ['plank']] };
const GK_B = { name: 'Ganzkörper B', focus: ['ganzkoerper'], exercises: [['rumaenisches-kreuzheben'], ['liegestuetz'], ['latziehen'], ['ausfallschritte'], ['dead-bug']] };
const OK_A = { name: 'Oberkörper A', focus: ['oberkoerper'], exercises: [['bankdruecken'], ['kabelrudern'], ['schulterdruecken-kh'], ['latziehen'], ['kh-curl'], ['trizeps-pushdown']] };
const UK_A = { name: 'Unterkörper A', focus: ['unterkoerper'], exercises: [['kniebeuge'], ['rumaenisches-kreuzheben'], ['beinbeuger'], ['wadenheben'], ['plank']] };
const OK_B = { name: 'Oberkörper B', focus: ['oberkoerper'], exercises: [['kh-schraegbank'], ['klimmzug'], ['seitheben'], ['kh-rudern'], ['hammer-curl'], ['trizeps-ueberkopf']] };
const UK_B = { name: 'Unterkörper B', focus: ['unterkoerper'], exercises: [['beinpresse'], ['ausfallschritte'], ['glute-bridge'], ['wadenheben'], ['seitstuetz']] };
const ROW_SHORT = { name: 'Rudern (Ausdauer)', focus: ['cardio'], exercises: [['rudergeraet', 1, '20']] };
const INTERVAL = { name: 'Intervall-Zirkel', focus: ['cardio'], exercises: [['squat-jumps', 3, '10'], ['mountain-climber', 3, '20-30'], ['kb-swing', 3, '15'], ['plank', 3, '30']] };
const ROW_LONG = { name: 'Rudern (lang)', focus: ['cardio'], exercises: [['rudergeraet', 1, '30']] };
const MOBILITY = {
  name: 'Mobility-Routine', focus: ['mobility'],
  exercises: [['katze-kuh'], ['bws-rotation'], ['hueftbeuger-dehnung'], ['hamstring-dehnung'], ['brust-dehnung'], ['waden-dehnung'], ['kindhaltung', 1]],
};
const CORE = { name: 'Core', focus: ['core'], exercises: [['plank'], ['seitstuetz-knie'], ['dead-bug'], ['bird-dog'], ['crunch']] };

const day = (d, weekdays) => ({ ...d, weekdays });

export const PLAN_TEMPLATES = [
  {
    id: 'ppl', name: 'Push / Pull / Beine',
    description: 'Drei Trainingstage mit klarer Aufteilung: Drücken (Brust, Schultern, Trizeps), Ziehen (Rücken, Bizeps) und Beine.',
    days: [day(PUSH, [0]), day(PULL, [2]), day(BEINE, [4])],
  },
  {
    id: 'ppl6', name: 'Push / Pull / Beine – 6 Tage',
    description: 'Dieselbe Aufteilung, jeder Tag zweimal pro Woche.',
    days: [day(PUSH, [0, 3]), day(PULL, [1, 4]), day(BEINE, [2, 5])],
  },
  {
    id: 'ganzkoerper', name: 'Ganzkörper',
    description: 'Zwei abwechselnde Ganzkörper-Tage mit Übungen für mehrere große Bereiche.',
    days: [day(GK_A, [0, 4]), day(GK_B, [2])],
  },
  {
    id: 'okuk', name: 'Oberkörper / Unterkörper',
    description: 'Vier Tage: zwei Oberkörper- und zwei Unterkörper-Tage im Wechsel.',
    days: [day(OK_A, [0]), day(UK_A, [1]), day(OK_B, [3]), day(UK_B, [4])],
  },
  {
    id: 'cardio', name: 'Cardio',
    description: 'Ausdauer am Rudergerät und ein Intervall-Zirkel ohne große Geräte.',
    days: [day(ROW_SHORT, [1]), day(INTERVAL, [3]), day(ROW_LONG, [5])],
  },
  {
    id: 'mobility', name: 'Mobility',
    description: 'Eine kurze Routine für Wirbelsäule, Hüfte, Brust und Beine.',
    days: [day(MOBILITY, [0, 2, 4])],
  },
];

// Einzelne Tage, die sich zu jedem Plan hinzufügen lassen.
export const DAY_TEMPLATES = [PUSH, PULL, BEINE, GK_A, GK_B, OK_A, OK_B, UK_A, UK_B, CORE, INTERVAL, ROW_SHORT, MOBILITY].map((d, i) => ({ ...d, id: `tag-${i}` }));

export function getPlanTemplate(id) {
  return PLAN_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getDayTemplate(id) {
  return DAY_TEMPLATES.find((t) => t.id === id) ?? null;
}

// Planübung aus einem Katalogeintrag (Startwerte aus dem Katalog, optional überschrieben).
export function planExerciseFromCatalog(entry, { sets, reps } = {}) {
  return {
    id: uid(),
    name: entry.name,
    catalogId: entry.id,
    sets: sets ?? entry.defaults.sets,
    reps: reps ?? entry.defaults.reps,
    unit: entry.unit,
    weight: null,
    rest: entry.defaults.rest || null,
    notes: entry.defaults.notes ?? '',
  };
}

export function buildDay(tpl, { keepWeekdays = true } = {}) {
  return {
    id: uid(),
    name: tpl.name,
    weekdays: keepWeekdays ? [...(tpl.weekdays ?? [])] : [],
    focus: [...tpl.focus],
    exercises: tpl.exercises.map(([id, sets, reps]) => planExerciseFromCatalog(getExercise(id), { sets, reps })),
  };
}

export function templateStats(tpl) {
  const perWeek = tpl.days.reduce((a, d) => a + d.weekdays.length, 0);
  const exercises = new Set(tpl.days.flatMap((d) => d.exercises.map(([id]) => id))).size;
  return { days: tpl.days.length, perWeek, exercises };
}
