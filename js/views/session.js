// Training erfassen (laufend, mit automatischem Speichern) und abgeschlossene Einheiten korrigieren
// (Arbeitskopie, die erst mit "Korrektur speichern" übernommen wird).

import { store, save } from '../store.js';
import { todayISO, isValidISO, fmtDate, fmtDateLong } from '../dates.js';
import { esc, fmtNum, parseNum, plural } from '../format.js';
import {
  findSession, finishSession, deleteSession, replaceSession, moveItem, newSessionExercise, sessionTotals,
  knownExerciseNames, unitOf, UNITS, parseRepsTarget, findDay,
} from '../model.js';
import { buildExerciseIndex, bestEntry, describeSets, describeTop, isWeighted, indexKey } from '../analytics.js';
import { catalogFor, inferFocus, EXERCISES } from '../catalog.js';
import { onAction, onInput, onChange, openSheet, rerender, navigate, confirmDialog, field, showFieldErrors, toast, icon } from '../ui.js';
import { targetText, unitShort, dayFocus, openExerciseInfo, lastSetsLookup, fmtSeconds } from './common.js';
import { openCatalogPicker } from './catalog.js';

const drafts = new Map(); // id -> { session, dirty }

function current(id) {
  const stored = findSession(store.data, id);
  if (!stored) return null;
  if (stored.status === 'active') return { s: stored, live: true };
  const d = drafts.get(id);
  return d ? { s: d.session, live: false, draft: d } : null;
}

// Nach Eingaben: laufendes Training sofort speichern, Korrektur als ungespeichert markieren.
function touch(ctx, { render = false } = {}) {
  if (ctx.live) {
    ctx.s.updatedAt = new Date().toISOString();
    save();
  } else {
    ctx.draft.dirty = true;
    document.getElementById('draftState')?.removeAttribute('hidden');
  }
  if (render) rerender();
}

export function hasUnsavedDraft(id) {
  return Boolean(drafts.get(id)?.dirty);
}

// ---------- Pausen-Timer ----------

const timer = { endAt: 0, total: 0, name: '', iv: null, doneAt: 0 };

function startTimer(sec, name) {
  timer.endAt = Date.now() + sec * 1000;
  timer.total = sec;
  timer.name = name;
  timer.doneAt = 0;
  clearInterval(timer.iv);
  timer.iv = setInterval(tick, 250);
  tick();
}

function stopTimer() {
  clearInterval(timer.iv);
  timer.endAt = 0;
  timer.doneAt = 0;
  tick();
}

