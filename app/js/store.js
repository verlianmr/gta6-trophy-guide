// The app's state and its only writer: progress, filters and settings, saved to localStorage and pushed to subscribers.
const STORAGE_KEY = 'leonida-ledger.v1';
const listeners = new Set();

export const state = {
  earned: new Set(),
  earnedAt: {},
  spoiler: false,
  view: 'checklist',
  kind: 'all',
  grade: 'all',
  missableOnly: false,
  q: '',
  sort: 'stage',
  selected: null,
  savedAt: 0,
  seeded: false,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(change = {}) {
  for (const fn of listeners) fn(state, change);
}

export function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return false;
    if (Array.isArray(raw.earned)) {
      state.earned = new Set(raw.earned.map(Number).filter((id) => Number.isInteger(id) && id > 0));
    }
    if (raw.earnedAt && typeof raw.earnedAt === 'object') {
      for (const [id, at] of Object.entries(raw.earnedAt)) {
        if (state.earned.has(Number(id)) && Number.isFinite(Number(at))) state.earnedAt[id] = Number(at);
      }
    }
    if (typeof raw.spoiler === 'boolean') state.spoiler = raw.spoiler;
    if (Number.isFinite(raw.savedAt)) state.savedAt = Number(raw.savedAt);
    return true;
  } catch {
    return false;
  }
}

export function save() {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: 1,
        earned: [...state.earned].sort((a, b) => a - b),
        earnedAt: state.earnedAt,
        spoiler: state.spoiler,
        savedAt: state.savedAt,
      }),
    );
  } catch {
    // Private mode or a full quota: the app keeps working in memory.
  }
  document.dispatchEvent(new CustomEvent('ledger:saved', { detail: state.savedAt }));
}

export function update(patch, { persist = false, render = true } = {}) {
  Object.assign(state, patch);
  if (persist) save();
  if (render) emit(patch);
}

export function setEarned(ids, { persist = true } = {}) {
  state.earned = new Set([...ids].map(Number).filter((id) => Number.isInteger(id) && id > 0));
  const now = Date.now();
  for (const id of state.earned) if (!state.earnedAt[id]) state.earnedAt[id] = now;
  for (const id of Object.keys(state.earnedAt)) if (!state.earned.has(Number(id))) delete state.earnedAt[id];
  if (persist) save();
  emit({ earned: true });
}

export function toggleEarned(id) {
  if (state.earned.has(id)) {
    state.earned.delete(id);
    delete state.earnedAt[id];
  } else {
    state.earned.add(id);
    state.earnedAt[id] = Date.now();
  }
  save();
  emit({ earned: true, id });
}

export function setSelected(id) {
  if (!Number.isInteger(id)) return;
  update({ selected: id });
}

export function earnedCount() {
  return state.earned.size;
}
