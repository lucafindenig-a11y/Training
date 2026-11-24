// Datensicherung: Speicherstatus, Export und Import.

import { store, replaceAllData } from '../store.js';
import { todayISO, fmtDate, toISO } from '../dates.js';
import { esc, plural } from '../format.js';
import { validateData } from '../model.js';
import { onAction, onChange, confirmDialog, toast, icon, rerender, applyTheme, themePreference } from '../ui.js';

export function settingsView() {
  const d = store.data;
  const done = d.sessions.filter((s) => s.status === 'completed').length;
  const saved = store.lastSavedAt ? new Date(store.lastSavedAt) : null;
  const savedText = saved ? `${fmtDate(toISO(saved))}, ${saved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'noch nie';
  return {
    title: 'Einstellungen', tab: null, back: '#/heute',
    html: `
      <section class="card">
        <h2>Darstellung</h2>
        <div class="segmented-input" role="radiogroup" aria-label="Darstellung" style="margin-top:12px">
          ${[['hell', 'Hell'], ['dunkel', 'Dunkel'], ['system', 'Wie System']].map(([k, l]) => `
            <label><input type="radio" name="theme" value="${k}" data-change="theme" ${themePreference() === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}
        </div>
      </section>
      <section class="card">
        <h2>Speicherung</h2>
        ${store.deviceOnly
          ? `<p>${icon('check')} Deine Daten werden auf diesem Gerät gespeichert und funktionieren auch ohne Internet.</p>
             <p class="small muted">Sie werden nirgendwohin übertragen. Wenn du die App löschst oder die Websitedaten des Browsers löschst, sind sie weg – exportiere deshalb regelmäßig eine Sicherung (z. B. in deine Cloud oder per Mail an dich).</p>
             <p class="small">Letzter Export: <strong>${lastExportText()}</strong></p>`
          : store.serverAvailable
          ? `<p>${icon('check')} Deine Daten werden dauerhaft auf diesem Computer gespeichert:<br><code>trainingsplan/data/trainingsdaten.json</code></p>
             <p class="small muted">Vor der ersten Änderung eines Tages legt der Server eine Sicherungskopie in <code>trainingsplan/data/backups</code> an (die letzten 60 Tage). Zusätzlich liegt eine Kopie im Browser.</p>`
          : `<p class="warn-text">Der lokale Server ist gerade nicht erreichbar. Deine Daten sind im Browser gespeichert und werden automatisch übertragen, sobald der Server wieder läuft.</p>`}
        <dl class="facts">
          <dt>Zuletzt gespeichert</dt><dd>${savedText}</dd>
          <dt>Plan</dt><dd>${d.plan ? esc(d.plan.name) : 'keiner'}</dd>
          <dt>Gespeicherte Einheiten</dt><dd>${done}</dd>
        </dl>
        ${store.storageWarning ? `<p class="warn-text">${esc(store.storageWarning)}</p>` : ''}
      </section>
      <section class="card">
        <h2>Export</h2>
        <p class="small muted">Lädt alle Daten (Plan, Planverlauf und alle Einheiten) als JSON-Datei herunter – z. B. als zusätzliche Sicherung oder für ein anderes Gerät.</p>
        <button class="btn" data-action="export">${icon('download')}Daten exportieren</button>
      </section>
      <section class="card">
        <h2>Import</h2>
        <p class="small muted">Ersetzt alle aktuellen Daten durch eine zuvor exportierte Datei – so überträgst du deine Daten z. B. vom PC aufs Handy oder umgekehrt.${store.deviceOnly ? ' Exportiere vorher den aktuellen Stand, falls du ihn behalten willst.' : ' Der bisherige Stand bleibt in der täglichen Sicherung des Servers erhalten.'}</p>
        <label class="btn file-btn">${icon('upload')}Datei auswählen …<input type="file" accept="application/json,.json" data-change="import" hidden></label>
      </section>
      <section class="card">
        <h2>Übungsinfos</h2>
        <p class="small muted">Die Anleitungen im Übungskatalog beruhen auf öffentlich zugänglichen Quellen (ACE, Concept2). Jede Übung verlinkt ihre Quelle.</p>
        <a class="btn ghost" href="#/quellen">${icon('book')}Quellen & Hinweise</a>
      </section>`,
  };
}

onAction('export', async () => {
  const payload = { app: 'trainingsplan', exportedAt: new Date().toISOString(), data: store.data };
  const name = `trainingsplan-${todayISO()}.json`;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  // Auf Handys: Teilen-Menü (In Dateien sichern, Drive, Mail …)
  const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ files: [file], title: 'Trainingsplan-Sicherung' });
      markExported();
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
      // sonst normaler Download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markExported();
});

function markExported() {
  try {
    localStorage.setItem(EXPORT_KEY, new Date().toISOString());
  } catch { /* ohne Speicher keine Erinnerung */ }
  toast('Sicherung erstellt.');
  rerender();
}

const EXPORT_KEY = 'trainingsplan.letzterExport';

export function lastExportAt() {
  try {
    return localStorage.getItem(EXPORT_KEY);
  } catch {
    return null;
  }
}

function lastExportText() {
  const at = lastExportAt();
  return at ? fmtDate(toISO(new Date(at))) : 'noch nie';
}

onChange('theme', (el) => applyTheme(el.value));

onChange('import', async (el) => {
  const file = el.files?.[0];
  el.value = '';
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    toast('Die Datei ist keine gültige JSON-Datei.');
    return;
  }
  const raw = parsed?.data && Array.isArray(parsed.data.sessions) ? parsed.data : parsed;
  const check = validateData(raw);
  if (!check.ok) {
    toast(check.error);
    return;
  }
  const n = raw.sessions.filter((s) => s.status === 'completed').length;
  const ok = await confirmDialog(`Die Datei enthält ${raw.plan ? `den Plan „${esc(raw.plan.name)}“ und ` : ''}${plural(n, 'abgeschlossene Einheit', 'abgeschlossene Einheiten')}. <strong>Alle aktuellen Daten werden ersetzt.</strong>`, { title: 'Daten importieren?', confirmLabel: 'Importieren' });
  if (!ok) return;
  replaceAllData(raw);
  toast('Daten importiert.');
  rerender();
});