function tick() {
  const el = document.getElementById('restTimer');
  const now = Date.now();
  if (timer.endAt && now >= timer.endAt) {
    timer.endAt = 0;
    timer.doneAt = now;
    clearInterval(timer.iv);
    navigator.vibrate?.([200, 100, 200]);
    setTimeout(() => {
      if (timer.doneAt && Date.now() - timer.doneAt >= 3900) {
        timer.doneAt = 0;
        tick();
      }
    }, 4000);
  }
  if (!el) return;
  if (timer.endAt) {
    const left = Math.ceil((timer.endAt - now) / 1000);
    el.hidden = false;
    el.classList.remove('finished');
    el.querySelector('.rt-text').textContent = `Pause ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    el.querySelector('.rt-sub').textContent = timer.name;
    el.querySelector('.rt-bar span').style.width = `${Math.max(0, (left / timer.total) * 100)}%`;
  } else if (timer.doneAt) {
    el.hidden = false;
    el.classList.add('finished');
    el.querySelector('.rt-text').textContent = 'Pause vorbei';
    el.querySelector('.rt-sub').textContent = timer.name;
    el.querySelector('.rt-bar span').style.width = '0%';
  } else el.hidden = true;
}

onAction('timer-add', () => {
  if (timer.endAt) {
    timer.endAt += 15000;
    timer.total += 15;
    tick();
  }
});
onAction('timer-stop', () => stopTimer());

// ---------- Ansicht ----------

export function sessionView([id]) {
  const stored = findSession(store.data, id);
  if (!stored) return { redirect: '#/verlauf' };
  const live = stored.status === 'active';
  if (!live) {
    const d = drafts.get(id);
    if (!d || !d.dirty) drafts.set(id, { session: structuredClone(stored), dirty: false });
  }
  const { s, draft } = current(id);

  // Frühere Leistungen (nur Einheiten bis zum Datum dieser Einheit, ohne diese selbst).
  const index = buildExerciseIndex(store.data);
  const history = (ex) => {
    const rec = index.get(indexKey(ex.name, unitOf(ex)));
    if (!rec) return null;
    const entries = rec.entries.filter((e) => e.sessionId !== s.id && e.date <= s.date);
    return entries.length ? { last: entries[entries.length - 1], best: bestEntry(entries), weighted: isWeighted(entries) } : null;
  };

  const cards = s.exercises.map((ex, i) => exerciseCard(s, ex, i, history(ex))).join('');
  const t = sessionTotals(s);
  const openSets = s.exercises.filter((e) => !e.skipped).reduce((a, e) => a + e.sets.filter((x) => !x.done).length, 0);
  const summary = [plural(t.sets, 'Satz', 'Sätze') + ' abgehakt'];
  if (t.volume) summary.push(`${fmtNum(t.volume, 0)} kg Volumen`);
  if (t.seconds) summary.push(fmtSeconds(t.seconds));

  const footer = live
    ? `<div class="session-actions">
        <button class="btn ghost" data-action="sets-all-done" data-sid="${s.id}">${icon('check')}Alle offenen Sätze abhaken</button>
        <button class="btn link danger" data-action="session-discard" data-sid="${s.id}">Training verwerfen</button>
      </div>
      <div class="action-bar">
        <div class="ab-info"><strong>${plural(t.sets, 'Satz', 'Sätze')} erledigt</strong><span>${openSets ? `${openSets} offen` : 'alle Sätze abgehakt'}</span></div>
        <button class="btn primary" data-action="session-finish" data-sid="${s.id}">Abschließen</button>
      </div>`
    : `<div class="session-actions">
        <button class="btn ghost" data-action="draft-cancel" data-sid="${s.id}">Änderungen verwerfen</button>
        <button class="btn link danger" data-action="session-delete" data-sid="${s.id}">Einheit löschen</button>
      </div>
      <div class="action-bar">
        <div class="ab-info"><strong>Korrektur</strong><span>${esc(fmtDate(s.date))}</span></div>
        <button class="btn primary" data-action="draft-save" data-sid="${s.id}">Speichern</button>
      </div>`;

  return {
    title: live ? 'Training' : 'Training korrigieren',
    tab: live ? 'heute' : 'verlauf',
    back: live ? '#/heute' : `#/verlauf/${s.id}`,
    html: `
      ${live
        ? '<p class="status-line"><span class="pill pill-live">Läuft</span> Eingaben werden automatisch gespeichert.</p>'
        : `<p class="status-line"><span class="pill">Abgeschlossen</span> Änderungen werden erst mit „Korrektur speichern“ übernommen.</p>
           <p id="draftState" class="unsaved" ${draft?.dirty ? '' : 'hidden'}>Ungespeicherte Änderungen</p>`}
      <section class="card session-head">
        <label class="field"><span class="field-label">Bezeichnung</span>
          <input data-input="session-title" data-sid="${s.id}" value="${esc(s.title)}" maxlength="60" autocomplete="off"></label>
        <label class="field"><span class="field-label">Datum</span>
          <input type="date" data-change="session-date" data-sid="${s.id}" value="${s.date}" max="${todayISO()}">
          <span class="field-hint">${esc(fmtDateLong(s.date))}</span></label>
        <p class="small muted">${esc(summary.join(' · '))}</p>
      </section>

      ${cards || '<p class="muted">Noch keine Übungen in diesem Training.</p>'}

      <button class="btn add-ex" data-action="log-ex-add" data-sid="${s.id}">${icon('plus')}Übung hinzufügen</button>

      <label class="field"><span class="field-label">Notizen zum Training (optional)</span>
        <textarea data-input="session-notes" data-sid="${s.id}" rows="2" placeholder="z. B. wenig geschlafen, Knie gut">${esc(s.notes ?? '')}</textarea></label>

      ${footer}

      <div id="restTimer" class="rest-timer" hidden role="timer" aria-live="off">
        <div class="rt-info"><strong class="rt-text"></strong><span class="rt-sub small"></span></div>
        <div class="rt-bar"><span></span></div>
        <button class="btn small" data-action="timer-add">+15 s</button>
        <button class="icon-btn" data-action="timer-stop" aria-label="Pause beenden">${icon('close')}</button>
      </div>`,
    mount: () => tick(),
  };
}

