// Einstieg: lädt die Daten, verdrahtet Router und Ansichten.

import { initStore, store, subscribe } from './store.js';
import { installDelegation, setRenderer, icon } from './ui.js';
import { resetCharts, mountCharts } from './charts.js';
import { todayView } from './views/today.js';
import { planView, dayView } from './views/plan.js';
import { sessionView } from './views/session.js';
import { historyView, sessionDetailView } from './views/history.js';
import { statsView, exerciseView } from './views/stats.js';
import { settingsView } from './views/settings.js';

const routes = [
  { re: /^\/heute$/, view: todayView },
  { re: /^\/plan$/, view: planView },
  { re: /^\/plan\/tag\/([^/]+)$/, view: dayView },
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
  local: ['Nur im Browser gespeichert', 'warn'],
  device: ['Auf dem Gerät gespeichert', 'ok'],
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
  document.querySelector('[data-tab="heute"] .tab-ico').innerHTML = icon('today');
  document.querySelector('[data-tab="plan"] .tab-ico').innerHTML = icon('plan');
  document.querySelector('[data-tab="verlauf"] .tab-ico').innerHTML = icon('history');
  document.querySelector('[data-tab="auswertung"] .tab-ico').innerHTML = icon('stats');
  backBtn.innerHTML = icon('back');
  document.querySelector('.settings-link').innerHTML = icon('gear');
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
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

start();
