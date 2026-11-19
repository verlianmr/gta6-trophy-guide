// The detail panel beside the checklist: the official description, our guide,
// the route, the missable window and the cited sources.
import { state, subscribe, toggleEarned, update } from './store.js';
import { visible } from './filters.js';
import { isMasked } from './spoiler.js';
import { kindLabel, formatCount, formatHours, gradeLabel } from './data.js';
import { esc, pathOf } from './html.js';

let lastRendered = null;

export function initDetail(data, pane) {
  pane.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-toggle]');
    if (toggle) {
      toggleEarned(Number(toggle.dataset.toggle));
      return;
    }
    const nav = event.target.closest('[data-nav]');
    if (nav && nav.dataset.nav) update({ selected: Number(nav.dataset.nav) });
  });

  subscribe(() => {
    renderDetail(data, pane);
    if (lastRendered !== state.selected) {
      lastRendered = state.selected;
      pane.scrollTop = 0;
    }
  });

  renderDetail(data, pane);
}

function renderDetail(data, pane) {
  const trophy = data.byId.get(state.selected);
  if (!trophy) {
    pane.innerHTML = `<div class="empty"><strong>Pick a trophy</strong>Select any row in the checklist to read its guide, route and sources.</div>`;
    return;
  }

  const earned = state.earned.has(trophy.id);
  const masked = isMasked(trophy);
  const { prev, next } = neighbours(data, trophy.id);
  const count = trophy.count ? ` · ${esc(formatCount(trophy))} ${esc(trophy.countUnit)}` : '';
  const earnedAt = earned && state.earnedAt[trophy.id]
    ? new Date(state.earnedAt[trophy.id]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const head = `<div class="detail-top">
      <span class="badge g-${trophy.grade}">${gradeLabel(trophy.grade)}</span>
      <span class="pill">Stage ${trophy.stage} of 6</span>
      <span class="pill">${esc(kindLabel(trophy))}</span>
      ${trophy.missable && !masked ? '<span class="pill pill-warn">⚑ Missable</span>' : ''}
      <span class="detail-idx">${trophy.id} / ${data.trophies.length}</span>
    </div>
    <h2>${masked ? 'Hidden story trophy' : esc(trophy.name)}</h2>
    <p class="official"><span>Official description</span>${masked ? 'Hidden by the spoiler shield until this trophy is earned.' : `“${esc(trophy.description)}”`}</p>`;

  const actions = `<div class="detail-actions">
      <button class="btn-primary${earned ? ' is-earned' : ''}" type="button" data-toggle="${trophy.id}">${earned ? '✓ Earned — tap to undo' : 'Mark as earned'}</button>
      <button class="btn-nav" type="button" data-nav="${prev ? prev.id : ''}"${prev ? '' : ' disabled'} aria-label="Previous trophy">← Prev</button>
      <button class="btn-nav" type="button" data-nav="${next ? next.id : ''}"${next ? '' : ' disabled'} aria-label="Next trophy">Next →</button>
    </div>`;

  const body = masked
    ? `<div class="shield">
        <h3>Story spoiler</h3>
        <p>This is a story trophy. Its name, description, guide and sources stay hidden until you earn it, so the roadmap cannot spoil the plot.</p>
        <div class="btnrow">
          <button class="btn-primary" type="button" data-toggle="${trophy.id}">Mark as earned</button>
          <button class="btn-nav" type="button" data-spoiler-off>Turn off the shield</button>
        </div>
      </div>
      <div class="detail-foot"><span>Stage ${trophy.stage}/6</span><span>≈ ${formatHours(trophy.hours)}</span><span>Hidden on PlayStation</span></div>`
    : `${trophy.missable && trophy.missableNote ? `<div class="callout"><strong>Missable window</strong><p>${esc(trophy.missableNote)}</p></div>` : ''}
      <h3>How to earn it</h3>
      <p class="guide-text">${esc(trophy.guide)}</p>
      <h3>Sources</h3>
      <ul class="sources">${trophy.sources.map(sourceHtml).join('')}</ul>
      <p class="src-note">Cited, never copied: the wording is this entry's own. Links open only if you follow them; the app fetches nothing.</p>
      ${trophy.steps.length ? `<h3>Route</h3><ol class="steps">${trophy.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>` : ''}
      <div class="detail-foot">
        <span>Stage ${trophy.stage}/6</span>
        <span>≈ ${formatHours(trophy.hours)}${count}</span>
        <span>${trophy.hidden ? 'Hidden on PlayStation until earned' : 'Visible on PlayStation'}</span>
        ${earnedAt ? `<span>Earned ${esc(earnedAt)}</span>` : ''}
      </div>`;

  pane.innerHTML = `<article class="detail">${head}${actions}${body}</article>`;
}

function sourceHtml(source) {
  return `<li>
    <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} <span aria-hidden="true">↗</span></a>
    <span class="src-url">${esc(pathOf(source.url))}</span>
  </li>`;
}

function neighbours(data, id) {
  const list = visible(data);
  const index = list.findIndex((trophy) => trophy.id === id);
  if (index < 0) return { prev: null, next: null };
  return { prev: list[index - 1] ?? null, next: list[index + 1] ?? null };
}