function exerciseCard(s, ex, i, hist) {
  const attrs = `data-sid="${s.id}" data-ex="${ex.id}"`;
  const unit = unitOf(ex);
  const u = unitShort(unit);
  const cat = catalogFor(ex);
  const histLine = hist
    ? `<p class="hist small">Letztes Mal (${fmtDate(hist.last.date)}): <strong>${esc(describeSets(hist.last))}</strong>
        · Bestleistung: ${esc(describeTop(hist.best, hist.weighted))} (${fmtDate(hist.best.date)})</p>`
    : '<p class="hist small">Noch keine früheren Daten zu dieser Übung.</p>';
  const rows = ex.sets.map((set, j) => `
    <div class="set-row ${set.done ? 'done' : ''}">
      <span class="set-no">${j + 1}</span>
      <label class="set-field"><input ${attrs} data-set="${j}" data-field="weight" data-input="set-field" inputmode="decimal" autocomplete="off"
        value="${set.weight != null ? esc(String(set.weight).replace('.', ',')) : ''}" placeholder="–" aria-label="Satz ${j + 1}: Gewicht in kg"><span>kg</span></label>
      <label class="set-field"><input ${attrs} data-set="${j}" data-field="reps" data-input="set-field" inputmode="numeric" autocomplete="off"
        value="${set.reps ?? ''}" placeholder="0" aria-label="Satz ${j + 1}: ${esc(UNITS[unit].label)}"><span>${esc(u)}</span></label>
      <button class="check ${set.done ? 'on' : ''}" ${attrs} data-set="${j}" data-action="set-toggle" aria-pressed="${set.done}" aria-label="Satz ${j + 1} erledigt">${icon('check')}</button>
      <button class="icon-btn small" ${attrs} data-set="${j}" data-action="set-remove" aria-label="Satz ${j + 1} entfernen">${icon('close')}</button>
    </div>`).join('');

  return `
    <section class="card log-ex ${ex.skipped ? 'is-skipped' : ''}">
      <header class="log-head">
        <div class="log-title">
          <h3><span class="ex-num">${i + 1}</span>${esc(ex.name)}</h3>
          <p class="small muted">${ex.target ? `Plan: ${esc(targetText(ex.target))}` : 'Zusätzliche Übung (nicht aus dem Plan)'}</p>
          ${ex.target?.notes ? `<p class="small note-inline">${esc(ex.target.notes)}</p>` : ''}
          ${cat ? `<p><button class="info-link" style="background:none;border:none;padding:0;cursor:pointer;margin-left:38px" ${attrs} data-action="log-ex-info">${icon('info')}Anleitung</button></p>` : ''}
        </div>
        <div class="row-actions">
          <button class="icon-btn plain small" ${attrs} data-action="log-ex-move" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach oben">${icon('up')}</button>
          <button class="icon-btn plain small" ${attrs} data-action="log-ex-move" data-dir="1" ${i === s.exercises.length - 1 ? 'disabled' : ''} aria-label="${esc(ex.name)} nach unten">${icon('down')}</button>
          <button class="icon-btn plain small" ${attrs} data-action="log-ex-rename" aria-label="${esc(ex.name)} umbenennen">${icon('edit')}</button>
          <button class="icon-btn plain small danger" ${attrs} data-action="log-ex-delete" aria-label="${esc(ex.name)} aus diesem Training entfernen">${icon('trash')}</button>
        </div>
      </header>
      ${histLine}
      ${ex.skipped
        ? `<p class="skipped-note">${icon('skip')}Ausgelassen – zählt nicht in die Auswertung.</p>
           <button class="btn small" ${attrs} data-action="log-ex-skip">${icon('undo')}Doch absolvieren</button>`
        : `<div class="sets">
            <div class="set-row set-head" aria-hidden="true"><span>Satz</span><span>Gewicht</span><span>${esc(unit === 'wdh' ? 'Wdh.' : 'Dauer')}</span><span>Erledigt</span><span></span></div>
            ${rows}
          </div>
          <div class="log-foot">
            <button class="btn small" ${attrs} data-action="set-add">${icon('plus')}Satz</button>
            <button class="btn small ghost" ${attrs} data-action="log-ex-skip">${icon('skip')}Übung auslassen</button>
          </div>`}
      <input class="ex-note" ${attrs} data-input="ex-note" value="${esc(ex.notes ?? '')}" placeholder="Notiz zur Übung (optional)" aria-label="Notiz zu ${esc(ex.name)}" maxlength="200">
    </section>`;
}

