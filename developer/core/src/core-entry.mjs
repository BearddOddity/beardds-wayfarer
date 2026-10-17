// BEARDD'S WAYFARER - THE DEV-REVIEW LOADER'S PAGE HOST: the Mod API's host for the released game.
//
// The game's own module system (daggerfall-js-source: src/mods/, the Mod API) is not in the released client yet. This is the
// same host, run from the loader: it speaks the SAME interface - the same manifest, the same events, the same handle - so a
// module folder written for the Mod API runs here, unchanged, and runs natively once the game ships the API. Nothing in a
// module knows which host it is on.
//
// The loader puts one-line hooks into the game's code (core/hooks.cjs); each announces an event on `globalThis.dfo.emit`.
// This file builds the bus and hands the game's OWN module host (src/mods/moduleHost.js startModules) the installed modules,
// read from the loader (`/__dfo/modules.json` and each entry's source): the same judging, the same sha256 check, the same
// report. The player's switches are the game's own record (`dfjs-modules-off`, in the game's file store), so the in-game
// Modules card and `dfoMods.disable()` are one switch. The player's keys for module actions are the game's own panel too
// (Shift+F1, src/mods/keysPanel.js), kept in the same store.
import { createModBus, MOD_API_VERSION } from '@game/src/mods/modApi.js';
import { startModules, modulesOff, setModuleOff } from '@game/src/mods/moduleHost.js';
import { installModuleKeys } from '@game/src/mods/keysPanel.js';

/** The game's own file store when the app offers one (it does), else the page's. */
const storage = () => globalThis.daggerShell?.storage ?? globalThis.localStorage ?? null;
const read = (k) => { try { return storage()?.getItem(k) ?? null; } catch { return null; } };
const write = (k, v) => { try { storage()?.setItem(k, v); } catch { /* not kept */ } };

function toast(text) {
  if (!document.body) return;
  let el = toast.el;
  if (!el) {
    el = toast.el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:2147483000;pointer-events:none;'
      + 'font:16px/1.3 "Pixelify Sans",Georgia,serif;color:#f2e6c4;text-shadow:0 0 3px #000,0 1px 2px #000;padding:6px 12px;'
      + 'background:rgba(10,12,17,0.6);border-left:3px solid #c9962c';
    document.body.append(el);
  }
  el.textContent = text; el.style.display = '';
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.style.display = 'none'; }, 1800);
}

const bus = createModBus({
  storage: { getItem: read, setItem: write },
  say: toast,
});
// the game's own keys panel (src/mods/keysPanel.js): every key press to the bus, Shift+F1 the panel - in English, as the
// released game has no text core for a module's words (the game's own bus hands the same panel its translations)
installModuleKeys(bus, {
  words: {
    title: () => 'Module keys',
    help: () => 'Choose an action, then press its new key. Escape cancels; Backspace puts its first key back.',
    done: () => 'Done',
    none: () => 'No module has a key.',
    press: () => 'Press a key...',
    key: () => 'Key',
    pressFor: (what) => `Press the new key for ${what}.`,
    reserved: (key) => `${key} is kept for the menus. Choose another key.`,
    taken: (name, label) => `Not changed: ${name} has that key (${label}).`,
    refused: () => 'Not changed: that key could not be kept.',
    gameKey: () => 'the game may use this key too',
  },
});

