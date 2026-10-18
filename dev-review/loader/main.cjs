// BEARDD'S WAYFARER - THE DEV-REVIEW LOADER: the Mod API for the RELEASED game, until the game ships it.
//
// It reaches the game through Electron's debug switch, so it is kept apart from the base mod, for the developers to review
// (dev-review/README.md). launch.mjs requires this file into the game's own main process while the game is paused on its
// first line, so it runs before the game's code and changes nothing in the game's folder. It wraps the dagger:// protocol so that:
//   - /__dfo/core.js is the mod API's host (core/core.js, built from the game's own src/mods/modApi.js),
//   - /__dfo/modules.json lists the modules installed in the player's Mods folder (<user data>/Mods/<id>/),
//   - /__dfo/m/<id>/<file> serves a module's own files,
//   - the game page gets ONE <script> tag, for the core (which imports each module),
//   - the game's JS chunks get the text patches (core/hooks.cjs) that announce the events the installed modules listen to -
//     and only those.
//
// MODULES ARE THE GAME'S OWN FORMAT. A module is a folder with a module.json (id, name, its version, the interface number it
// was written for, the events it listens to) and a module.js whose default export is setup(dfo): the folder the game's native
// Mod API reads, from the same Mods folder. The loader judges none of it - the core does, with the game's own parseManifest -
// it only finds the folders, serves their files and puts in the hooks their `events` ask for. So a module runs here today and
// natively once the game ships the API, and no module knows the difference.
//
// A game update that moves a hook turns off the modules that listen to THAT event, and names them: never the game.
'use strict';
const path = require('path');
const fs = require('fs');
// a line a run in loader-run.log (the loader's own record: did it start, did it wrap, what did it serve). Not loader.log: the
// launcher's stdout is redirected into that file, and its writes overwrite these lines.
const LOG = path.join(__dirname, '..', 'loader-run.log');
const log = (m) => { try { fs.appendFileSync(LOG, `${new Date().toISOString()} [${process.type || 'node'} ${process.pid}] ${m}\n`); } catch { /* the record is a courtesy */ } };
log('start');
if (process.env.WAYFARER_INSPECT === '1') setTimeout(() => { try { require('inspector').close(); } catch { /* it closes with the game */ } }, 4000);   // the launcher's door is shut again once the game is up
if (process.type && process.type !== 'browser') return;   // only the main process serves the page
if (globalThis.__dfoLoaderRan) return;
globalThis.__dfoLoaderRan = true;
const { app, protocol } = require('electron');

const ASAR = path.join(process.resourcesPath, 'app.asar');
const MOD_ROOT = fs.existsSync(path.join(__dirname, 'mod-root.txt')) ? fs.readFileSync(path.join(__dirname, 'mod-root.txt'), 'utf8').trim() : path.resolve(__dirname, '..');
const CORE_FILE = path.join(MOD_ROOT, 'core', 'core.js');
// the folder the game's own shell keeps its files in (main.cjs sets it the same way); modules live in its Mods folder
const USER_DATA = process.env.DAGGER_USER_DATA || path.join(app.getPath('appData'), 'Daggerfall JavaScript');
const MODS_DIR = path.join(USER_DATA, 'Mods');

const pkg = require(path.join(ASAR, 'package.json'));

const status = { gameVersion: pkg.version, modsDir: MODS_DIR, modules: {}, hooks: {}, errors: [] };

let HOOKS = {};
let applyPatch = null;
try {
  HOOKS = require(path.join(MOD_ROOT, 'core', 'hooks.cjs'));
  ({ applyPatch } = require(path.join(MOD_ROOT, 'core', 'patch-core.cjs')));
} catch (e) {
  status.errors.push(`the hook catalog did not load: ${e.message}`);
}