// ---------- Eingaben ----------

function ctxFrom(el) {
  const ctx = current(el.dataset.sid);
  if (!ctx) return null;
  const ex = el.dataset.ex ? ctx.s.exercises.find((e) => e.id === el.dataset.ex) : null;
  return { ...ctx, ex, set: ex && el.dataset.set != null ? ex.sets[Number(el.dataset.set)] : null };
}

onInput('set-field', (el) => {
  const c = ctxFrom(el);
  if (!c?.set) return;
  const raw = el.value.trim();
  if (el.dataset.field === 'weight') {
    const v = parseNum(raw);
    const bad = raw !== '' && (v == null || v < 0 || v > 1000);
    el.classList.toggle('invalid', bad);
    if (!bad) c.set.weight = raw === '' ? null : v;
  } else {
    const v = Number(raw);
    const bad = raw !== '' && (!Number.isInteger(v) || v < 0 || v > 1000);
    el.classList.toggle('invalid', bad);
    if (!bad) c.set.reps = raw === '' ? null : v;
  }
  touch(c);
});

onInput('ex-note', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  c.ex.notes = el.value;
  touch(c);
});

onInput('session-title', (el) => {
  const c = ctxFrom(el);
  if (!c) return;
  c.s.title = el.value.trim() || 'Training';
  touch(c);
});

onInput('session-notes', (el) => {
  const c = ctxFrom(el);
  if (!c) return;
  c.s.notes = el.value;
  touch(c);
});

onChange('session-date', (el) => {
  const c = ctxFrom(el);
  if (!c) return;
  const v = el.value;
  if (!isValidISO(v) || v > todayISO()) {
    toast('Bitte ein gültiges Datum bis heute wählen.');
    el.value = c.s.date;
    return;
  }
  c.s.date = v;
  touch(c, { render: true });
});

onAction('set-toggle', (el) => {
  const c = ctxFrom(el);
  if (!c?.set) return;
  if (!c.set.done && !(Number(c.set.reps) > 0)) {
    toast(unitOf(c.ex) === 'wdh' ? 'Bitte zuerst die Wiederholungen eintragen.' : 'Bitte zuerst die Dauer eintragen.');
    return;
  }
  c.set.done = !c.set.done;
  if (c.set.done && c.live && c.ex.target?.rest) startTimer(c.ex.target.rest, c.ex.name);
  touch(c, { render: true });
});

onAction('set-add', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  const last = c.ex.sets[c.ex.sets.length - 1];
  c.ex.sets.push({ reps: last?.reps ?? null, weight: last?.weight ?? null, done: false });
  touch(c, { render: true });
});

onAction('set-remove', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  c.ex.sets.splice(Number(el.dataset.set), 1);
  touch(c, { render: true });
});

onAction('log-ex-skip', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  c.ex.skipped = !c.ex.skipped;
  touch(c, { render: true });
});

onAction('log-ex-move', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  if (moveItem(c.s.exercises, c.s.exercises.indexOf(c.ex), Number(el.dataset.dir))) touch(c, { render: true });
});

