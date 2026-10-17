// Self-check of the dev-review loader, run after a game update ("Check hooks.cmd" does this) and after any change to a module or the loader:
//   1. HOOKS: every hook in core/hooks.cjs matches exactly once in the installed game, and each patched chunk still parses;
//   2. MODULES: each module in the Mods folder is judged by the game's OWN Mod API (parseManifest, moduleCompatible), and the
//      events it listens to are checked against the hooks - a module is reported BROKEN on its own, the others unaffected;
//   3. INDEPENDENCE: every module run ALONE against the bus, and all together - no module needs another;
//   4. THE LOADER: serves the module list and files, one <script> tag, and patches only for the installed modules' events;
//   5. the waypoint's bearing maths agrees with the game's compass.
// Runs under the game's own Electron as Node (ELECTRON_RUN_AS_NODE), which can read inside app.asar without unpacking it.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const HOOKS = require('./core/hooks.cjs');
const { applyPatch } = require('./core/patch-core.cjs');

const game = path.resolve(process.argv[2] || process.env.DFO_GAME || path.join(__dirname, '..', '..', 'Daggerfall Online'));
const userData = process.env.DAGGER_USER_DATA || path.join(process.env.APPDATA || '', 'Daggerfall JavaScript');
const modsDir = process.argv[3] || path.join(userData, 'Mods');
const assets = path.join(game, 'resources', 'app.asar', 'dist', 'assets');
const version = JSON.parse(fs.readFileSync(path.join(game, 'resources', 'app.asar', 'package.json'), 'utf8')).version;
console.log(`DFO Online ${version}; modules in ${modsDir}`);