// What the game's hooks call. A hook asks nothing of a module: the bus hands each event to whoever listed it.
// The modules' read-only look at the solid world, over the shared magic engine's collider: the same two questions the game's own
// Mod API answers (floor(x, y, z), ray(origin, dir, max)), made once per collider.
const probes = new WeakMap();
// the dungeon's automap record, handed over by the optional hook drawFx:known when the dungeon is entered (the last entered wins);
// known() copies its walked trail and the one-way steps taken (its teleporters, its drops), again only as they grow - the game
// source's own probe, systems/automap.js automapWaySteps
let recOf = null, _known = null;
function knownCopy() {
  let rec = null;
  try { rec = recOf?.() ?? null; } catch { rec = null; }
  if (!rec?.trail) return null;
  const steps = [];
  for (const t of rec.teleporters?.values?.() ?? []) if (t?.entrance?.pos && t?.exit?.pos) steps.push([...t.entrance.pos, ...t.exit.pos]);
  for (const d of rec.drops?.values?.() ?? []) if (d?.length >= 6) steps.push([d[0], d[1], d[2], d[3], d[4], d[5]]);
  if (!_known || _known.src !== rec.trail || _known.n !== rec.trail.size || _known.s !== steps.length) {
    _known = { src: rec.trail, n: rec.trail.size, s: steps.length, out: Object.freeze({ walked: Object.freeze([...rec.trail]), steps: Object.freeze(steps.map((s) => Object.freeze(s))) }) };
  }
  return _known.out;
}
// THE OPEN WORLD, handed over by the optional hook drawFx:outdoors: the region map's followed waypoints in its frame (the game
// source's own probe, scenes/world.js `waypoints`; null indoors and underground), and the terrain's height (the source's collider
// `heightAt`; NaN off the open world) for a collider that has none
let waysOf = null, terrainOf = null;
// THE MODE (the optional hook drawFx:outdoors reads the game's mode each frame and hands it over): a dungeon hides the game's quest mark
// (the compass and every module's quest guidance) - a place the player has explored and pinned on the dungeon map is the only mark there
let dungeonNow = false;
const modeSeen = (m) => { dungeonNow = m === 'dungeon'; };
// THE GUIDANCE TIER (the game's Features row 'quest-guidance', stored in the shell's UI prefs): Journal and Town mark no quest in a
// dungeon; Exact marks the quest's items, people and foes there (the game's own dungeonQuestMarks), and the game sends them to the compass.
let tierCache = { at: -1e9, tier: 'journal' };
function guidanceTier() {
  const now = performance.now();
  if (now - tierCache.at < 1000) return tierCache.tier;
  let tier = 'journal';
  try {
    const raw = globalThis.daggerShell?.storage?.getItem?.('dagger.ui.v1') ?? globalThis.localStorage?.getItem?.('dagger.ui.v1') ?? null;
    const v = raw ? JSON.parse(raw)?.questGuidance : null;
    if (v === 'town' || v === 'exact') tier = v;
  } catch { tier = 'journal'; }
  tierCache = { at: now, tier };
  return tier;
}
/** Is the quest hidden here: in a dungeon, unless the guidance is Exact. */
const questHidden = () => dungeonNow && guidanceTier() !== 'exact';
/** The mark the compass and the modules see: a module's place if one is asked for, else the game's quest - none where it is hidden. */
const questFor = (quest) => bus.retarget(null) ?? (questHidden() ? null : quest);
/** The dungeon's notes (the pins the player dropped on its map), as the game keeps them: [{x, z, y}] in the frame the player walks in. */
function dungeonNotes() {
  if (!dungeonNow) return [];
  let rec = null;
  try { rec = recOf?.() ?? null; } catch { rec = null; }
  const out = [];
  for (const n of rec?.notes?.values?.() ?? []) {
    const p = n?.position;
    if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])) out.push({ x: p[0], z: p[2], y: p[1] });
  }
  return out;
}
function world(collider) {
  if (!collider || typeof collider.raycast !== 'function') return undefined;
  let p = probes.get(collider);
  if (!p) {
    p = Object.freeze({
      floor(x, y, z) {
        const d = collider.raycast([x, y + 1.2, z], [0, -1, 0], 4);
        let f = Number.isFinite(d) ? y + 1.2 - d : null;
        let t = collider.heightAt?.(x, z);
        if (t === undefined) { try { t = terrainOf?.(x, z); } catch { t = undefined; } }
        if (Number.isFinite(t) && t <= y + 1.2 && (f === null || t > f)) f = t;
        // the released game's magic engine is handed a collider that answers rays alone, and its rays miss the terrain: where
        // nothing is under the spot and there is no terrain to ask, the ground is taken as level with the height asked from
        if (f === null && typeof collider.heightAt !== 'function' && !Number.isFinite(t)) f = y;
        return f;
      },
      ray(o, dir, max) { const d = collider.raycast(o, dir, max); return Number.isFinite(d) ? d : null; },
      known() { return knownCopy(); },
      inDungeon() { return dungeonNow; },
      questHidden() { return questHidden(); },
      notes() { return dungeonNotes(); },
      waypoints() { try { return waysOf?.() ?? null; } catch { return null; } },
    });
    probes.set(collider, p);
  }
  return p;
}
// ---- THE LOCAL MAP'S DESTINATION (event mapPick) ----
// The released game's map sheets are handed these methods by the loader's mapPick patches (core/hooks.cjs), over the sheet's own
// closures; they are the game source's own destinationAt / setDestination / destinationNear (ui/townSheet.js, ui/automapSheet.js),
// and mapContext / paintDest are its heldMap.js _destinationContext and the flag in its paint.
const WORLD_PER_PX = (4096 * 0.025) / 64;   // ui/nameplateLayout.js: RMB_DIMENSION * 0.025 / NAMEPLATE_BLOCK_PX - a town pixel in metres
const TOWN_MARK_REACH = 12;                // ui/townMapMarks.js: a quest ring this near the click (paper px) is the click
const toMap = (v, px, py) => [v.ox + px / v.scale, v.oy + py / v.scale];      // ui/inkMap.js toMap
const toPaper = (v, x, y) => [(x - v.ox) * v.scale, (y - v.oy) * v.scale];     // ui/inkMap.js toPaper
const nearFlag = (p, px, py) => !!p && Math.abs(px - p[0]) <= 14 && py <= p[1] + 6 && py >= p[1] - 28;

