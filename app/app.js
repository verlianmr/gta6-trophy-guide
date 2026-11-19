// Entry module: loads the data, restores saved and URL state, starts every view, and keeps header, tabs and URL in step.
import { loadData, KINDS, formatHours } from './js/data.js';
import { state, loadSaved, save, update, emit, subscribe, toggleEarned } from './js/store.js';
import { initFilters, visible } from './js/filters.js';
import { initSpoiler } from './js/spoiler.js';
import { initList } from './js/render-list.js';
import { initDetail } from './js/render-detail.js';
import { initRoadmap } from './js/roadmap.js';
import { initSummary } from './js/summary.js';
import { initIO, exportProgress } from './js/io.js';
import { esc } from './js/html.js';

const VIEWS = ['checklist', 'roadmap', 'progress'];
const SORTS = ['stage', 'grade', 'name', 'status'];

let data;
try {
  data = await loadData();
} catch (error) {
  showFatal(error);
  throw error;
}

loadSaved();
for (const id of [...state.earned]) if (!data.byId.has(id)) state.earned.delete(id);
applyUrl(data);
if (!data.byId.has(state.selected)) state.selected = firstUnearned(data)?.id ?? data.trophies[0].id;

initFilters(data);
initSpoiler();
initIO(data);
initList(data, document.getElementById('trophyList'));
initDetail(data, document.getElementById('detailPane'));
initRoadmap(data, document.getElementById('view-roadmap'), revealTrophy);
initSummary(data, document.getElementById('view-progress'), revealTrophy);
initTabs();
initKeys();

subscribe(() => {
  applyViewDom(state.view);
  syncHeader(data);
  syncUrl();
});

applyViewDom(state.view);
syncHeader(data);
syncUrl();
scrollSelectedIntoView('start');
if (state.seeded) {
  const label = document.getElementById('saveState');
  if (label) label.textContent = 'Saved · just now';
  save();
}

function firstUnearned(doc) {
  return doc.trophies
    .filter((trophy) => !state.earned.has(trophy.id))
    .sort((a, b) => a.stage - b.stage || a.id - b.id)[0];
}

function revealTrophy(id) {
  if (!data.byId.has(id)) return;
  const shown = visible(data).some((trophy) => trophy.id === id);
  if (shown) {
    update({ selected: id, view: 'checklist' });
  } else {
    update({ selected: id, view: 'checklist', kind: 'all', grade: 'all', missableOnly: false, q: '' });
  }
}

function initTabs() {
  const tabs = [...document.querySelectorAll('.tab')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => update({ view: tab.dataset.view }));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      update({ view: next.dataset.view });
      next.focus();
    });
  }
}

function initKeys() {
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (typing) return;

    switch (event.key) {
      case '/':
        event.preventDefault();
        document.getElementById('search')?.focus();
        break;
      case 'j':
        moveSelection(1);
        break;
      case 'k':
        moveSelection(-1);
        break;
      case 'x':
        if (state.selected) toggleEarned(state.selected);
        break;
      case 's':
        update({ spoiler: !state.spoiler }, { persist: true });
        break;
      case 'e':
        exportProgress(data);
        break;
      case '1':
        update({ view: 'checklist' });
        break;
      case '2':
        update({ view: 'roadmap' });
        break;
      case '3':
        update({ view: 'progress' });
        break;
      case '?':
        update({ view: 'progress' });
        break;
      default:
        break;
    }
  });
}

function moveSelection(delta) {
  const list = visible(data);
  if (!list.length) return;
  const current = list.findIndex((trophy) => trophy.id === state.selected);
  const index = current < 0 ? 0 : Math.min(list.length - 1, Math.max(0, current + delta));
  update({ selected: list[index].id });
  scrollSelectedIntoView('nearest');
}

