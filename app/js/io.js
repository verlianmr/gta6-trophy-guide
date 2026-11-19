// Progress export, import and reset: plain hand-editable JSON, the toasts, and the two-step reset confirmation.
import { state, setEarned, update } from './store.js';
import { normaliseName } from './data.js';

let toastTimer = 0;
let saveTimer = 0;
let resetTimer = 0;

export function toast(message) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-on'), 3200);
}

export function initIO(data) {
  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'export') exportProgress(data);
    if (action.dataset.action === 'reset') armReset(action, data);
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-import]');
    if (input && input.files && input.files[0]) {
      importFile(input.files[0], data).finally(() => {
        input.value = '';
      });
    }
  });

  document.addEventListener('ledger:saved', () => {
    const label = document.getElementById('saveState');
    if (!label) return;
    label.textContent = 'Saved · just now';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      label.textContent = 'Saved locally';
    }, 5000);
  });
}

export function exportProgress(data) {
  const earned = data.trophies.filter((trophy) => state.earned.has(trophy.id));
  const payload = {
    app: 'leonida-ledger',
    version: 1,
    game: data.game,
    platform: data.platform,
    exportedAt: new Date().toISOString(),
    count: earned.length,
    total: data.trophies.length,
    earned: earned.map((trophy) => trophy.name),
    ids: earned.map((trophy) => trophy.id),
    settings: { spoiler: state.spoiler },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leonida-ledger-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${earned.length} of ${data.trophies.length} trophies`);
}

async function importFile(file, data) {
  let doc;
  try {
    doc = JSON.parse(await file.text());
  } catch {
    toast('That file is not valid JSON');
    return;
  }

  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.earned) ? doc.earned : Array.isArray(doc?.ids) ? doc.ids : null;
  if (!list) {
    toast('No trophy list found in that file');
    return;
  }

  const ids = new Set();
  for (const item of list) {
    const trophy = resolveTrophy(item, data);
    if (trophy) ids.add(trophy.id);
  }
  if (!ids.size && list.length) {
    toast('No trophy names in that file matched this list');
    return;
  }

  setEarned(ids);
  if (doc && !Array.isArray(doc) && doc.settings && typeof doc.settings.spoiler === 'boolean') {
    update({ spoiler: doc.settings.spoiler }, { persist: true });
  }
  toast(`Imported ${ids.size} of ${data.trophies.length} trophies`);
}

function resolveTrophy(item, data) {
  if (Number.isInteger(item) && data.byId.has(item)) return data.byId.get(item);
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (/^\d+$/.test(trimmed) && data.byId.has(Number(trimmed))) return data.byId.get(Number(trimmed));
    return data.byName.get(normaliseName(trimmed)) ?? null;
  }
  if (item && typeof item === 'object') {
    if (Number.isInteger(item.id) && data.byId.has(item.id)) return data.byId.get(item.id);
    if (typeof item.name === 'string') return data.byName.get(normaliseName(item.name)) ?? null;
  }
  return null;
}

function armReset(button, data) {
  if (button.dataset.armed === '1') {
    button.dataset.armed = '0';
    button.textContent = 'Reset';
    clearTimeout(resetTimer);
    setEarned([]);
    toast('Progress cleared');
    return;
  }
  button.dataset.armed = '1';
  button.textContent = 'Click again to reset';
  toast(`This clears all ${state.earned.size} earned trophies`);
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    button.dataset.armed = '0';
    button.textContent = 'Reset';
  }, 4000);
}
