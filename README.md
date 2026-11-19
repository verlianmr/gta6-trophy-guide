# Leonida Ledger — a GTA VI trophy guide & tracker

[![make.fun — GTA 6 trophy guide](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![make.fun — rank](https://make.fun/badge/gta6-trophy-guide-01/verlianmr/gta6-trophy-guide/rank.svg)](https://make.fun/c/gta6-trophy-guide-01)
[![make.fun — reward](https://make.fun/badge/gta6-trophy-guide-01/verlianmr/gta6-trophy-guide/reward.svg)](https://make.fun/c/gta6-trophy-guide-01)

An offline guide and tracker for all **55 PlayStation 5 trophies of Grand Theft Auto VI**: the full
checklist, a six-stage roadmap to the platinum, every missable window, a guide in our own words for
each trophy with its citations, and progress that stays in your browser.

Everything is plain static files under `app/`. There is no build step, no framework and no network
request at run time — open it through a local server and it works with the network off.

## What it does

- **The checklist.** All 55 official names, descriptions and grades (1 platinum, 2 gold, 6 silver,
  46 bronze), each row showing its kind, stage and count. Ticking a trophy saves it in `localStorage`.
- **Filters and search.** Kind (story, missable, collectibles, activities, and online — the official
  list has none), grade, a missable-only toggle, and a search across names, descriptions, guides and
  source names. Sort by roadmap order, grade, name or unearned first.
- **The roadmap.** Six stages in the order to earn them, with trophy counts, per-stage progress and
  time estimates. Stage 4 collects the character strands, branch choices and one-time scenes; the
  missable rail groups all 14 flagged trophies by the stage where their window closes.
- **Missable flags built from the descriptions.** 14 trophies are flagged with the reason and the
  window, for example Andy's strand retiring when Chapter 4 ends, Cal's fishing challenge, Bret's
  unique animal, the partner jobs, the one-time scenes and the branch choices.
- **Cited guidance.** Every trophy has a 2–5 sentence guide written for this entry: what to do, where,
  how, and when it can be missed. Each one names the guide it draws on in the text and lists 1–2
  sources with links beside it (110 citations in all). The app never fetches a source; a link opens
  only when you follow it.
- **The spoiler shield.** With it on, story trophy names, descriptions, guides and sources are replaced
  by a lock until the trophy is earned. The setting is saved with your progress.
- **Export and import.** Export writes a small JSON file (names, ids, spoiler setting); import reads it
  back by trophy name or id, so progress moves between machines.
- **A detail panel beside the list.** Official description, our guide, the missable callout, the
  route, and the sources with their URLs.
- **Keyboard and layout.** `/` searches, `J`/`K` move, `X` toggles, `S` flips the spoiler shield,
  `1`/`2`/`3` switch views, `E` exports. Focus rings, ARIA tabs and a skip link are in place; the
  layout keeps the detail panel beside the list down to 1024 px wide.

## Run it

Node 22 is all it needs (the server is standard library only):

```sh
node serve.ts              # serves app/ at http://localhost:8080
```

Any static server works too:

```sh
cd app && python3 -m http.server 8080
```

Open <http://localhost:8080/>. Use the server, not `file://`, because the app fetches its own
`data/trophies.json`.

To hand the entry in, build the dossier:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## The data

`app/data/trophies.json` holds the game, platform, the six stage definitions, the shared source list
and the 55 trophies. The official name, description and grade of every trophy are exactly as the kit's
official list carries them; nothing in that text was altered. Added for each trophy:

| field | meaning |
| --- | --- |
| `guide` | 2–5 sentences in this entry's own words: what, where, how, when missed |
| `sources` | 1–2 citations, `{name, url}`, naming the guide the facts come from |
| `kind` | `story`, `missable`, `collectibles`, `activities` or `online` |
| `missable` | whether the trophy can be lost, with `missableNote` for the 14 that can |
| `stage` | roadmap stage 1–6, the order to earn it for the platinum |
| `hidden` | whether PlayStation hides it until earned (28 of 55) |
| `steps` | a short route, where one helps |
| `count` | the official count for a counted trophy (250 stunts, 42 ranges, 100 check-ins…) |

Every guide is paraphrased from the sources below and written for this entry; no guide text is copied.
The look is original: no Rockstar logo, official artwork, box art or game screenshot is used, and
there are no external fonts or images.

## Screenshots

`screenshots/` holds four real renders at 1280×800 (JPEG, under 256 KiB each). `shots.json` records
the views and query parameters the app understands; `node shots.mjs` recaptures them with headless
Chrome over the DevTools protocol:

```sh
node serve.ts --port 8123 &
node shots.mjs            # writes screenshots/*.jpg from shots.json
```

The four shots are the checklist with a missable trophy's guide and sources open, the roadmap with
its missable rail, the story filter with the spoiler shield on and progress saved, and the progress
view with the export/import panel.

## Sources

The guides draw on these public guides, wikis and videos; each trophy cites one or two of them beside
its guide.

- [PowerPyx — GTA VI trophy guide & roadmap](https://www.powerpyx.com/grand-theft-auto-6-trophy-guide-roadmap/)
- [PowerPyx — all collectibles & locations](https://www.powerpyx.com/grand-theft-auto-6-all-collectibles-locations/)
- [PowerPyx — activities & challenges guide](https://www.powerpyx.com/grand-theft-auto-6-activities-guide/)
- [PowerPyx — 100% completion checklist](https://www.powerpyx.com/grand-theft-auto-6-100-percent-completion-guide/)
- [PowerPyx — Strangers & Freaks strands](https://www.powerpyx.com/grand-theft-auto-6-strangers-and-freaks-guide/)
- [IGN — GTA VI trophy list & wiki](https://www.ign.com/wikis/grand-theft-auto-6/Trophies)
- [IGN — GTA VI walkthrough](https://www.ign.com/wikis/grand-theft-auto-6/Walkthrough)
- [PSNProfiles — GTA VI trophy guide](https://psnprofiles.com/guide/21000-grand-theft-auto-vi-trophy-guide)
- [GTA Wiki — GTA VI trophies](https://gta.fandom.com/wiki/Trophies_in_GTA_VI)
- [GTABase — GTA VI vehicle database](https://www.gtabase.com/gta-6/)
- [YouTube — PowerPyx](https://www.youtube.com/@PowerPyx)
- [YouTube — GTA Series Videos](https://www.youtube.com/@GTAseriesVideos)

## Files

```
app/
  index.html            the shell: top bar, filters, the three views
  style.css             the whole original look (no external fonts or images)
  app.js                boot, URL state, tabs, keyboard, header totals
  icon.svg              the monogram favicon
  data/trophies.json    the 55 trophies, guides, citations and stages
  js/data.js            loads and normalises the data, search index
  js/store.js           state, localStorage, earned/earnedAt, subscribe
  js/filters.js         search, kind/grade chips, missable toggle, sorting
  js/spoiler.js         the spoiler shield rule and switch
  js/render-list.js     the checklist rows and list header
  js/render-detail.js   the guide panel with sources, route and missable callout
  js/roadmap.js         the six stages and the missable rail
  js/summary.js         progress, grade/stage breakdowns, export panel, sources
  js/io.js              export, import, reset, toast
  js/html.js            escaping and URL helpers
main.ts                 copies app/ and screenshots/, writes dossier.json
serve.ts                the local static server
shots.json              the four screenshot views and their query parameters
shots.mjs               recaptures the screenshots at 1280×800
```

## License

MIT — see [LICENSE](LICENSE).