onAction('log-ex-delete', async (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  const ok = await confirmDialog(`„${esc(c.ex.name)}“ aus diesem Training entfernen? Wenn du die Übung nur heute nicht machst, nutze besser „Übung auslassen“.`, { title: 'Übung entfernen?', confirmLabel: 'Entfernen' });
  if (!ok) return;
  c.s.exercises.splice(c.s.exercises.indexOf(c.ex), 1);
  touch(c, { render: true });
});

function exerciseNameSheet({ title, value = '', withSets = false, onDone }) {
  const names = [...new Set([...knownExerciseNames(store.data), ...EXERCISES.map((e) => e.name)])].sort((a, b) => a.localeCompare(b, 'de'));
  openSheet({
    title,
    submitLabel: withSets ? 'Hinzufügen' : 'Speichern',
    body: `${field({ label: 'Übung', name: 'name', value, placeholder: 'z. B. Klimmzüge', attrs: 'list="exercise-names-log" maxlength="80" autocomplete="off"' })}
      <datalist id="exercise-names-log">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      ${withSets ? `${field({ label: 'Sätze', name: 'sets', value: '3', attrs: 'inputmode="numeric" maxlength="2"' })}
        <fieldset><legend class="field-label">Messen in</legend><div class="segmented-input">${Object.entries(UNITS).map(([k, u]) => `
          <label><input type="radio" name="unit" value="${k}" ${k === 'wdh' ? 'checked' : ''}><span>${esc(u.label)}</span></label>`).join('')}</div></fieldset>` : ''}
      <p class="small muted">Gleiche Namen werden in der Auswertung als dieselbe Übung verglichen.</p>`,
    onSubmit: (form) => {
      const name = form.elements.name.value.trim();
      const errors = {};
      if (!name) errors.name = 'Bitte einen Namen eingeben.';
      const sets = withSets ? Number(form.elements.sets.value) : 0;
      if (withSets && (!Number.isInteger(sets) || sets < 1 || sets > 30)) errors.sets = 'Ganze Zahl von 1 bis 30.';
      if (Object.keys(errors).length) {
        showFieldErrors(form, errors);
        return false;
      }
      onDone(name, sets, form.querySelector('input[name=unit]:checked')?.value ?? 'wdh');
    },
  });
}

// Übung im laufenden/zu korrigierenden Training ergänzen (Katalog oder eigene).
function addToSession(c, { name, catalogId = null, unit = 'wdh', count = 3, reps = null }) {
  const lastSets = lastSetsLookup()(name, unit);
  const ex = newSessionExercise({ name, catalogId, unit }, lastSets);
  while (ex.sets.length < count) ex.sets.push({ ...(ex.sets[ex.sets.length - 1] ?? { reps: null, weight: null }), done: false });
  ex.sets.length = count;
  if (!lastSets && reps != null) ex.sets.forEach((x) => { x.reps = reps; });
  c.s.exercises.push(ex);
  touch(c, { render: true });
}

onAction('log-ex-info', (el) => {
  const c = ctxFrom(el);
  const entry = c?.ex && catalogFor(c.ex);
  if (entry) openExerciseInfo(entry);
});

onAction('log-ex-rename', (el) => {
  const c = ctxFrom(el);
  if (!c?.ex) return;
  exerciseNameSheet({
    title: 'Übung umbenennen', value: c.ex.name,
    onDone: (name) => {
      c.ex.name = name;
      touch(c, { render: true });
    },
  });
});

onAction('log-ex-add', (el) => {
  const c = ctxFrom(el);
  if (!c) return;
  const day = c.s.dayId ? findDay(store.data.plan, c.s.dayId) : null;
  openCatalogPicker({
    title: 'Übung hinzufügen',
    focus: day ? dayFocus(day) : inferFocus(c.s.title),
    onPick: (entry) => {
      document.querySelector('#sheetRoot [data-sheet-close]')?.click();
      addToSession(c, {
        name: entry.name, catalogId: entry.id, unit: entry.unit, count: entry.defaults.sets,
        reps: parseRepsTarget(entry.defaults.reps)?.min ?? null,
      });
      toast(`„${entry.name}“ hinzugefügt.`);
    },
    onCustom: () => exerciseNameSheet({
      title: 'Eigene Übung hinzufügen', withSets: true,
      onDone: (name, count, unit) => addToSession(c, { name, unit, count }),
    }),
  });
});