/** The street plan's: g = { view(), player() (sheet space), field() ({w, h}), quests() (rings, sheet space) }. */
function townDest(g) {
  let dest = null;
  return {
    destinationAt(px, py) {
      const v = g.view(), p = g.player(), f = g.field();
      if (!v || !p || !f || !(f.w > 1)) return null;
      let [x, y] = toMap(v, px, py);
      if (!(x >= 0 && y >= 0 && x < f.w && y < f.h)) return null;
      let quest = false;
      for (const q of g.quests() ?? []) {
        const [qx, qy] = toPaper(v, q.x, q.y);
        if ((qx - px) ** 2 + (qy - py) ** 2 <= TOWN_MARK_REACH * TOWN_MARK_REACH) { x = q.x; y = q.y; quest = true; break; }
      }
      return { x, y, dx: (x - p.x) * WORLD_PER_PX, dz: -(y - p.y) * WORLD_PER_PX, quest };
    },
    setDestination(d) { dest = d ? { x: d.x, y: d.y } : null; },
    destinationNear(px, py) { const v = g.view(); return !!(dest && v) && nearFlag(toPaper(v, dest.x, dest.y), px, py); },
    destinationPaper(view) { return dest ? toPaper(view, dest.x, dest.y) : null; },
  };
}

/** A dungeon's flat plan (plan units are metres): g = { view(), solid(), player() ({x, z} on this floor, or null), entrance() (the
 *  way out's mark, {x, z}, once found, or null) }. A click on the way out's mark is the exit, as the game source's own. */
function planDest(g) {
  let dest = null;
  return {
    destinationAt(px, py, solidPl = null) {
      const v = g.view(), p = g.player();
      if (!v || !p) return null;
      if (g.solid() && !solidPl) return null;   // the solid map: the plan point under the click, from the sheet (mapContext)
      let [x, z] = g.solid() ? solidPl : toMap(v, px, py);
      const ent = g.solid() ? null : (g.entrance?.() ?? null);
      const ep = ent ? toPaper(v, ent.x, ent.z) : null;
      const exit = !!ep && (ep[0] - px) ** 2 + (ep[1] - py) ** 2 <= TOWN_MARK_REACH * TOWN_MARK_REACH;
      if (exit) { x = ent.x; z = ent.z; }
      return { x, z, dx: x - p.x, dz: -(z - p.z), quest: false, exit };
    },
    setDestination(d) { dest = d ? { x: d.x, z: d.z, y: d.y } : null; },
    destinationNear(px, py) { const v = g.view(); return !!(dest && v && !g.solid()) && nearFlag(toPaper(v, dest.x, dest.z), px, py); },
    destinationPaper(view) { return dest && !g.solid() ? toPaper(view, dest.x, dest.z) : null; },
  };
}

