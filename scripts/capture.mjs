/**
 * Dev-only screenshot harness: uses the locally installed Chrome through CDP
 * so each shot gets an exact CSS viewport and a forced colour scheme.
 *
 * Run the dev server first, then:
 *   node scripts/capture.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.TOKRI_URL ?? 'http://localhost:5174';
const OUT = process.env.TOKRI_SHOTS ?? join(process.cwd(), 'screenshots');
const PORT = Number(process.env.CDP_PORT ?? 9334);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'tokri-cdp-'));
const browser = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function json(path, init) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}${path}`, init);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error(`CDP endpoint did not answer: ${path}`);
}

const target = await json('/json/new?about:blank', { method: 'PUT' });
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let id = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
  }
});
function send(method, params = {}) {
  const messageId = ++id;
  socket.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(messageId, (message) => {
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result ?? {});
    });
  });
}

await send('Page.enable');
await send('Runtime.enable');

const sizes = [
  { key: '360', width: 360, height: 900 },
  { key: '768', width: 768, height: 1000 },
  { key: '1280', width: 1280, height: 950 },
];
const themes = ['light', 'dark'];

for (const theme of themes) {
  for (const size of sizes) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
      mobile: size.width < 768,
    });
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }],
    });

    for (const [name, path] of [
      ['home', `/?theme=${theme}`],
      ['listing', `/c/dairy?theme=${theme}`],
    ]) {
      await send('Page.navigate', { url: `${BASE}${path}` });
      await sleep(1400);

      // Walk the page once so lazy product images are decoded before the shot.
      await send('Runtime.evaluate', {
        expression: `(async () => {
          const step = Math.max(400, window.innerHeight * 0.8);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 70));
          }
          window.scrollTo(0, 0);
          await new Promise((resolve) => setTimeout(resolve, 500));
        })()`,
        awaitPromise: true,
      });
      await sleep(500);

      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const file = join(OUT, `${name}-${size.key}-${theme}.png`);
      const fs = await import('node:fs/promises');
      await fs.writeFile(file, Buffer.from(shot.data, 'base64'));
      console.log(`${file} (${size.width}x${size.height})`);
    }
  }
}

socket.close();
browser.kill();
await sleep(400);
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  // Chrome can hold a file briefly on Windows; the temp folder is disposable.
}
