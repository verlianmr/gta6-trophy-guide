// Recapture screenshots/ at exactly 1280x800 with headless Chrome.
// Usage: node serve.ts --port 8123 &  node shots.mjs [baseUrl]
// Chrome's --window-size alone leaves an 87 px browser strip in this build, so the
// viewport is set over the DevTools protocol and the page is captured from the surface.
// The debugging port is chosen by Chrome (port 0) and read from its stderr, so two
// builds on one machine never share a DevTools endpoint.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? process.env.SHOTS_BASE ?? 'http://localhost:8123';
const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const outDir = new URL('./screenshots/', import.meta.url);

const profile = mkdtempSync(join(tmpdir(), 'leonida-ledger-chrome-'));
const chrome = spawn('google-chrome', [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let devtoolsPort = 0;
chrome.stderr.setEncoding('utf8');
chrome.stderr.on('data', (chunk) => {
  const match = chunk.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
  if (match) devtoolsPort = Number(match[1]);
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function devtoolsTargets() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (devtoolsPort) {
      try {
        const response = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`);
        if (response.ok) return await response.json();
      } catch {
        // Chrome is still starting.
      }
    }
    await sleep(100);
  }
  throw new Error('Chrome DevTools did not start');
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const pending = message.id && this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    };
  }
  send(method, params = {}) {
    const id = (this.id += 1);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const targets = await devtoolsTargets();
const page = targets.find((target) => target.type === 'page');
if (!page) throw new Error('Chrome opened no page target');
const cdp = new Cdp(page.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

for (const shot of shots) {
  const url = `${base}${shot.path ?? '/'}${shot.query ? `?${shot.query}` : ''}`;
  await cdp.send('Page.navigate', { url });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await cdp.send('Runtime.evaluate', {
      expression: "location.href + '|' + document.querySelectorAll('.row').length",
      returnByValue: true,
    });
    const [href, rows] = String(result.result.value ?? '').split('|');
    if (Number(rows) > 0 && href.startsWith(base)) {
      ready = true;
      break;
    }
    await sleep(100);
  }
  if (!ready) throw new Error(`The guide did not render at ${url}`);
  await sleep(500);

  const capture = await cdp.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 90,
    fromSurface: true,
    captureBeyondViewport: false,
  });
  const bytes = Buffer.from(capture.data, 'base64');
  writeFileSync(new URL(shot.file, outDir), bytes);
  console.log(`${shot.file}  ${bytes.length} bytes  ${url}`);
}

await cdp.send('Browser.close').catch(() => {});
chrome.kill('SIGKILL');