// The flag stands for the place the compass marks: destAt is what the modules marked as the pick was heard. It shows while the
// compass marks that place, hides while another place (or the quest) is followed, and stays gone once the place is (an arrival,
// a removal) - a module's place is never at the very spot again.
let destSheet = null, destD = null, destAt = null, destShown = false;
const samePlace = (a, b) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;
/** The map window's right press the sheet did not take: set the destination, or take it away on its flag. */
/** A dungeon's ALL-floors view: the height a plan point lies at for a paper point to be where the player clicked (the sheet's own
 *  paperAt, read at two heights), so the flag stands on the floor clicked, not on the floor under the view's ground. */
function heightAt(sheet, x, z, pp) {
  const a = sheet.paperAt(x, z, 0), b = sheet.paperAt(x, z, 1);
  if (!a || !b) return null;
  const vy = b[1] - a[1];
  return Math.abs(vy) > 1e-6 ? (pp[1] - a[1]) / vy : null;
}
/** Is this paper point on the flag: in the solid view the flag stands at its own height; flat, the sheet's own test. */
function flagNear(sheet, pp) {
  if (!destD || destSheet !== sheet || !sheet.solid || !Number.isFinite(destD.y)) return sheet.destinationNear(pp[0], pp[1]);
  const f = sheet.paperAt(destD.x, destD.z, destD.y);
  return !!f && Math.abs(pp[0] - f[0]) <= 14 && pp[1] <= f[1] + 6 && pp[1] >= f[1] - 28;
}

function mapContext(win, clientX, clientY) {
  const sheet = win?._sheet;
  if (!sheet || win._phase !== 'map' || win._top || win._info || typeof sheet.destinationAt !== 'function' || !bus.has('mapPick')) return false;
  const pp = win._paperPoint(clientX, clientY);
  if (!pp || !win._onSheet(pp)) return false;
  if (flagNear(sheet, pp)) {
    sheet.setDestination(null); destSheet = destD = destAt = null; destShown = false; win._dirty = true;
    bus.emit('mapPick', sheet.id, null, null, false);
    return true;
  }
  const solidPl = sheet.solid ? sheet.planAt?.(pp[0], pp[1]) ?? null : null;
  const d = sheet.destinationAt(pp[0], pp[1], solidPl);
  if (!d) return false;
  if (sheet.solid && typeof sheet.paperAt === 'function') d.y = heightAt(sheet, d.x, d.z, pp);
  destSheet?.setDestination?.(null);
  sheet.setDestination(d); destSheet = sheet; destD = d; destShown = true; win._dirty = true;
  bus.emit('mapPick', sheet.id, d.dx, d.dz, !!d.quest, !!d.exit);
  destAt = bus.retarget(null);   // the place a module took the pick as (null: none did)
  return true;
}

/** The dungeon map's own pin (the released game's mark(), core/hooks.cjs mapPick:note): a new note named is a place to follow - its
 *  offset from the player, and the exit when it stands within 4 m of the way out (once found), as the game source's own; its name
 *  cleared takes it away. */
let pinnedNote = null;
function notePin(id, pos, feet, startMarker) {
  if (!bus.has('mapPick')) return;
  if (!pos) { if (id === pinnedNote) { pinnedNote = null; bus.emit('mapPick', 'automap', null, null, false); } return; }
  if (!feet) return;
  const exit = !!startMarker && Math.hypot(pos[0] - startMarker.x, pos[2] - startMarker.z) <= 4;
  pinnedNote = id;
  bus.emit('mapPick', 'automap', pos[0] - feet[0], pos[2] - feet[2], false, exit, pos[1] - feet[1]);
}

