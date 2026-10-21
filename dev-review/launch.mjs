// Starts DFO Online with the developer loader in its main process, without touching the game's files.
//
// This game's Electron ignores a resources\app folder and NODE_OPTIONS, but honours its debug switch: the game is started
// paused on its first line (--inspect-brk), the loader is required into the main process through the debugger, the game is
// resumed, and the debug port is closed a few seconds later. The game's own app.asar, executable and settings are not changed;
// an update cannot remove the loader, because it is not in the game's folder.
//
// The debug port is open only for those few seconds, and only to this computer (127.0.0.1). That is why the loader is the
// developer version and not the base mod: the base mod needs no debugger, only a game build with the Mod API.
//
//   node launch.mjs [--game "<install folder>"] [-- <extra switches for the game>]
// or, with no Node.js installed, the game's own runtime ("Play Wayfarer.cmd" does this):
//   set ELECTRON_RUN_AS_NODE=1 & "<game>\DFO Online.exe" launch.mjs
// The game's runtime is Node 24, so this file runs under either. The game itself is started WITHOUT ELECTRON_RUN_AS_NODE.
// The game folder: --game, else the DFO_GAME environment variable, else "Daggerfall Online" beside this repo's folder.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--game');
// Windows, macOS and Linux alike (platform.cjs): --game may be the install folder, the macOS "DFO Online.app", a Linux AppImage
// or its folder; else DFO_GAME, the game beside this mod's folder or around it, and the game's usual homes.
const found = createRequire(import.meta.url)('./platform.cjs').findGame(join(here, '..'), at >= 0 ? process.argv[at + 1] : undefined);
if (!found) { console.error('DFO Online was not found. Set DFO_GAME to the game (its folder, "DFO Online.app" or the AppImage), or pass --game "<path>".'); process.exit(1); }
const exe = found.exe;
const loader = join(here, 'loader', 'main.cjs').replace(/\\/g, '/');
const PORT = 9455;

const extra = process.argv.includes('--') ? process.argv.slice(process.argv.indexOf('--') + 1) : [];   // anything after -- goes to the game (e.g. --remote-debugging-port=9333)
const child = spawn(exe, [`--inspect-brk=${PORT}`, ...extra], {
  cwd: dirname(exe), detached: true, stdio: 'ignore',
  env: Object.fromEntries(Object.entries({ ...process.env, WAYFARER_INSPECT: '1' }).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE')),
});
child.unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function target() {
  for (let i = 0; i < 100; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list[0]?.webSocketDebuggerUrl) return list[0].webSocketDebuggerUrl; } catch { /* not up yet */ }
    await sleep(150);
  }
  throw new Error('the game did not open its debug port');
}

const ws = new WebSocket(await target());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('could not connect to the game')); });
let id = 0;
const pending = new Map();
let onPaused = null;
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Debugger.paused') onPaused?.(d.params);
};
const call = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

const paused = new Promise((res) => { onPaused = res; });
await call('Debugger.enable');
await call('Runtime.runIfWaitingForDebugger');
const where = await Promise.race([paused, sleep(15000).then(() => null)]);
if (!where) throw new Error('the game did not stop on its first line');

const code = `(() => { const r = require('module').createRequire(${JSON.stringify(loader)}); r(${JSON.stringify(loader)}); return 'loaded'; })()`;
const out = await call('Debugger.evaluateOnCallFrame', { callFrameId: where.callFrames[0].callFrameId, expression: code, returnByValue: true });
const value = out.result?.result?.value ?? out.result?.exceptionDetails?.exception?.description ?? JSON.stringify(out.result ?? out);
console.log(`loader: ${value}`);
await call('Debugger.resume');
await sleep(500);
ws.close();
console.log(value === 'loaded' ? 'DFO Online started with the mods.' : 'The game started, but the loader did not load.');
process.exit(value === 'loaded' ? 0 : 1);
