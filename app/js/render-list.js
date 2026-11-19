// Draws the checklist rows and the "n shown" counter, and keeps the selected row in view.
import { state, subscribe, toggleEarned, update } from './store.js';
import { visible } from './filters.js';
import { isMasked } from './spoiler.js';
import { kindLabel, formatCount, gradeLabel, gradeLetter } from './data.js';
import { esc } from './html.js';

export function initList(data, root) {
  root.addEventListener('click', (event) => {
    const clear = event.target.closest('[data-clear]');
    if (clear) {
      update({ q: '', kind: 'all', grade: 'all', missableOnly: false });
      return;
    }
    const open = event.target.closest('[data-open]');
    if (open) update({ selected: Number(open.dataset.open) });
  });

  root.addEventListener('change', (event) => {
    const tick = event.target.closest('input[data-tick]');
    if (tick) toggleEarned(Number(tick.dataset.tick));
  });

  subscribe(() => renderList(data, root));
  renderList(data, root);
}

function renderList(data, root) {
  const active = document.activeElement;
  const focusRow = active && active.closest ? active.closest('.row') : null;
  const focusId = focusRow?.dataset.id;
  const focusTick = Boolean(active && active.matches && active.matches('input[data-tick]'));
  const list = visible(data);

  root.innerHTML = list.length ? list.map(rowHtml).join('') : emptyHtml();
  updateHead(data, list);

  if (focusId) {
    const row = root.querySelector(`.row[data-id="${focusId}"]`);
    const target = focusTick ? row?.querySelector('input[data-tick]') : row?.querySelector('.row-open');
    if (target) target.focus({ preventScroll: true });
  }
}

function rowHtml(trophy) {
  const earned = state.earned.has(trophy.id);
  const selected = state.selected === trophy.id;
  const masked = isMasked(trophy);
  const name = masked ? 'Hidden story trophy' : trophy.name;
  const description = masked ? 'Spoiler shield on — mark it earned to reveal' : trophy.description;
  const flag = trophy.missable && !masked ? '<span class="row-flag">Missable</span>' : '';
  const count = trophy.count ? `<span class="cnt">${esc(formatCount(trophy))}</span>` : '';
  const label = earned ? `Mark ${name} as unearned` : `Mark ${name} as earned`;

  return `<li class="row${earned ? ' is-earned' : ''}${selected ? ' is-selected' : ''}${masked ? ' is-masked' : ''}" data-id="${trophy.id}">
    <label class="tick"><input type="checkbox" data-tick="${trophy.id}"${earned ? ' checked' : ''} aria-label="${esc(label)}"></label>
    <span class="gchip g-${trophy.grade}" title="${gradeLabel(trophy.grade)}" aria-hidden="true">${gradeLetter(trophy.grade)}</span>
    <button class="row-open" type="button" data-open="${trophy.id}" aria-current="${selected ? 'true' : 'false'}">
      <span class="row-name">${esc(name)}${flag}</span>
      <span class="row-desc">${esc(description)}</span>
    </button>
    <span class="row-kind k-${trophy.kind}">${esc(kindLabel(trophy))}</span>
    <span class="row-meta"><span class="st">S${trophy.stage}</span>${count}</span>
    <span class="row-chev" aria-hidden="true">›</span>
  </li>`;
}

function emptyHtml() {
  return `<li class="empty"><strong>No trophy matches those filters.</strong>Try another grade or kind, or clear the search.<br><button type="button" data-clear>Clear filters</button></li>`;
}

function updateHead(data, list) {
  const earned = state.earned.size;
  const earnedHere = list.filter((trophy) => state.earned.has(trophy.id)).length;
  const missable = list.filter((trophy) => trophy.missable).length;
  const filtered = list.length !== data.trophies.length;

  const sub = document.getElementById('listSub');
  if (sub) {
    sub.textContent = filtered
      ? `${list.length} shown · ${earnedHere} earned · ${missable} missable`
      : `All ${data.trophies.length} · ${data.missableCount} missable · progress saved in this browser`;
  }
  const showing = document.getElementById('showingCount');
  if (showing) showing.textContent = `${list.length} shown`;

  const bar = document.getElementById('listBar');
  if (bar) bar.style.width = `${(earned / data.trophies.length) * 100}%`;
}