/** THE QUEST LENS'S PERSON (the released game's entryTarget, core/hooks.cjs questMark:person): the place of the LAST person an
 *  entry says the building or town of, and what it said of it in a Place's terms - the game source's own personSiteOf
 *  (ui/questLens.js): a Person's `__` is its building, `___` its town, `____` its region; the questor never, nor a person the
 *  quest is done with (dealtWith). */
function personSite(message, resourcesOf, saidOf, M) {
  let out = null;
  for (const r of resourcesOf(message) ?? []) {
    if (!r?.isPerson || r.isQuestor || /^questor$/i.test(r.careerAllianceName ?? '') || dealtWith(r)) continue;
    const p = r.getDialogPlace?.() ?? null;
    if (!p?.siteDetails?.locationName) continue;
    const own = saidOf(message, r.symbol?.name);
    if (!own.has(M.NameMacro2) && !own.has(M.NameMacro3)) continue;
    const said = new Set();
    if (own.has(M.NameMacro2)) said.add(M.NameMacro1);
    if (own.has(M.NameMacro3)) said.add(M.NameMacro2);
    if (own.has(M.NameMacro4)) said.add(M.NameMacro4);
    out = { place: p, said };
  }
  return out;
}

/** A PERSON DEALT WITH (the released game's dungeonQuestMarks, core/hooks.cjs questMark:dealt): one the quest's clicks wait on, all
 *  of whose tasks have fired - the game source's own personDealtWith (systems/questGuidance.js). */
function dealtWith(res) {
  const name = res?.isPerson ? res.symbol?.name : null;
  if (!name || !res.parentQuest?.tasks) return false;
  let waited = false;
  for (const t of res.parentQuest.tasks.values()) {
    for (const a of t.actions ?? []) {
      if (!a?.isTriggerCondition || a.npcSymbol?.name !== name) continue;
      if (!t.triggered && !t.dropped) return false;
      waited = true;
    }
  }
  return waited;
}

/** The compass's mark (the released game's drawQuestMark, core/hooks.cjs questMark) in the colour a module asked with
 *  dfo.markColour, else the game's own - the game source's enhancedHud. */
function tint(node) {
  if (!node) return;
  const c = bus.markColour() ?? '';
  if (node.dataset.dfoTint === c) return;
  if (node.dataset.dfoBase === undefined) node.dataset.dfoBase = node.style.borderColor;
  node.dataset.dfoTint = c;
  node.style.borderColor = c || node.dataset.dfoBase;
}

/** The flag, over the sheet's own overlay - shown while the compass marks its place. */
function paintDest(win, sheet, ctx, env) {
  if (destSheet) {
    const on = samePlace(bus.retarget(null), destAt);
    if (on !== destShown) { destShown = on; destSheet.setDestination?.(on ? destD : null); }
  }
  const p = sheet !== destSheet ? null : sheet.solid && Number.isFinite(destD?.y) && typeof sheet.paperAt === 'function' ? sheet.paperAt(destD.x, destD.z, destD.y) : sheet.destinationPaper?.(env.view);
  if (!p) return;
  const [x, y] = p;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.ellipse?.(x, y, 7, 3.5, 0, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2cf4a'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 19); ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.stroke(); ctx.lineWidth = 1.6; ctx.strokeStyle = '#e9e4d9'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 19); ctx.lineTo(x + 13, y - 15); ctx.lineTo(x + 8, y - 12); ctx.lineTo(x + 13, y - 10); ctx.lineTo(x, y - 10); ctx.closePath();
  ctx.fillStyle = '#f2cf4a'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.stroke();
  ctx.restore();
}

/** A dungeon note goes onto the floor the player has walked: the centre of the nearest walked cell, at that cell's height (the
 *  trail's own cells, `x,y,z` keys of TRAIL_CELL 1 m). A note on empty paper, off every cell, is drawn off the dungeon; this keeps
 *  it on a cell. Changes the note's position in place (the game's record keeps it). With no walked cell, nothing changes. */
function snapNote(note) {
  const pos = note?.position;
  if (!Array.isArray(pos) || !Number.isFinite(pos[0]) || !Number.isFinite(pos[1]) || !Number.isFinite(pos[2])) return;
  const cells = [];
  for (const k of knownCopy()?.walked ?? []) {
    const [a, b, c] = String(k).split(',').map(Number);
    if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) cells.push([a, b, c]);
  }
  if (!cells.length) return;
  // THE FLOOR FIRST: the walked level nearest the height clicked. A level more than a storey (5 m) away is no floor the click was on:
  // the note stays where it was put, rather than move to another floor.
  let level = null, bd = Infinity;
  for (const c of cells) { const d = Math.abs(c[1] - pos[1]); if (d < bd) { bd = d; level = c[1]; } }
  if (level === null || bd > 5) return;
  // then the nearest walked cell on that floor, its centre at the cell's own height
  let best = null, bdd = Infinity;
  for (const c of cells) {
    if (Math.abs(c[1] - level) > 0.5) continue;
    const d = Math.hypot(c[0] + 0.5 - pos[0], c[2] + 0.5 - pos[2]);
    if (d < bdd) { bdd = d; best = c; }
  }
  if (best) { pos[0] = best[0] + 0.5; pos[1] = best[1]; pos[2] = best[2] + 0.5; }
}