function scrollSelectedIntoView(block) {
  const row = document.querySelector('.row.is-selected');
  if (!row) return;
  if (block === 'nearest') {
    row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  const pane = document.getElementById('listpane');
  if (!pane) return;
  const paneRect = pane.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  pane.scrollTop += rowRect.top - paneRect.top - 58;
}

function applyViewDom(view) {
  const active = VIEWS.includes(view) ? view : 'checklist';
  document.body.dataset.view = active;
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${active}`;
  }
  for (const tab of document.querySelectorAll('.tab')) {
    const on = tab.dataset.view === active;
    tab.setAttribute('aria-selected', String(on));
    tab.tabIndex = on ? 0 : -1;
  }
}

function syncHeader(doc) {
  const total = doc.trophies.length;
  const earned = state.earned.size;
  const percent = Math.round((earned / total) * 100);
  const count = document.getElementById('headCount');
  const pct = document.getElementById('headPct');
  const bar = document.getElementById('headBar');
  const meter = document.getElementById('headMeter');
  const eta = document.getElementById('headEta');
  if (count) count.textContent = String(earned);
  if (pct) pct.textContent = `${percent}%`;
  if (bar) bar.style.width = `${percent}%`;
  if (meter) meter.setAttribute('aria-valuenow', String(earned));
  if (eta) {
    const hours = doc.trophies.filter((trophy) => !state.earned.has(trophy.id)).reduce((sum, trophy) => sum + trophy.hours, 0);
    eta.textContent = hours > 0 ? `≈ ${formatHours(hours)} to platinum` : 'Platinum earned';
  }
}

function applyUrl(doc) {
  const params = new URLSearchParams(location.search);
  const view = params.get('view');
  if (VIEWS.includes(view)) state.view = view;

  const kind = params.get('kind');
  if (kind === 'all' || KINDS.includes(kind)) state.kind = kind;

  const grade = params.get('grade');
  if (grade === 'all' || ['platinum', 'gold', 'silver', 'bronze'].includes(grade)) state.grade = grade;

  if (params.get('missable') === '1') state.missableOnly = true;

  const sort = params.get('sort');
  if (SORTS.includes(sort)) state.sort = sort;

  const query = params.get('q');
  if (query) state.q = query;

  const trophy = Number(params.get('trophy'));
  if (doc.byId.has(trophy)) state.selected = trophy;

  const spoiler = params.get('spoiler');
  if (spoiler === 'on') state.spoiler = true;
  if (spoiler === 'off') state.spoiler = false;

  if (params.has('earned')) {
    const ids = parseIds(params.get('earned'), doc);
    state.earned = ids;
    state.earnedAt = {};
    const now = Date.now();
    for (const id of ids) state.earnedAt[id] = now;
    state.seeded = true;
    save();
  }
}

function parseIds(value, doc) {
  const ids = new Set();
  if (!value || value === 'none') return ids;
  for (const part of value.split(',')) {
    const piece = part.trim();
    if (!piece) continue;
    const range = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const from = Math.min(Number(range[1]), Number(range[2]));
      const to = Math.max(Number(range[1]), Number(range[2]));
      for (let id = from; id <= to; id += 1) if (doc.byId.has(id)) ids.add(id);
    } else {
      const id = Number(piece);
      if (doc.byId.has(id)) ids.add(id);
    }
  }
  return ids;
}

function compactIds(ids) {
  const sorted = [...ids].sort((a, b) => a - b);
  const parts = [];
  for (let index = 0; index < sorted.length; index += 1) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[end] + 1) end += 1;
    parts.push(end > index ? `${sorted[index]}-${sorted[end]}` : String(sorted[index]));
    index = end;
  }
  return parts.join(',');
}

function syncUrl() {
  try {
    const params = new URLSearchParams();
    if (state.view !== 'checklist') params.set('view', state.view);
    if (state.selected) params.set('trophy', String(state.selected));
    if (state.kind !== 'all') params.set('kind', state.kind);
    if (state.grade !== 'all') params.set('grade', state.grade);
    if (state.missableOnly) params.set('missable', '1');
    if (state.q) params.set('q', state.q);
    if (state.spoiler) params.set('spoiler', 'on');
    if (state.sort !== 'stage') params.set('sort', state.sort);
    if (state.seeded && state.earned.size) params.set('earned', compactIds(state.earned));
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  } catch {
    // file:// or a restricted history API: the app still works.
  }
}

function showFatal(error) {
  const list = document.getElementById('trophyList');
  if (list) {
    list.innerHTML = `<li class="empty"><strong>The guide could not load.</strong>${esc(error.message)}</li>`;
  }
  const detail = document.getElementById('detailPane');
  if (detail) {
    detail.innerHTML = `<div class="empty"><strong>Offline guide</strong>Serve the <code>app/</code> folder over HTTP (<code>node serve.ts</code> at the repository root) and open <code>localhost:8080</code>. Every file is local; the app never fetches the network.</div>`;
  }
}

// Keep the store and the header in step when a save lands from another tab.
window.addEventListener('storage', (event) => {
  if (event.key !== 'leonida-ledger.v1') return;
  loadSaved();
  emit({ storage: true });
});
