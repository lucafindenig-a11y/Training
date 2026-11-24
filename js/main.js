// Einstieg: lädt die Daten, verdrahtet Router, Navigation und Darstellung.

import { initStore, store, subscribe } from './store.js';
import { installDelegation, setRenderer, icon, applyTheme } from './ui.js';
import { resetCharts, mountCharts } from './charts.js';
import { todayView } from './views/today.js';
import { planView, dayView } from './views/plan.js';
import { sessionView } from './views/session.js';
import { historyView, sessionDetailView } from './views/history.js';
import { statsView, exerciseView } from './views/stats.js';
import { settingsView } from './views/settings.js';
import { catalogView, catalogDetailView, sourcesView } from './views/catalog.js';
import { templatesView, templateDetailView } from './views/templates.js';

const routes = [
  { re: /^\/heute$/, view: todayView },
  { re: /^\/plan$/, view: planView },
  { re: /^\/plan\/tag\/([^/]+)$/, view: dayView },
  { re: /^\/vorlagen$/, view: templatesView },
  { re: /^\/vorlagen\/([^/]+)$/, view: templateDetailView },
  { re: /^\/katalog$/, view: catalogView },
  { re: /^\/katalog\/([^/]+)$/, view: catalogDetailView },
  { re: /^\/quellen$/, view: sourcesView },
  { re: /^\/training\/([^/]+)$/, view: sessionView },
  { re: /^\/verlauf$/, view: historyView },
  { re: /^\/verlauf\/([^/]+)$/, view: sessionDetailView },
  { re: /^\/auswertung\/(woche|monat|gesamt|uebungen)(?:\/([^/]+))?$/, view: statsView },
  { re: /^\/uebung\/([^/]+)$/, view: exerciseView },
  { re: /^\/einstellungen$/, view: settingsView },
];

const app = document.getElementById('app');
const titleEl = document.getElementById('pageTitle');
const backBtn = document.getElementById('backBtn');
const syncEl = document.getElementById('syncStatus');
let currentPath = null;

function render({ keepScroll = false } = {}) {
  const hash = location.hash.replace(/^#/, '') || '/heute';
  const [path, query = ''] = hash.split('?');
  const route = routes.find((r) => r.re.test(path));
  if (!route) {
    location.replace('#/heute');
    return;
  }
  const args = path.match(route.re).slice(1).map((a) => (a == null ? a : decodeURIComponent(a)));
  const sameRoute = path === currentPath;
  const scrollY = window.scrollY;
  resetCharts();
  const out = route.view(args, new URLSearchParams(query));
  if (out.redirect) {
    location.replace(out.redirect);
    return;
  }
  document.title = `${out.title} · Trainingsplan`;
  titleEl.textContent = out.title;
  app.innerHTML = out.html;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    const on = a.dataset.tab === out.tab;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  if (out.back) {
    backBtn.hidden = false;
    backBtn.href = out.back;
  } else backBtn.hidden = true;
  mountCharts(app);
  out.mount?.(app);
  if (keepScroll && sameRoute) window.scrollTo(0, scrollY);
  else if (!sameRoute) window.scrollTo(0, 0);
  currentPath = path;
}

const STATUS = {
  loading: ['Lädt …', 'neutral'],
  saving: ['Speichert …', 'neutral'],
  synced: ['Gespeichert', 'ok'],
  device: ['Auf dem Gerät gespeichert', 'ok'],
  local: ['Nur im Browser gespeichert', 'warn'],
  error: ['Speichern fehlgeschlagen', 'bad'],
};

function updateStatus() {
  const [text, cls] = STATUS[store.status] ?? STATUS.loading;
  syncEl.className = `sync sync-${cls}`;
  syncEl.innerHTML = `<span class="sync-dot" aria-hidden="true"></span><span class="sync-text">${text}</span>`;
  syncEl.title = store.status === 'local'
    ? 'Der lokale Server ist nicht erreichbar. Deine Daten sind im Browser gesichert und werden übertragen, sobald der Server wieder läuft.'
    : text;
}

async function start() {
  const tabIcons = { heute: 'today', plan: 'plan', katalog: 'dumbbell', verlauf: 'history', auswertung: 'stats' };
  for (const [tab, name] of Object.entries(tabIcons)) document.querySelector(`[data-tab="${tab}"] .tab-ico`).innerHTML = icon(name);
  backBtn.innerHTML = icon('back');
  document.querySelector('.settings-link').innerHTML = icon('gear');
  applyTheme();
  installDelegation();
  setRenderer(render);
  updateStatus();
  subscribe((kind) => (kind === 'status' ? updateStatus() : render({ keepScroll: true })));
  await initStore();
  updateStatus();
  if (!location.hash) location.replace('#/heute');
  render();
  window.addEventListener('hashchange', () => render());

  // Offline-Fähigkeit (nur über HTTPS oder localhost möglich)
  if ('serviceWorker' in navigator && window.isSecureContext) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // Neue Version: außerhalb eines laufenden Trainings direkt neu laden.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !location.hash.startsWith('#/training/')) location.reload();
    });
  }
}

start();
