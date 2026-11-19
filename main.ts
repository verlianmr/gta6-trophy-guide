// Leonida Ledger — the hand-in program for the gta6-trophy-guide-01 entry.
//
// What it hands in: the guide itself, app/ (plain static files — index.html, one stylesheet, ES modules and
// data/trophies.json — that a browser opens offline with no build step), plus screenshots/, the four views of it
// running. This program copies both into the output directory unchanged, then writes dossier.json beside them: the
// judge's summary of the entry, built by the vendored make.fun library from the files just copied. vendor/ is never
// edited, so the dossier stays byte for byte what the scorer's own copy of that library would write.
//
// The output directory is /output inside the grader's container and $MAKEFUN_OUTPUT_DIR anywhere else:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

/** The entry's root: the directory holding this file, app/ and screenshots/. */
const ENTRY_ROOT = fileURLToPath(new URL('.', import.meta.url));

/**
 * The scorer's own limits (reference/gate.json). Only text_max_bytes shapes the dossier's bytes; the rest are stated
 * so a build fails here, with a clear message, for the same reasons the scorer would refuse the entry: more than 4
 * screenshots or one over 256 KiB, more than 993 files or 48 MiB of app/ (app/ shares /output's 1000-entry cap with
 * screenshots/ and dossier.json).
 */
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

/** Where the finished entry goes: the grader's /output, or $MAKEFUN_OUTPUT_DIR when run by hand. */
function resolveOutputDir(): string {
  return process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
}

/** Copies the guide, whole and unmodified, to <outDir>/app. */
function copyGuide(outDir: string): void {
  cpSync(join(ENTRY_ROOT, 'app'), join(outDir, 'app'), { recursive: true });
}

/** Copies the screenshots to <outDir>/screenshots; the first by name is the cover. */
function copyScreenshots(outDir: string): void {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  const from = join(ENTRY_ROOT, 'screenshots');
  if (existsSync(from)) cpSync(from, join(outDir, 'screenshots'), { recursive: true });
}

/** Writes <outDir>/dossier.json: the vendored library reads the copied entry and returns the bytes to store. */
function writeDossier(outDir: string): void {
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

/** Assembles the hand-in in the output directory: app/, screenshots/, dossier.json. */
function main(): void {
  const outDir = resolveOutputDir();
  mkdirSync(outDir, { recursive: true });
  copyGuide(outDir);
  copyScreenshots(outDir);
  writeDossier(outDir);
}

main();