onAction('sets-all-done', (el) => {
  const c = ctxFrom(el);
  if (!c) return;
  let n = 0;
  let missing = 0;
  for (const ex of c.s.exercises) {
    if (ex.skipped) continue;
    for (const set of ex.sets) {
      if (set.done) continue;
      if (Number(set.reps) > 0) {
        set.done = true;
        n++;
      } else missing++;
    }
  }
  touch(c, { render: true });
  toast(n ? `${plural(n, 'Satz', 'Sätze')} abgehakt.${missing ? ` ${missing} ohne Wiederholungen offen gelassen.` : ''}` : 'Keine offenen Sätze mit Wiederholungen.');
});

// ---------- Abschließen, Verwerfen, Korrektur ----------

onAction('session-finish', async (el) => {
  const s = findSession(store.data, el.dataset.sid);
  if (!s) return;
  const t = sessionTotals(s);
  const open = s.exercises.filter((e) => !e.skipped).reduce((a, e) => a + e.sets.filter((x) => !x.done).length, 0);
  if (t.sets === 0) {
    const ok = await confirmDialog('Es ist noch kein Satz abgehakt. Die Einheit wird ohne Übungsdaten als absolviert gespeichert. Tipp: Mit „Alle offenen Sätze abhaken“ übernimmst du die eingetragenen Werte.', { title: 'Ohne Sätze abschließen?', confirmLabel: 'Trotzdem abschließen', danger: false });
    if (!ok) return;
  } else if (open > 0) {
    const ok = await confirmDialog(`${plural(open, 'Satz ist', 'Sätze sind')} nicht abgehakt und ${open === 1 ? 'wird' : 'werden'} als ausgelassen gespeichert.`, { title: 'Training abschließen?', confirmLabel: 'Abschließen', danger: false });
    if (!ok) return;
  }
  finishSession(s);
  stopTimer();
  save();
  navigate(`#/verlauf/${s.id}?neu=1`);
});

onAction('session-discard', async (el) => {
  const s = findSession(store.data, el.dataset.sid);
  if (!s) return;
  const ok = await confirmDialog('Das laufende Training wird gelöscht und nicht gespeichert.', { title: 'Training verwerfen?', confirmLabel: 'Verwerfen' });
  if (!ok) return;
  deleteSession(store.data, s.id);
  stopTimer();
  save();
  navigate('#/heute');
});

onAction('draft-save', (el) => {
  const id = el.dataset.sid;
  const d = drafts.get(id);
  if (!d) return;
  if (!isValidISO(d.session.date) || d.session.date > todayISO()) {
    toast('Bitte ein gültiges Datum bis heute wählen.');
    return;
  }
  replaceSession(store.data, d.session);
  drafts.delete(id);
  save();
  navigate(`#/verlauf/${id}`);
  toast('Korrektur gespeichert.');
});

onAction('draft-cancel', async (el) => {
  const id = el.dataset.sid;
  if (drafts.get(id)?.dirty) {
    const ok = await confirmDialog('Deine Änderungen an dieser Einheit werden verworfen.', { title: 'Änderungen verwerfen?', confirmLabel: 'Verwerfen' });
    if (!ok) return;
  }
  drafts.delete(id);
  navigate(`#/verlauf/${id}`);
});

onAction('session-delete', async (el) => {
  const id = el.dataset.sid;
  const s = findSession(store.data, id);
  if (!s) return;
  const ok = await confirmDialog(`Die Einheit „${esc(s.title)}“ vom ${fmtDate(s.date)} wird endgültig gelöscht und fließt nicht mehr in die Auswertung ein.`, { title: 'Einheit löschen?', confirmLabel: 'Endgültig löschen' });
  if (!ok) return;
  deleteSession(store.data, id);
  drafts.delete(id);
  save();
  navigate('#/verlauf');
  toast('Einheit gelöscht.');
});

window.addEventListener('beforeunload', (e) => {
  if ([...drafts.values()].some((d) => d.dirty)) {
    e.preventDefault();
    e.returnValue = '';
  }
});
