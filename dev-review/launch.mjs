// Starts DFO Online with the dev-review loader in its main process, without touching the game's files.
//
// This game's Electron ignores a resources\app folder and NODE_OPTIONS, but honours its debug switch: the game is started
// paused on its first line (--inspect-brk), the loader is required into the main process through the debugger, the game is
// resumed, and the debug port is closed a few seconds later. The game's own app.asar, executable and settings are not changed;
// an update cannot remove the loader, because it is not in the game's folder.
//
// The debug port is open only for those few seconds, and only to this computer (127.0.0.1). That is why the loader is the
// dev-review version and not the base mod: the base mod needs no debugger, only a game build with the Mod API.
//
//   node launch.mjs [--game "<install folder>"] [-- <extra switches for the game>]
// The game folder: --game, else the DFO_GAME environment variable, else "Daggerfall Online" beside this repo's folder.
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const at = process.argv.indexOf('--game');
const game = resolve(at >= 0 ? process.argv[at + 1] : process.env.DFO_GAME || join(here, '..', '..', 'Daggerfall Online'));
const exe = join(game, 'DFO Online.exe');
const loader = join(here, 'loader', 'main.cjs').replace(/\\/g, '/');
const PORT = 9455;

const extra = process.argv.includes('--') ? process.argv.slice(process.argv.indexOf('--') + 1) : [];   // anything after -- goes to the game (e.g. --remote-debugging-port=9333)
const child = spawn(exe, [`--inspect-brk=${PORT}`, ...extra], {
  cwd: game, detached: true, stdio: 'ignore',
  env: { ...process.env, WAYFARER_INSPECT: '1' },
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