/** The folders under Mods named like modules, each with its raw manifest (the core judges it) or why it could not be read. */
function readModules() {
  let names = [];
  try { names = fs.readdirSync(MODS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && /^[a-z0-9][a-z0-9-]{0,63}$/.test(d.name)).map((d) => d.name).sort(); } catch { /* none */ }
  return names.map((dir) => {
    try {
      const file = path.join(MODS_DIR, dir, 'module.json');
      if (fs.statSync(file).size > 64 * 1024) return { dir, manifest: null, error: 'module.json is too large' };
      return { dir, manifest: JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (e) {
      return { dir, manifest: null, error: `module.json: ${e && e.code === 'ENOENT' ? 'not found' : (e && e.message) || 'unreadable'}` };
    }
  });
}

const modules = readModules();
/** The events the installed modules listen to, by their manifests - the hooks to put in. (A module the core refuses never
 *  runs; its hook is in the game's code, announcing to no one.) */
const wanted = [...new Set(modules.flatMap((m) => (Array.isArray(m.manifest?.events) ? m.manifest.events : [])))].filter((e) => typeof e === 'string');
for (const m of modules) status.modules[m.dir] = { events: Array.isArray(m.manifest?.events) ? m.manifest.events : [], broken: [] };
// a hook is one patch, named by its event - or one of several for an event, which it names in `event` (all must be in)
const eventOf = (id) => HOOKS[id].event ?? id;
const hookIds = Object.keys(HOOKS).filter((id) => wanted.includes(eventOf(id)));
for (const e of wanted) if (!hookIds.some((id) => eventOf(id) === e)) status.hooks[e] = 'unknown event';
for (const id of hookIds) status.hooks[id] = 'not found';

const patches = hookIds.map((id) => ({ id, ...HOOKS[id] }));

/** The game's chunks load lazily, so what has been patched so far says nothing of what will be: the first report reads every
 *  chunk once, counts each hook's matches the way patchChunk does, and keeps the answer. */
let scanned = null;
async function health() {
  if (!scanned && patches.length) {
    scanned = (async () => {
      const dir = path.join(ASAR, 'dist', 'assets');
      const seen = Object.fromEntries(patches.map((p) => [p.id, []]));
      for (const file of (await fs.promises.readdir(dir)).filter((f) => f.endsWith('.js'))) {
        const text = await fs.promises.readFile(path.join(dir, file), 'utf8');
        for (const p of patches) {
          if (!text.includes(p.needle)) continue;
          const n = applyPatch(p, text).count;
          if (n) seen[p.id].push({ file, n });
        }
      }
      for (const p of patches) {
        const s = seen[p.id], total = s.reduce((a, b) => a + b.n, 0);
        status.hooks[p.id] = total === 1 ? `applied in ${s[0].file}` : total === 0 ? 'not found' : `skipped: ${total} matches`;
      }
    })().catch((e) => { status.errors.push(`hook scan failed: ${e.message}`); });
  }
  await scanned;
  for (const m of modules) {
    status.modules[m.dir].broken = status.modules[m.dir].events.filter((e) => {
      const ids = hookIds.filter((id) => eventOf(id) === e);
      return !ids.length || ids.some((id) => !HOOKS[id].optional && !String(status.hooks[id]).startsWith('applied'));   // an optional hook lost costs its extra, not the event
    });
  }
  return status;
}

const withBody = (res, body) => new Response(body, { status: res.status, headers: res.headers });

function patchChunk(file, text) {
  for (const p of patches) {
    const r = applyPatch(p, text);
    if (r.count === 0) continue;
    if (r.count > 1) { status.hooks[p.id] = `skipped: ${r.count} matches in ${file}`; continue; }
    text = r.text;
    status.hooks[p.id] = `applied in ${file}`;
  }
  return text;
}

const js = (body) => new Response(body, { headers: { 'Content-Type': 'text/javascript' } });

const wrap = (handler) => async (req) => {
  let url;
  if (!globalThis.__dfoLogged) { globalThis.__dfoLogged = true; log(`first dagger request ${req.url}`); }
  try { url = new URL(req.url); } catch { return handler(req); }
  if (url.host !== 'game') return handler(req);

  if (url.pathname === '/__dfo/status.json') return Response.json(await health());
  if (url.pathname === '/__dfo/modules.json') return Response.json(readModules());
  if (url.pathname === '/__dfo/core.js') {
    try { return js(fs.readFileSync(CORE_FILE)); } catch { return new Response('not found', { status: 404 }); }
  }
  const mod = /^\/__dfo\/m\/([a-z0-9][a-z0-9-]{0,63})\/([\w.-]+\.js)$/.exec(url.pathname);
  if (mod) {
    try { return js(fs.readFileSync(path.join(MODS_DIR, mod[1], mod[2]))); } catch { return new Response('not found', { status: 404 }); }
  }

  const res = await handler(req);
  if (!res.ok) return res;
  try {
    if (/^\/play\/?(index\.html)?$/.test(url.pathname)) {
      const tag = '<script src="/__dfo/core.js"></script>';
      const html = await res.text();
      return withBody(res, /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tag}</head>`) : tag + html);
    }
    if (patches.length && url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) {
      return withBody(res, patchChunk(path.basename(url.pathname), await res.text()));
    }
  } catch (e) {
    status.errors.push(`${url.pathname}: ${e.message}`);
  }
  return res;
};

const realHandle = protocol.handle;
protocol.handle = function handle(scheme, handler) {
  return realHandle.call(this, scheme, scheme === 'dagger' ? wrap(handler) : handler);
};
if (protocol.handle === realHandle) status.errors.push('could not wrap protocol.handle; mods are off');
log(`wrapped=${protocol.handle !== realHandle} modules=${modules.map((m) => m.dir).join(',')} hooks=${patches.map((p) => p.id).join(',')} errors=${status.errors.join(';')}`);
// the statuses are "not found" until the scan has read every chunk, so the record is written after the scan
health().then((s) => log(`hook scan ${JSON.stringify(s.hooks)} errors=${s.errors.join(';')} broken=${Object.entries(s.modules).map(([d, m]) => `${d}:${m.broken.join('/')}`).join(',')}`));
