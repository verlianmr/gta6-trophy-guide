// The progress view: completion, grade and stage breakdowns, next up,
// export/import, the spoiler setting and the source list.
import { state, subscribe, update } from './store.js';
import { formatHours, gradeLabel } from './data.js';
import { isMasked } from './spoiler.js';
import { esc, pathOf } from './html.js';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_BARS = {
  platinum: 'linear-gradient(90deg,#d9fbff,#8be6ff)',
  gold: 'linear-gradient(90deg,#ffe6a3,#ffc65c)',
  silver: 'linear-gradient(90deg,#eef4ff,#c8d4e6)',
  bronze: 'linear-gradient(90deg,#f3b98f,#e08a5c)',
};

export function initSummary(data, root, openTrophy) {
  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-spoiler-toggle]')) {
      update({ spoiler: event.target.checked }, { persist: true });
    }
  });

  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-trophy]');
    if (target) openTrophy(Number(target.dataset.trophy));
  });

  subscribe(() => render(data, root));
  render(data, root);
}

function render(data, root) {
  const earned = state.earned.size;
  const total = data.trophies.length;
  const percent = Math.round((earned / total) * 100);
  const remaining = data.trophies.filter((trophy) => !state.earned.has(trophy.id));
  const remainingHours = remaining.reduce((sum, trophy) => sum + trophy.hours, 0);
  const missables = data.trophies.filter((trophy) => trophy.missable);
  const missablesDone = missables.filter((trophy) => state.earned.has(trophy.id)).length;

  const grades = GRADES.map((grade) => {
    const all = data.trophies.filter((trophy) => trophy.grade === grade);
    const done = all.filter((trophy) => state.earned.has(trophy.id)).length;
    const width = all.length ? (done / all.length) * 100 : 0;
    return `<div class="graderow">
        <span class="lab"><i style="background:${GRADE_BARS[grade]}"></i>${gradeLabel(grade)}</span>
        <span class="bar"><span style="width:${width}%;background:${GRADE_BARS[grade]}"></span></span>
        <span class="num">${done}/${all.length}</span>
      </div>`;
  }).join('');

  const stages = data.stages
    .map((stage) => {
      const all = data.trophies.filter((trophy) => trophy.stage === stage.n);
      const done = all.filter((trophy) => state.earned.has(trophy.id)).length;
      const width = all.length ? (done / all.length) * 100 : 0;
      return `<div class="stagerow">
          <span class="sn">0${stage.n}</span>
          <span class="st">${esc(stage.title)}</span>
          <span class="bar"><span style="width:${width}%"></span></span>
          <span class="num">${done}/${all.length}</span>
        </div>`;
    })
    .join('');

  const next = remaining
    .slice()
    .sort((a, b) => a.stage - b.stage || a.id - b.id)
    .slice(0, 4)
    .map((trophy) => `<button class="tchip" type="button" data-trophy="${trophy.id}">
        <span class="d" style="background:${GRADE_BARS[trophy.grade]}"></span>${esc(isMasked(trophy) ? 'Hidden story trophy' : trophy.name)}
        <span class="f" style="color:var(--dim)">S${trophy.stage}</span>
      </button>`)
    .join('');

  const sources = data.sources
    .map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.name)} <span aria-hidden="true">↗</span></a><span class="src-url">${esc(pathOf(source.url))}</span></li>`)
    .join('');

  const citations = data.trophies.reduce((sum, trophy) => sum + trophy.sources.length, 0);
  const hidden = data.trophies.filter((trophy) => trophy.hidden).length;
  const guides = data.trophies.filter((trophy) => trophy.guide).length;
  const stats = [
    [guides, 'guides written for this entry'],
    [citations, 'cited sources beside them'],
    [data.missableCount, 'missable windows flagged'],
    [hidden, 'hidden on PlayStation'],
    [data.stages.length, 'roadmap stages'],
    [total, 'official trophies covered'],
  ]
    .map(([value, label]) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`)
    .join('');

  root.innerHTML = `<div class="progress-main">
      <section class="card hero">
        <p class="kicker">Completion</p>
        <div class="hero-row">
          <span class="bignum">${earned}</span><span class="bignum-den">/ ${total}</span>
          <span class="hero-pct">${percent}%</span>
        </div>
        <div class="meter meter-lg" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${earned}"><span style="width:${percent}%"></span></div>
        <div class="hero-meta">
          <span><b>${formatHours(remainingHours)}</b> estimated to platinum</span>
          <span><b>${missablesDone}/${missables.length}</b> missables banked</span>
          <span><b>${remaining.length}</b> trophies left</span>
        </div>
      </section>
      <section class="card">
        <h3>By grade</h3>
        ${grades}
      </section>
      <section class="card">
        <h3>By stage</h3>
        ${stages}
      </section>
      <section class="card">
        <h3>Next up</h3>
        <div class="chips">${next || '<p class="fine">Every trophy is earned. The platinum is yours.</p>'}</div>
      </section>
      <section class="card">
        <h3>Data in this guide</h3>
        <div class="statgrid">${stats}</div>
      </section>
    </div>
    <div class="progress-side">
      <section class="card">
        <h3>Save &amp; transfer</h3>
        <div class="btnrow">
          <button class="btn" type="button" data-action="export">Export progress</button>
          <label class="btn btn-ghost import-btn">Import file<input type="file" data-import accept="application/json,.json"></label>
          <button class="btn btn-ghost" type="button" data-action="reset">Reset</button>
        </div>
        <p class="fine">Progress is stored in this browser's <b>localStorage</b>. Export writes a small JSON file you can import on another machine; import matches trophies by name or id.</p>
        <p class="fine" id="saveLine">${saveLine()}</p>
      </section>
      <section class="card">
        <h3>Spoiler shield</h3>
        <label class="switch">
          <input type="checkbox" data-spoiler-toggle${state.spoiler ? ' checked' : ''}>
          <span class="switch-track" aria-hidden="true"><span class="switch-dot"></span></span>
          <span class="switch-label">Hide story trophies until earned</span>
        </label>
        <p class="fine">With the shield on, story trophy names, descriptions and guides are replaced by a lock until you mark them earned. The setting is saved with your progress.</p>
      </section>
      <section class="card">
        <h3>Keyboard</h3>
        <div class="keys">
          <div><kbd>/</kbd>Search</div><div><kbd>J</kbd><kbd>K</kbd>Next / previous</div>
          <div><kbd>X</kbd>Toggle earned</div><div><kbd>S</kbd>Spoiler shield</div>
          <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd>Views</div><div><kbd>E</kbd>Export</div>
        </div>
      </section>
      <section class="card">
        <h3>Sources this guide draws on</h3>
        <ul class="src-list">${sources}</ul>
        <p class="fine">Each trophy's guide cites one or two of these beside it. Facts are attributed; the wording is this entry's own. The app fetches nothing at run time.</p>
      </section>
    </div>`;
}

function saveLine() {
  if (!state.savedAt) return 'Not saved yet — ticking a trophy saves it here.';
  const seconds = Math.max(0, Math.round((Date.now() - state.savedAt) / 1000));
  if (seconds < 60) return 'Saved in this browser just now.';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Saved in this browser ${minutes} min ago.`;
  const hours = Math.round(minutes / 60);
  return `Saved in this browser ${hours} h ago.`;
}
