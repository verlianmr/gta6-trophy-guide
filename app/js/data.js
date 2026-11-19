// Loads app/data/trophies.json and normalises it once: every renderer reads this shape.
const DATA_URL = 'data/trophies.json';

export const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
export const KINDS = ['story', 'missable', 'collectibles', 'activities', 'online'];
export const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const GRADE_LETTERS = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };
const NUMBER = new Intl.NumberFormat('en-US');

export async function loadData() {
  let raw;
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    raw = await response.json();
  } catch (error) {
    throw new Error(`Could not read ${DATA_URL} — serve app/ over HTTP. (${error.message})`);
  }
  const list = Array.isArray(raw) ? raw : raw?.trophies;
  if (!Array.isArray(list) || !list.length) throw new Error('trophies.json holds no trophy array');

  const trophies = list
    .map(normaliseTrophy)
    .filter((trophy) => trophy.id && trophy.name)
    .sort((a, b) => a.id - b.id);

  const byId = new Map(trophies.map((trophy) => [trophy.id, trophy]));
  const byName = new Map(trophies.map((trophy) => [normaliseName(trophy.name), trophy]));
  const stages = (Array.isArray(raw?.stages) ? raw.stages : [])
    .map((stage) => ({
      n: Number(stage.n),
      title: String(stage.title ?? `Stage ${stage.n}`),
      subtitle: String(stage.subtitle ?? ''),
      note: String(stage.note ?? ''),
      warning: stage.warning ? String(stage.warning) : null,
    }))
    .filter((stage) => stage.n >= 1 && stage.n <= 6)
    .sort((a, b) => a.n - b.n);

  const sources = Array.isArray(raw?.sources)
    ? raw.sources.filter((source) => source && source.name && source.url).map((source) => ({ name: String(source.name), url: String(source.url) }))
    : [];

  return {
    game: String(raw?.game ?? 'Grand Theft Auto VI'),
    platform: String(raw?.platform ?? 'PlayStation 5'),
    list: String(raw?.list ?? ''),
    trophies,
    byId,
    byName,
    stages,
    sources,
    gradeCounts: countBy(trophies, (trophy) => trophy.grade),
    kindCounts: countBy(trophies, (trophy) => trophy.kind),
    missableCount: trophies.filter((trophy) => trophy.missable).length,
    totalHours: Math.round(trophies.reduce((sum, trophy) => sum + trophy.hours, 0)),
  };
}

function normaliseTrophy(item, index) {
  const grade = GRADES.includes(item.grade) ? item.grade : 'bronze';
  const kind = KINDS.includes(item.kind) ? item.kind : 'activities';
  const stage = Number.isInteger(item.stage) && item.stage >= 1 && item.stage <= 6 ? item.stage : 5;
  const sources = Array.isArray(item.sources)
    ? item.sources
        .filter((source) => source && source.name && source.url)
        .slice(0, 3)
        .map((source) => ({ name: String(source.name), url: String(source.url) }))
    : [];
  const steps = Array.isArray(item.steps) ? item.steps.filter((step) => typeof step === 'string' && step.trim()).map(String) : [];
  const count = Number.isFinite(item.count) && item.count > 0 ? item.count : null;
  const trophy = {
    id: Number.isInteger(item.id) ? item.id : index + 1,
    name: String(item.name ?? '').trim(),
    description: String(item.description ?? '').trim(),
    grade,
    hidden: Boolean(item.hidden),
    kind,
    missable: Boolean(item.missable),
    missableNote: item.missableNote ? String(item.missableNote) : '',
    stage,
    hours: Number.isFinite(item.hours) ? Number(item.hours) : 0,
    count,
    countUnit: count && item.countUnit ? String(item.countUnit) : '',
    guide: String(item.guide ?? '').trim(),
    steps,
    sources,
  };
  trophy.searchText = [
    trophy.name,
    trophy.description,
    trophy.guide,
    KIND_LABELS[trophy.kind],
    trophy.countUnit,
    trophy.steps.join(' '),
    trophy.sources.map((source) => source.name).join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return trophy;
}

function countBy(items, keyOf) {
  const counts = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1;
  return counts;
}

export function normaliseName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function gradeLabel(grade) {
  return GRADE_LABELS[grade] ?? grade;
}

export function gradeLetter(grade) {
  return GRADE_LETTERS[grade] ?? '?';
}

export function kindLabel(trophy) {
  if (trophy.grade === 'platinum') return 'Platinum';
  return KIND_LABELS[trophy.kind] ?? trophy.kind;
}

export function formatCount(trophy) {
  if (!trophy.count) return '';
  const number = NUMBER.format(trophy.count);
  return trophy.countUnit === 'dollars' ? `$${number}` : number;
}

export function formatHours(hours) {
  if (hours >= 10) return `${Math.round(hours)} h`;
  const value = Math.round(hours * 10) / 10;
  return Number.isInteger(value) ? `${value} h` : `${value.toFixed(1)} h`;
}