globalThis.dfo = { snapNote, emit: (event, ...args) => { if (bus.has(event)) bus.emit(event, ...args); }, world, retarget: (q) => bus.retarget(q), questFor, modeSeen, townDest, planDest, mapContext, paintDest, notePin, knownRec: (fn) => { recOf = fn; }, bayWays: (fn) => { waysOf = fn; }, terrain: (fn) => { terrainOf = fn; }, personSite, dealtWith, tint, api: MOD_API_VERSION };

let report = [];
/** The loader is the shell the game's host asks: it lists the module folders and hands over each entry's source, fetched
 *  first (the host reads it at once). A module is then imported by its own URL, as the page's other files are. */
async function start() {
  let found = [];
  try { found = await (await fetch('/__dfo/modules.json')).json(); } catch { /* no loader door: nothing to start */ }
  const sources = new Map(), urls = new Map();
  await Promise.all(found.map(async (f) => {
    const entry = typeof f.manifest?.entry === 'string' ? f.manifest.entry : 'module.js';
    const url = `/__dfo/m/${f.dir}/${entry}`;
    try {
      const r = await fetch(url);
      if (!r.ok) return;
      const text = await r.text();
      sources.set(`${f.dir}/${entry}`, text); urls.set(text, url);
    } catch { /* unread: the host reports it */ }
  }));
  const shell = { modules: { list: () => found, source: (dir, file) => sources.get(`${dir}/${file}`) ?? null } };
  report = await startModules({ shell, bus, storage: storage(), importModule: (source) => import(/* @vite-ignore */ urls.get(source)) });
}
start();

const status = () => fetch('/__dfo/status.json').then((r) => r.json()).then((s) => ({ ...s, startup: report, bus: bus.modules() }));
globalThis.dfoMods = {
  api: MOD_API_VERSION,
  report: () => report.map((r) => ({ ...r })),
  modules: () => bus.modules(),
  status,
  /** Switch a module off or on: the game's own record, so the in-game card and this are one switch. A running one is switched now; one that was off at the start needs a restart. */
  disable(id) { setModuleOff(storage(), id, true); bus.setEnabled(id, false); return modulesOff(storage()); },
  enable(id) { setModuleOff(storage(), id, false); bus.setEnabled(id, true); return modulesOff(storage()); },
};

// A hook the loader could not place (a game update moved the code) names the modules that wanted it, once.
addEventListener('load', () => {
  setTimeout(() => {
    status().then((s) => {
      const lost = Object.entries(s.hooks ?? {}).filter(([, v]) => !String(v).startsWith('applied')).map(([k]) => k);
      if (lost.length) { console.warn('[wayfarer] a game update moved:', lost.join(', '), s); toast(`Beardd's Wayfarer loader: needs an update - ${lost.join(', ')}`); }
    }).catch(() => { /* status is a nicety */ });
  }, 15000);
});