let failed = false;
const problems = [];   // every FAIL, for the report
const bad = (msg) => { failed = true; problems.push(msg); console.log(`FAIL ${msg}`); };
const nodeCheck = (file) => spawnSync(process.execPath, ['--check', file], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8' });

(async () => {
  const api = await import(pathToFileURL(path.join(__dirname, 'core', 'modapi.mjs')).href);   // the game's own Mod API (build-core.mjs)

  // ---- 1. hooks against the installed game ----
  const ids = Object.keys(HOOKS);
  const found = Object.fromEntries(ids.map((id) => [id, []]));
  const near = Object.fromEntries(ids.map((id) => [id, []]));   // the code around each needle, for the report (the first three)
  for (const file of fs.readdirSync(assets).filter((f) => f.endsWith('.js'))) {
    let text = fs.readFileSync(path.join(assets, file), 'utf8');
    let touched = false;
    for (const id of ids) {
      const at = text.indexOf(HOOKS[id].needle);
      if (at >= 0 && near[id].length < 3) near[id].push({ file, code: text.slice(Math.max(0, at - 160), at + 480) });
      const r = applyPatch({ id, ...HOOKS[id] }, text);
      if (r.count) found[id].push(`${file} x${r.count}`);
      if (r.count === 1) { text = r.text; touched = true; }
    }
    if (!touched) continue;
    const tmp = path.join(os.tmpdir(), `dfo-check-${file.replace(/\.js$/, '.mjs')}`);
    fs.writeFileSync(tmp, text);
    const parse = nodeCheck(tmp);
    fs.unlinkSync(tmp);
    if (parse.status !== 0) bad(`${file} no longer parses once patched:\n${parse.stderr}`);
  }
  const hookOk = {};
  for (const id of ids) {
    const one = found[id].length === 1 && found[id][0].endsWith(' x1');
    hookOk[id] = one || !!HOOKS[id].optional;   // an optional hook lost costs its extra, not the event
    console.log(`${one ? 'ok  ' : HOOKS[id].optional ? 'note' : 'FAIL'} hook ${id}${HOOKS[id].optional ? ' (optional)' : ''}: ${found[id].length ? found[id].join(', ') : 'no match'}`);
  }

  // ---- 2. the installed modules, judged by the game's own Mod API ----
  if (nodeCheck(path.join(__dirname, 'core', 'core.js')).status !== 0) bad('core/core.js does not parse'); else console.log('ok   core/core.js parses');
  const installed = fs.existsSync(modsDir) ? fs.readdirSync(modsDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];
  const mods = [];
  for (const dir of installed) {
    let raw = null;
    try { raw = JSON.parse(fs.readFileSync(path.join(modsDir, dir, 'module.json'), 'utf8')); } catch (e) { bad(`module ${dir}: module.json: ${e.message}`); continue; }
    const p = api.parseManifest(raw);
    if (!p.ok) { bad(`module ${dir} is refused by the Mod API: ${p.errors.join('; ')}`); continue; }
    const m = p.manifest;
    const compat = api.moduleCompatible(m);
    if (m.id !== dir) { bad(`module ${dir}: its id is '${m.id}'`); continue; }
    if (!compat.ok) { bad(`module ${dir}: ${compat.reason}`); continue; }
    const idsOf = (e) => ids.filter((id) => (HOOKS[id].event ?? id) === e);
    const noHook = m.events.filter((e) => !idsOf(e).length);
    const moved = m.events.filter((e) => idsOf(e).length && idsOf(e).some((id) => !hookOk[id]));
    if (noHook.length) console.log(`note module ${m.id}: events with no loader hook (${noHook.join(', ')}) - they would never be announced here`);
    if (moved.length) bad(`module ${m.id} is BROKEN by this game version (its events' hooks no longer match: ${moved.join(', ')}); the other modules are unaffected`);
    else console.log(`ok   module ${m.id} ${m.version}: api ${m.api}, events ${m.events.join(', ')} - all hooked`);
    const entry = path.join(modsDir, dir, m.entry);
    if (!fs.existsSync(entry)) { bad(`module ${m.id}: ${m.entry} is missing`); continue; }
    const asMjs = path.join(os.tmpdir(), `dfo-check-module-${m.id}.mjs`);   // a module is an ES module whatever its extension says
    fs.copyFileSync(entry, asMjs);
    const parsed = nodeCheck(asMjs);
    fs.unlinkSync(asMjs);
    if (parsed.status !== 0) { bad(`modules/${m.id}/${m.entry} does not parse:\n${parsed.stderr}`); continue; }
    mods.push({ m, entry });
  }
  if (!mods.length) console.log('note no modules installed (run Install.cmd in the top folder of the repo)');

  // ---- a page stood up just enough for a module's setup ----
  const store = new Map();
  const el = () => ({ style: {}, classList: { add() {}, remove() {} }, append() {}, replaceChildren() {}, querySelector: () => el(), set textContent(v) {}, set className(v) {} });
  Object.assign(globalThis, {
    document: { body: el(), head: el(), createElement: el }, innerWidth: 1920, innerHeight: 1080,
    requestAnimationFrame() {}, addEventListener() {},
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) },
  });
  const newBus = () => api.createModBus({ storage: globalThis.localStorage, say() {}, warn() {} });
  const load = async (x) => {   // a module is an ES module whatever its extension says: import a copy named .mjs
    const copy = path.join(os.tmpdir(), `dfo-check-load-${x.m.id}.mjs`);
    fs.copyFileSync(x.entry, copy);
    return await import(pathToFileURL(copy).href);
  };

  // ---- 3. independence: each module alone against the bus, then all together ----
  const EVENT_ARGS = { questMark: [null, null, 0], quests: [[]], mapPick: ['town', 10, -5, false], drawFx: [{ _camPos: [0, 1.6, 0] }] };
  for (const set of [...mods.map((x) => [x]), mods]) {
    if (!set.length) continue;
    const bus = newBus();
    for (const x of set) { const mod = await load(x); assert.strictEqual(typeof mod.default, 'function', `${x.m.id} exports setup`); await mod.default(bus.register(x.m)); }
    for (const ev of Object.keys(api.MOD_EVENTS)) bus.emit(ev, ...(EVENT_ARGS[ev] ?? []));   // an event the table does not know is still sent, with nothing
    const dead = bus.modules().filter((x) => x.failures);
    if (dead.length) bad(`modules failed on an event: ${dead.map((d) => d.id).join(', ')}`);
    else console.log(`ok   ${set.length === mods.length && mods.length > 1 ? 'all modules together' : `${set[0].m.id} alone`}: starts and answers every event`);
  }

  // ---- 4. the loader ----
  try {
    const Module = require('module');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dfo-root-'));
    fs.cpSync(path.join(__dirname, 'core'), path.join(root, 'core'), { recursive: true, filter: (p) => !/[\\/]src([\\/]|$)/.test(p) });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dfo-loader-'));
    fs.copyFileSync(path.join(__dirname, 'loader', 'main.cjs'), path.join(tmp, 'main.cjs'));
    fs.writeFileSync(path.join(tmp, 'mod-root.txt'), root);
    const fakeUser = fs.mkdtempSync(path.join(os.tmpdir(), 'dfo-user-'));
    const put = (id, manifest, js = 'export default function setup() {}') => {
      fs.mkdirSync(path.join(fakeUser, 'Mods', id), { recursive: true });
      fs.writeFileSync(path.join(fakeUser, 'Mods', id, 'module.json'), JSON.stringify(manifest));
      fs.writeFileSync(path.join(fakeUser, 'Mods', id, 'module.js'), js);
    };
    put('hears-draw', { id: 'hears-draw', name: 'A', version: '1.0.0', api: 1, events: ['drawFx'] });
    put('lost', { id: 'lost', name: 'B', version: '1.0.0', api: 1, events: ['noSuchEvent'] });
    process.env.DAGGER_USER_DATA = fakeUser;
    let wrapped = null;
    const fakeProtocol = { handle(scheme, h) { wrapped = h; } };
    const realLoad = Module._load;
    Module._load = function (request, ...rest) {
      if (request === 'electron') return { app: { getPath: () => fakeUser }, protocol: fakeProtocol };
      return realLoad.call(this, request, ...rest);
    };
    try { require(path.join(tmp, 'main.cjs')); } finally { Module._load = realLoad; }
    // then the game starts itself and registers its own dagger:// handler, through the loader's wrap
    fakeProtocol.handle('dagger', async (req) => new Response(/index\.html$|\/play\/$/.test(req.url) ? '<html><head></head></html>' : 'x'));
    const get = (p) => wrapped(new Request(`dagger://game${p}`));
    const list = await (await get('/__dfo/modules.json')).json();
    assert.deepStrictEqual(list.map((x) => x.dir), ['hears-draw', 'lost'], 'the installed modules are listed with their raw manifests');
    assert.strictEqual(list[0].manifest.events[0], 'drawFx');
    const status = await (await get('/__dfo/status.json')).json();
    assert.deepStrictEqual(Object.keys(status.hooks).sort(), ['drawFx', 'drawFx:known', 'drawFx:outdoors', 'noSuchEvent'], 'only the events the installed modules listen to are hooked (and their optional extras)');
    assert.ok(String(status.hooks.drawFx).startsWith('applied'), 'a hook an installed module wants is applied to the real game');
    assert.deepStrictEqual(status.modules['lost'].broken, ['noSuchEvent'], 'a module wanting an event with no hook is the one reported');
    assert.deepStrictEqual(status.modules['hears-draw'].broken, [], 'and the other is not');
    const html = await (await get('/play/index.html')).text();
    assert.strictEqual((html.match(/<script/g) || []).length, 1, 'ONE script tag - the core, which imports the modules');
    assert.ok(html.includes('/__dfo/core.js'));
    assert.strictEqual((await get('/__dfo/m/hears-draw/module.js')).status, 200, 'a module file is served');
    assert.strictEqual((await get('/__dfo/core.js')).status, 200);
    for (const p of ['/__dfo/m/hears-draw/..%2Fmodule.json', '/__dfo/m/..%2Fcore/core.js', '/__dfo/m/hears-draw/module.json']) {
      assert.strictEqual(await (await get(p)).text(), 'x', `a path out of a module reads nothing: ${p}`);
    }
    console.log('ok   the loader: lists and serves the installed modules, one script tag, hooks only for what they listen to, a lost hook reported against its own module');
  } catch (e) {
    bad(`the loader: ${e.message}`);
  }

  // ---- 5. the waypoint's maths, if it is installed ----
  const wp = mods.find((x) => x.m.id === 'waypoint');
  if (wp) {
    const { bearing, screenX } = await load(wp);
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    // heading 0 faces +z; +x is to the right (the game's yaw: 0 at +z, clockwise)
    assert(near(bearing(0, 10, 0, 0, 0), 0), 'ahead');
    assert(near(bearing(10, 0, 0, 0, 0), 90), 'right');
    assert(near(bearing(-10, 0, 0, 0, 0), -90), 'left');
    assert(near(Math.abs(bearing(0, -10, 0, 0, 0)), 180), 'behind');
    assert(near(bearing(10, 0, 0, 0, 0.25), 0), 'turned right to face +x');
    assert.strictEqual(screenX(0, 1920, 1080, 65), 960, 'ahead is centre');
    assert(screenX(10, 1920, 1080, 65) > 960, 'right of centre');
    assert.strictEqual(screenX(120, 1920, 1080, 65), null, 'behind is off screen');
    console.log('ok   waypoint bearing maths');
  }

  // ---- 6. the map's flag, if pins is installed: the real core.js host with the real pins module ----
  // The flag shows while the compass marks its place, hides while another is followed, and is gone once the place is reached
  // (it once stood on, stale, while another pin was followed).
  const pinsMod = mods.find((x) => x.m.id === 'pins');
  if (pinsMod) {
    try {
      const keyFns = [];
      globalThis.addEventListener = (type, fn) => { if (type === 'keydown') keyFns.push(fn); };
      const press = (code, shiftKey = false) => keyFns.forEach((fn) => fn({ code, shiftKey, repeat: false, ctrlKey: false, altKey: false, metaKey: false, target: null }));
      const pinsJson = JSON.parse(fs.readFileSync(path.join(modsDir, 'pins', 'module.json'), 'utf8'));   // as installed, with its sha256
      const pinsSource = fs.readFileSync(pinsMod.entry, 'utf8');
      globalThis.fetch = async () => ({ ok: true, json: async () => [{ dir: 'pins', manifest: pinsJson }], text: async () => pinsSource });
      globalThis.__dfoLoad = () => load(pinsMod);
      const coreSrc = fs.readFileSync(path.join(__dirname, 'core', 'core.js'), 'utf8');
      const seam = /import\(\s*(?:\/\*[^*]*\*\/\s*)?urls\.get\(source\)\s*\)/;   // the page imports a module by its URL; here, the copy load() makes
      if (!seam.test(coreSrc)) throw new Error('core.js no longer imports modules by urls.get(source) - update this check');
      const coreCopy = path.join(os.tmpdir(), 'dfo-check-core.cjs');
      fs.writeFileSync(coreCopy, coreSrc.replace(seam, 'globalThis.__dfoLoad()'));
      require(coreCopy);
      for (let i = 0; i < 100 && globalThis.dfoMods.report()[0]?.state !== 'running'; i++) await new Promise((r) => setTimeout(r, 10));
      assert.strictEqual(globalThis.dfoMods.report()[0]?.state, 'running', `pins starts on the game's own host, its sha256 checked: ${JSON.stringify(globalThis.dfoMods.report())}`);
      const { dfo } = globalThis;
      const sheet = { id: 'town', dest: null, destinationAt: () => ({ x: 1, y: 1, dx: 10, dz: 0, quest: false }), destinationNear: () => false, setDestination(d) { this.dest = d; }, destinationPaper: () => null };
      const win = { _phase: 'map', _top: null, _info: null, _sheet: sheet, _paperPoint: () => [5, 5], _onSheet: () => true };
      const at = (x, z) => dfo.emit('questMark', null, [x, z], 0);   // the HUD's heartbeat: where the player stands
      const paint = () => { dfo.paintDest(win, sheet, null, { view: null }); return !!sheet.dest; };
      at(0, 0);
      dfo.emit('drawFx', { _camPos: [0, 1.6, 0], _view: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] });
      assert.ok(dfo.mapContext(win, 0, 0), 'a right click sets a destination');
      assert.ok(paint(), 'the flag shows while its place is followed');
      at(0, 0); press('F1');   // a pin 25 m ahead, followed
      assert.ok(!paint(), 'the flag hides while a pin is followed');
      at(0, 0); press('F3');   // the quest
      assert.ok(!paint(), 'the flag hides while the quest is followed');
      at(0, 0); press('F3');   // the destination again
      assert.ok(paint(), 'the flag comes back when its place is followed again');
      at(10, 0);   // reached: pins goes on to the pin
      assert.deepStrictEqual(dfo.retarget(null), [0, -25], 'the pin is followed after the arrival');
      assert.ok(!paint(), 'the flag is gone once its place is reached, though a pin is still followed');
      at(10, 0); press('F3'); at(10, 0); press('F3');   // round the cycle: the destination is not in it any more
      assert.ok(!paint(), 'the flag stays gone');
      console.log('ok   the map flag follows its place (pins on the core)');
      // the player's own key: pins' "Drop a pin" given P (as the keys panel keeps it) answers at once, and F1 no longer does
      globalThis.localStorage.setItem('dfjs-module-keys', JSON.stringify({ pins: { F1: 'KeyP' } }));
      dfo.emit('drawFx', { _camPos: [5, 1.6, 0], _view: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] });
      at(10, 0); press('F1');
      assert.notDeepStrictEqual(dfo.retarget(null), [5, -25], 'F1 drops nothing once the player moved it');
      at(10, 0); press('KeyP');
      assert.deepStrictEqual(dfo.retarget(null), [5, -25], 'P drops the pin, and it is followed');
      console.log('ok   a module key the player changed answers on the new key (pins on the core)');
    } catch (e) {
      bad(`the map flag: ${e.message}`);
    }
  }

  // The report an update needs: what failed, and the code each missing hook's needle sits in (to write its new pattern from).
  const writeReport = (file) => {
    const broken = ids.filter((id) => !hookOk[id]);
    const lines = [
      `# Loader report: DFO Online ${version}`, '',
      `Checked ${new Date().toISOString().slice(0, 10)} against \`${game}\`. ${failed ? `**${problems.length + broken.length} problem(s).**` : 'All checks passed.'}`, '',
      '## Hooks that need a new pattern', '',
    ];
    if (!broken.length) lines.push('None.', '');
    for (const id of broken) {
      const h = HOOKS[id];
      lines.push(`### \`${id}\` (event \`${h.event ?? id}\`)`, '',
        `- needle: \`${h.needle}\``, `- matches now: ${found[id].length ? found[id].join(', ') : 'none'}`,
        `- pattern: \`${h.find}\``, '');
      if (!near[id].length) lines.push('The needle is in no chunk: the code moved or was renamed. Search the chunks for the behaviour instead.', '');
      for (const n of near[id]) lines.push(`Code around the needle in \`${n.file}\`:`, '', '```js', n.code, '```', '');
    }
    const notes = ids.filter((id) => HOOKS[id].optional && !found[id].length);
    lines.push('## Optional hooks not found (their extra is off, no module is turned off)', '', notes.length ? notes.map((id) => `- \`${id}\``).join('\n') : 'None.', '');
    lines.push('## Other problems', '', problems.length ? problems.map((p) => `- ${p.split('\n')[0]}`).join('\n') : 'None.', '');
    fs.writeFileSync(file, lines.join('\n'));
    console.log(`report written to ${file}`);
  };
  if (process.env.DFO_REPORT) writeReport(process.env.DFO_REPORT);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log(`FAIL ${e && e.stack || e}`); process.exit(1); });
