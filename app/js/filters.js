// Search, kind/grade chips, the missable toggle and sorting; visible() is the single gate the list and detail pane read.
import { state, subscribe, update } from './store.js';
import { GRADES, KINDS, KIND_LABELS, gradeLabel } from './data.js';

export const KIND_FILTERS = ['all', ...KINDS];
export const GRADE_FILTERS = ['all', ...GRADES];
const GRADE_DOTS = {
  platinum: 'linear-gradient(135deg,#d9fbff,#8be6ff)',
  gold: 'linear-gradient(135deg,#ffe6a3,#ffc65c)',
  silver: 'linear-gradient(135deg,#eef4ff,#c8d4e6)',
  bronze: 'linear-gradient(135deg,#f3b98f,#e08a5c)',
};
const SORTERS = {
  stage: (a, b) => a.stage - b.stage || a.id - b.id,
  grade: (a, b) => GRADES.indexOf(a.grade) - GRADES.indexOf(b.grade) || a.stage - b.stage || a.id - b.id,
  name: (a, b) => a.name.localeCompare(b.name, 'en'),
  status: (a, b) => Number(state.earned.has(a.id)) - Number(state.earned.has(b.id)) || a.stage - b.stage || a.id - b.id,
};

export function matches(trophy, s = state, tokens = tokenise(s.q)) {
  if (s.kind !== 'all' && trophy.kind !== s.kind) return false;
  if (s.grade !== 'all' && trophy.grade !== s.grade) return false;
  if (s.missableOnly && !trophy.missable) return false;
  if (tokens.length) {
    for (const token of tokens) if (!trophy.searchText.includes(token)) return false;
  }
  return true;
}

export function visible(data, s = state) {
  const tokens = tokenise(s.q);
  return data.trophies.filter((trophy) => matches(trophy, s, tokens)).sort(SORTERS[s.sort] ?? SORTERS.stage);
}

export function initFilters(data) {
  const kindRoot = document.getElementById('kindChips');
  const gradeRoot = document.getElementById('gradeChips');
  const search = document.getElementById('search');
  const sort = document.getElementById('sort');
  const missable = document.getElementById('missableToggle');
  const resultLine = document.getElementById('resultLine');
  if (!kindRoot || !gradeRoot || !search || !sort || !missable) return;

  kindRoot.innerHTML = KIND_FILTERS.map((key) => {
    const count = key === 'all' ? data.trophies.length : data.kindCounts[key] ?? 0;
    const disabled = key === 'online' && count === 0;
    let title = `${count} ${KIND_LABELS[key] ?? 'All'} trophies`;
    if (disabled) title = 'The official list has no online trophies';
    if (key === 'missable') title = `${count} trophies classed as missable activities; ${data.missableCount} carry the missable flag — use Missable only for all of them`;
    return `<button class="chip" type="button" data-kind="${key}" aria-pressed="false" title="${title}"${disabled ? ' disabled' : ''}>${
      key === 'all' ? 'All' : KIND_LABELS[key]
    } <span class="n">${count}</span></button>`;
  }).join('');

  gradeRoot.innerHTML = GRADE_FILTERS.map((key) => {
    const count = key === 'all' ? data.trophies.length : data.gradeCounts[key] ?? 0;
    const dot = key === 'all' ? '' : `<span class="gdot" style="background:${GRADE_DOTS[key]}"></span>`;
    return `<button class="chip" type="button" data-grade="${key}" aria-pressed="false" title="${count} ${key === 'all' ? 'trophies' : gradeLabel(key)}">${
      dot + (key === 'all' ? 'All grades' : gradeLabel(key))
    } <span class="n">${count}</span></button>`;
  }).join('');

  kindRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-kind]');
    if (button && !button.disabled) update({ kind: button.dataset.kind });
  });
  gradeRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-grade]');
    if (button && !button.disabled) update({ grade: button.dataset.grade });
  });

  let timer = 0;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => update({ q: search.value }), 70);
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      search.value = '';
      update({ q: '' });
      search.blur();
    }
  });

  sort.addEventListener('change', () => update({ sort: sort.value }));
  missable.addEventListener('click', () => update({ missableOnly: !state.missableOnly }));

  function sync() {
    for (const button of kindRoot.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.kind === state.kind));
    }
    for (const button of gradeRoot.querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.grade === state.grade));
    }
    missable.setAttribute('aria-pressed', String(state.missableOnly));
    sort.value = state.sort;
    if (document.activeElement !== search && search.value !== state.q) search.value = state.q;
    const shown = visible(data).length;
    resultLine.textContent = shown === data.trophies.length ? `${shown} trophies` : `${shown} of ${data.trophies.length} trophies`;
  }

  subscribe(sync);
  sync();
}

function tokenise(query) {
  return String(query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}
