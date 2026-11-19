// The roadmap: six stages in earning order, with counts, time estimates and
// every missable window built from the official descriptions.
import { state, subscribe } from './store.js';
import { isMasked } from './spoiler.js';
import { formatHours } from './data.js';
import { esc } from './html.js';

const GRADE_COLORS = {
  platinum: 'linear-gradient(135deg,#d9fbff,#8be6ff)',
  gold: 'linear-gradient(135deg,#ffe6a3,#ffc65c)',
  silver: 'linear-gradient(135deg,#eef4ff,#c8d4e6)',
  bronze: 'linear-gradient(135deg,#f3b98f,#e08a5c)',
};

export function initRoadmap(data, root, openTrophy) {
  root.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-trophy]');
    if (chip) openTrophy(Number(chip.dataset.trophy));
  });
  subscribe(() => render(data, root));
  render(data, root);
}

function render(data, root) {
  const byStage = new Map();
  for (const trophy of data.trophies) {
    if (!byStage.has(trophy.stage)) byStage.set(trophy.stage, []);
    byStage.get(trophy.stage).push(trophy);
  }

  const stages = data.stages.length
    ? data.stages
    : [...byStage.keys()].sort((a, b) => a - b).map((n) => ({ n, title: `Stage ${n}`, subtitle: '', note: '', warning: null }));

  const earned = state.earned.size;
  const missableStages = stages
    .map((stage) => ({ stage, trophies: (byStage.get(stage.n) ?? []).filter((trophy) => trophy.missable) }))
    .filter((group) => group.trophies.length);

  const cards = stages
    .map((stage) => stageCard(stage, byStage.get(stage.n) ?? []))
    .join('');

  const groups = missableStages
    .map(({ stage, trophies }) => `<div class="miss-group">
        <h4><span>Stage ${stage.n} · ${esc(stage.title)}</span><span>${trophies.length}</span></h4>
        <div class="chips">${trophies.map(chipHtml).join('')}</div>
        <p>${esc(
          state.spoiler
            ? 'Hidden while the spoiler shield is on — it names story characters and scenes. Turn the shield off in the top bar to read the window.'
            : stage.warning ?? 'Finish these while their story window is open; the markers disappear when the story moves on.',
        )}</p>
      </div>`)
    .join('');

  root.innerHTML = `<div class="roadmap-main">
      <header class="viewhead">
        <div>
          <h2>Road to the platinum</h2>
          <p>Six stages in earning order, built from the official descriptions: chapters, named character finales, branch choices, collectible counts and activity totals. ${data.missableCount} of the 55 can be lost — the rail lists every window. ${earned} earned so far.</p>
        </div>
        <div class="legend" aria-hidden="true">
          <span><i style="background:#ff3d8b"></i>Missable</span>
          <span><i style="background:#35e0d0"></i>Earned</span>
          <span><i style="background:#8b5cf6"></i>Story</span>
        </div>
      </header>
      <div class="stage-grid">${cards}</div>
    </div>
    <aside class="rm-rail" aria-label="Missable windows">
      <div class="rail-block danger">
        <h3>Missable windows <span class="count">${data.missableCount}</span></h3>
        <p class="rail-sub">Lost when the story moves on. Grouped by the stage where each window closes; click a name to open its guide.</p>
        ${groups || '<p class="rail-sub">None in this list.</p>'}
      </div>
      <div class="rail-block">
        <h3>Point of no return</h3>
        <p class="point">The <b>final mission</b> closes the story. Finish every strand and one-time scene first, keep a manual save, then start the last chapter. The platinum waits on the 100% checklist in stage 6.</p>
      </div>
      <div class="rail-block">
        <h3>How the stages work</h3>
        <p class="point">Stages 1–3 are the story chapters. Stage 4 holds the character strands and branch choices. Stage 5 is the open-world sweep, and 6 is crime, cash and 100%. Nothing in 5 or 6 expires, so they are safe after the credits.</p>
      </div>
    </aside>`;
}

function stageCard(stage, trophies) {
  const done = trophies.filter((trophy) => state.earned.has(trophy.id)).length;
  const missable = trophies.filter((trophy) => trophy.missable).length;
  const hours = trophies.reduce((sum, trophy) => sum + trophy.hours, 0);
  const percent = trophies.length ? (done / trophies.length) * 100 : 0;
  return `<article class="stage-card${done === trophies.length && trophies.length ? ' is-done' : ''}" title="${esc(stage.note || stage.title)}">
      <div class="stage-head">
        <span class="stage-no">0${stage.n}</span>
        <div class="stage-title">
          <h3>${esc(stage.title)}</h3>
          <p>${esc(stage.subtitle)}</p>
        </div>
        <span class="stage-count">${done}/${trophies.length}</span>
      </div>
      <div class="meter meter-sm" aria-hidden="true"><span style="width:${percent}%"></span></div>
      <p class="stage-note">${trophies.length} trophies · ${missable ? `${missable} missable` : 'no missables'} · ≈ ${formatHours(hours)}</p>
      <div class="chips">${trophies.map(chipHtml).join('')}</div>
    </article>`;
}

function chipHtml(trophy) {
  const earned = state.earned.has(trophy.id);
  const masked = isMasked(trophy);
  const classes = ['tchip'];
  if (earned) classes.push('is-earned');
  if (trophy.missable) classes.push('is-missable');
  if (state.selected === trophy.id) classes.push('is-selected');
  const label = masked ? 'Hidden story trophy' : trophy.name;
  return `<button class="${classes.join(' ')}" type="button" data-trophy="${trophy.id}" title="${esc(trophy.missable ? `${label} — missable` : label)}">
      <span class="d" style="background:${GRADE_COLORS[trophy.grade]}"></span>${esc(label)}${trophy.missable ? '<span class="f" aria-label="missable">⚑</span>' : ''}${earned ? '<span class="f" aria-label="earned">✓</span>' : ''}
    </button>`;
}
