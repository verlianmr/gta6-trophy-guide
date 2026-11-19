// Decides when a story trophy is masked, and wires the header switch that turns the spoiler shield on and off.
import { state, subscribe, update } from './store.js';

export function isMasked(trophy, s = state) {
  return Boolean(
    s.spoiler &&
      !s.earned.has(trophy.id) &&
      trophy.grade !== 'platinum' &&
      trophy.kind === 'story',
  );
}

export function initSpoiler() {
  const input = document.getElementById('spoilerSwitch');
  if (!input) return;

  input.addEventListener('change', () => update({ spoiler: input.checked }, { persist: true }));

  document.addEventListener('click', (event) => {
    const off = event.target.closest('[data-spoiler-off]');
    if (off) update({ spoiler: false }, { persist: true });
  });

  subscribe(() => {
    input.checked = state.spoiler;
  });
  input.checked = state.spoiler;
}
