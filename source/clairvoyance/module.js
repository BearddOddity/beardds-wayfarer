// MODULE: CLAIRVOYANCE.
//
// Inspired by the Clairvoyance spell of The Elder Scrolls (Skyrim wiki). A REAL SPELL of the game's own magic: an effect
// ("Clairvoyance", type 47, with a duration) that the loader adds to the game's spell system (dev-review/core/hooks.cjs, the
// 'drawFx:spell*' hooks). The module gives the player the spell once, on first load (as the game's vampirism and lycanthropy give
// theirs), and checks it every load. Casting it changes WHEN the Wayfarer's path shows; the map marking is unchanged - the
// places still come from the quest, the pins, the town, dungeon and region maps, as always.
//
// THE SETTINGS, on the spell's page in the spellbook (there are no keys for them):
//   when the waypoint and the guide trail show - ALWAYS (the default; everything as it was), ONLY WHILE IT LASTS (role-play: the path
//   shows while the Clairvoyance effect lasts), or CAST TO TURN ON (a cast turns the path on, and a second cast turns it off);
//   which of the three maps a plain cast follows - AUTOMATIC (the default: the map the player is in) or the town and city's, the region's, the dungeon's;
//   the waypoint, the guide trail, the compass's diamond and the login reminder, each on or off; and the colours.
// If the spell cannot be cast (the game build lacks it, or it is not in the spellbook) the path is never hidden, and the keys of
// the waypoint, trail and notice modules are registered as before: a lost spell never costs the player the path or the controls.
//
// THE CAST. A new cast swaps the compass to the mark of one of the three maps, and the line over the compass says which registered.
// The marks are the pins module's (the town and city's street plan, the region map's waypoints, the dungeon's exit and pins), set
// as always. Shift+1 casts for the town and city's map, Shift+2 the region's, Shift+3 the dungeon's (top row or number pad).
//
// THE VERIFY, each load: the spell is in the spellbook and the game can cast it. The result goes to `globalThis.dfoWayfarerStatus`
// ({ ready, reason }), which the notice module shows on its line.
//
// Hears `questMark` (the HUD's heartbeat) and `drawFx` (the spell hooks ride on this event). The three direct casts work only while
// the HUD is up. Settings: this module's own store (`mode`, `follows`, `compass`).
const TAG = 'wayfarer';             // the spell's tag in the spellbook (as the game's `vampire`)
const SPELL_NAME = 'Clairvoyance';
const PACK = "Beardd's Spells";    // the pack this spell belongs to (more may follow)
const LORE = 'An old trick of the Illusion school, taught to apprentices who kept losing their way. The caster\'s sight runs ahead of the body and lays a thread of pale light along the road to the place they seek. It shows the way, not the dangers on it.';
const WHAT = 'While it lasts, a thread of light is drawn along the road to the place you seek, as your map has marked it.';
const ICON_INDEX = 200;            // the icon number the loader hands to this module's sprite: the game's own icons are 0 to 68, and it only accepts 0 to 255
const ICON_PLAIN = 21;             // the game's own icon the spell wears when the loader's icon hooks are not in
const ICON_RGBA_B64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZgzf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmYM3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANby//8AAAAAAAAAAAAAAAAAAAAASp72/wAAAAAAAAAAAAAAAAAAAAAAAAAAJmDN/wAAAAAAAAAAAAAAAAAAAAAAAAAAJmDN/wAAAAAAAAAAJmDN/0qe9v8AAAAAJmDN/wAAAAAAAAAAJmDN/9by//8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABKnvb/jND//yZgzf+M0P//jND//yZgzf+M0P//Sp72/wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACM0P//jND//4zQ//9Knvb/jND//4zQ//9Knvb/jND//4zQ//+M0P//AAAAAAAAAAAAAAAAAAAAAAAAAACM0P//JmDN/yZgzf9Knvb/jND//9by///W8v//jND//0qe9v8mYM3/JmDN/4zQ//8AAAAAAAAAAAAAAAAAAAAAjND//wAAAAAAAAAAjND//9by/////////////9by//+M0P//AAAAAAAAAACM0P//AAAAAAAAAAAmYM3/JmDN/0qe9v9Knvb/jND//4zQ///W8v/////////////W8v//jND//4zQ//9Knvb/Sp72/yZgzf8mYM3/AAAAAAAAAABKnvb/JmDN/yZgzf9Knvb/jND//9by///W8v//jND//0qe9v8mYM3/JmDN/0qe9v8AAAAAAAAAAAAAAAAAAAAAAAAAAEqe9v9Knvb/jND//0qe9v+M0P//jND//0qe9v+M0P//Sp72/0qe9v8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASp72/0qe9v8mYM3/Sp72/4zQ//8mYM3/Sp72/0qe9v8AAAAAAAAAAAAAAAAAAAAAAAAAANby//8AAAAAJmDN/wAAAAAAAAAAJmDN/wAAAABKnvb/JmDN/wAAAAAAAAAAJmDN/wAAAAAAAAAAAAAAAAAAAAAAAAAAJmDN/wAAAAAAAAAAAAAAAAAAAAAAAAAASp72/wAAAAAAAAAAAAAAAAAAAADW8v//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACZgzf8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAmYM3/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';   // the 16 x 16 sprite, RGBA bytes (tools/make-clairvoyance-icon.mjs draws it)
const HUD_LIVE_MS = 400;           // as the other modules: the HUD draws every frame while the game is played
const TICK_MS = 500;               // how often the module checks the spell
const GIVE_UP_TICKS = 120;         // a "no" is final once the HUD has been up this many ticks (a minute)
const SUSTAIN_ROUNDS = 1e7;        // 'cast to turn on': the effect is kept lasting
const MODES = ['always', 'spell', 'toggle'];
const MAPS = ['town', 'region', 'dungeon'];                 // the three maps whose marks the spell can follow; 1, 2, 3 on the direct casts
const FOLLOWS = ['auto', ...MAPS];                           // what a plain cast follows: where the player stands, or one of the maps
const CAST_PENDING_MS = 4000;                                // a direct cast waits this long for the game to begin the effect
const DIGIT_KEYS = ['Shift+Digit1', 'Shift+Digit2', 'Shift+Digit3'];
const PAD_KEYS = ['Shift+Numpad1', 'Shift+Numpad2', 'Shift+Numpad3'];

/** Whether the spell has just been cast: a new effect, a refreshed one (its rounds went up), or a sustained one cast again (its
 *  rounds fell from the sustained height back to the spell's own). Pure.
 *  @param {any|null} fx the effect now @param {any|null} lastFx the effect last tick @param {number} lastRounds its rounds then */
export function justCast(fx, lastFx, lastRounds) {
  if (!fx) return false;
  if (fx !== lastFx) return true;
  const rounds = fx.roundsRemaining;
  if (!Number.isFinite(rounds) || !Number.isFinite(lastRounds)) return false;
  return rounds > lastRounds || (lastRounds > SUSTAIN_ROUNDS / 2 && rounds < SUSTAIN_ROUNDS / 4);
}

/** The English with each `{name}` filled: the words of a host with no text core (no `dfo.t`). Pure. */
const english = (/** @type {string} */ en, /** @type {Record<string, unknown>|null} */ args = null) => en.replace(/\{(\w+)\}/g, (m, k) => (args && Object.hasOwn(args, k) ? String(args[k]) : m));

/** The Clairvoyance effect among a character's active effects, not ended; or null. Read straight off the character: the game
 *  also refreshes a lasting effect and restores one from a save, and neither goes through the moment an effect begins. Pure.
 *  @param {any[]|undefined|null} effects */
export function findEffect(effects) {
  return (Array.isArray(effects) ? effects : []).find((x) => x?.kind === 'clairvoyance' && !x.ended) ?? null;
}

/** Whether the Clairvoyance spell is working now. Pure. @param {any[]|undefined|null} effects */
export function spellLasts(effects) {
  return findEffect(effects) !== null;
}

/** Whether the Wayfarer's path shows. With no castable spell it always shows. Pure.
 *  @param {{ mode: string, lasts: boolean, on: boolean, available: boolean }} s */
export function pathShows({ mode, lasts, on, available }) {
  if (!available) return true;
  if (mode === 'spell') return lasts;
  if (mode === 'toggle') return on;
  return true;
}

export default function setup(dfo) {
  /** Words in the player's language (the game's own table), else the English. */
  const tx = (/** @type {string} */ key, /** @type {string} */ en, /** @type {any} */ args = null) => (typeof dfo.t === 'function' ? dfo.t(key, en, args) : english(en, args));
  let mode = dfo.store.get('mode', 'always');
  if (!MODES.includes(mode)) mode = 'always';
  let follows = dfo.store.get('follows', 'auto');
  if (!FOLLOWS.includes(follows)) follows = 'auto';

  let hudSeen = -1e9;
  const playing = () => performance.now() - hudSeen < HUD_LIVE_MS;
  dfo.on('questMark', () => { hudSeen = performance.now(); });
  dfo.on('drawFx', () => { /* the spell hooks ride on this event: a module must hear it for the loader to put them in */ });

  // THE ICON: a 16 x 16 sprite, handed to the game for icon number ICON_INDEX (the loader's `spellIcon*` hooks ask for it). The game
  // wants an image description ({ src, w, h }) for its hotbar and quickslot, and a frame of pixels ({ width, height, colors }) for
  // the classic windows. Both are built from the same bytes, scaled without blurring.
  const spriteBytes = () => Uint8ClampedArray.from(atob(ICON_RGBA_B64), (c) => c.charCodeAt(0));
  const scaled = (/** @type {number} */ k) => {
    const src = spriteBytes(), out = new Uint8ClampedArray(16 * k * 16 * k * 4);
    for (let y = 0; y < 16 * k; y++) for (let x = 0; x < 16 * k; x++) for (let c = 0; c < 4; c++) out[(y * 16 * k + x) * 4 + c] = src[((Math.floor(y / k)) * 16 + Math.floor(x / k)) * 4 + c];
    return out;
  };
  let iconUrl = null;
  const iconDataUrl = () => {
    if (iconUrl) return iconUrl;
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    c.getContext('2d').putImageData(new ImageData(scaled(4), 64, 64), 0, 0);
    return (iconUrl = c.toDataURL('image/png'));
  };
  try {
    globalThis.dfoSpellIcon = {
      index: ICON_INDEX,
      frame: { width: 32, height: 32, colors: scaled(2) },
      image: (/** @type {number} */ box) => ({ src: iconDataUrl(), w: box > 0 ? box : 32, h: box > 0 ? box : 32, smooth: false }),
      dataUrl: iconDataUrl,
    };
  } catch (e) { console.warn('[module clairvoyance] the icon could not be made:', e); }
  // whether the loader's icon hooks are in: only then does the spell wear the sprite (else the game would find no icon for it)
  let iconHooked = false;
  try {
    globalThis.dfoMods?.status?.().then((s) => { iconHooked = ['drawFx:spellIconBox', 'drawFx:spellIconFrame'].every((k) => /^applied/.test(String(s?.hooks?.[k]))); }).catch(() => {});
  } catch { /* no status to ask */ }

  const player = () => globalThis.dfoCaster?.playerEntity?.() ?? null;
  const inBook = () => !!player()?.spells?.some?.((s) => s?.tag === TAG);

  // GIVE (once) AND VERIFY (every load): the spell in the spellbook, and the game able to cast it
  let status = { ready: false, waiting: true, reason: tx('module.clairvoyance.waiting', 'waiting for the game') };   // `waiting`: the check has not settled yet
  globalThis.dfoWayfarerStatus = status;
  // The game loads its parts as it goes: the spell factory (the guild chunk) and the spell controller come after this module does.
  // So the check is asked again every tick, and a "no" is only final once the HUD has been up for GIVE_UP_TICKS ticks.
  let hudTicks = 0;
  const handled = new WeakSet();   // player entities already given the spell this session (a spell the player deletes is not forced back until the next log-in)
  function verify() {
    const make = globalThis.dfoClairvoyance;
    const waiting = hudTicks < GIVE_UP_TICKS;
    let next;
    if (typeof make !== 'function') next = { ready: false, waiting, reason: tx('module.clairvoyance.noEffect', 'this game build has no Clairvoyance effect') };
    else if (!player()) next = { ready: false, waiting, reason: tx('module.clairvoyance.noPlayer', 'the player could not be reached') };
    else {
      try {
        const entity = player();
        entity.spells ??= [];
        // The game rewrites a character's spell list while it loads, so for the first minute of the HUD the spell is put back whenever
        // it is missing; after that a spell the player deletes is not forced back until the next log-in.
        if (!inBook() && (!handled.has(entity) || hudTicks < GIVE_UP_TICKS)) {
          // as the game's own vampirism and lycanthropy do: a custom spell on the entity (saved with the character)
          entity.spells.push({ ...make(), name: SPELL_NAME, tag: TAG, pack: PACK, creator: "Beardd's", custom: true, minimumCastingCost: true });
        }
        handled.add(entity);
        // the sprite when the loader hands it over, the game's own icon when not (it follows the game build, on every load)
        for (const sp of entity.spells) if (sp?.tag === TAG && sp.icon !== (iconHooked ? ICON_INDEX : ICON_PLAIN)) sp.icon = iconHooked ? ICON_INDEX : ICON_PLAIN;
        next = inBook() ? { ready: true, waiting: false, reason: '' } : { ready: false, waiting: false, reason: tx('module.clairvoyance.notInBook', 'the spell is not in your spellbook') };
      } catch (e) {
        console.warn('[module clairvoyance] the spellbook could not be written:', e);
        next = { ready: false, waiting, reason: tx('module.clairvoyance.noWrite', 'the spellbook could not be written') };
      }
    }
    Object.assign(status, next);
  }

  // THE PATH'S GATE: the waypoint and the guide trail ask before they draw (`globalThis.dfoWayfarerGate`)
  let on = false;                 // 'cast to turn on': the path is on
  const available = () => status.ready && inBook();
  const effectNow = () => findEffect(player()?.activeEffects);
  globalThis.dfoWayfarerGate = () => pathShows({ mode, lasts: effectNow() !== null, on, available: available() });
  /** End the effect and take it off the player: left in the list, the game would "refresh" the dead one on the next cast. */
  function endEffect(/** @type {any} */ fx) {
    if (!fx) return;
    fx.ended = true;
    const entity = player();
    if (entity) entity.activeEffects = (entity.activeEffects ?? []).filter((x) => x !== fx);
  }

  // THE CAST. A new cast (from the hotbar, the spellbook or a key here) swaps the compass to the mark of one of the three maps, and
  // the line over the compass says which registered. A plain cast follows the map the player stands in (or the one the page chose);
  // a direct cast (Shift+1 town and city, 2 region, 3 dungeon) names its map. The marks are the pins module's, set as always.
  const mapWord = (/** @type {string} */ m) => ({
    town: () => tx('module.clairvoyance.mapTown', 'Town and City'),
    region: () => tx('module.clairvoyance.mapRegion', 'Region'),
    dungeon: () => tx('module.clairvoyance.mapDungeon', 'Dungeon'),
    auto: () => tx('module.clairvoyance.mapAuto', 'Automatic'),
  })[m]();
  const distWord = (/** @type {number|null} */ m) => (m == null ? '' : m >= 1000 ? tx('module.clairvoyance.km', '{n} km', { n: (m / 1000).toFixed(1) }) : tx('module.clairvoyance.metres', '{n} m', { n: Math.round(m) }));
  /** Swap the compass to a map's mark, and say what registered. @param {string} want 'auto' or a map */
  function register(want) {
    const pins = globalThis.dfoWayfarer?.pins;
    if (!pins) return;   // no pins module: nothing marks places to follow
    const map = want === 'auto' ? pins.here() : want;
    const got = map ? pins.follow(map) : null;
    dfo.say(got
      ? tx('module.clairvoyance.registered', 'Clairvoyance: {map} - {what}, {dist}', { map: mapWord(map), what: got.what, dist: distWord(got.metres) })
      : tx('module.clairvoyance.none', 'No direct path found'));
  }
  let pending = null, pendingAt = 0;        // a direct cast's map, until the game begins the effect
  let seen = false, lastFx = null, lastRounds = NaN;

  function tick() {
    if (playing()) hudTicks++;
    verify();
    const fx = effectNow();
    const cast = seen && justCast(fx, lastFx, lastRounds);
    const recast = cast && fx === lastFx;
    if (cast && mode === 'toggle' && recast && on) { endEffect(fx); on = false; }                 // cast again while it is on: off
    else {
      if (cast) { register(pending && performance.now() - pendingAt < CAST_PENDING_MS ? pending : follows); pending = null; }
      if (mode === 'toggle') {
        if (fx && !on) on = true;
        if (!fx && on) on = false;
        if (on && fx && !(fx.roundsRemaining >= SUSTAIN_ROUNDS / 2)) fx.roundsRemaining = SUSTAIN_ROUNDS;   // kept lasting until it is cast again
      }
    }
    const now = effectNow();
    lastFx = now; lastRounds = now ? now.roundsRemaining : NaN; seen = true;
  }
  setInterval(tick, TICK_MS)?.unref?.();   // (a host timer object may be unref'd so it never holds a process open)

  /** A direct cast: choose the map, then cast the spell through the game (its magicka, its messages). With no spell to cast the key
   *  still swaps the compass to that map. */
  function castMap(/** @type {string} */ map) {
    if (!playing()) return;
    if (!available()) { register(map); return; }
    pending = map; pendingAt = performance.now();
    globalThis.dfoCaster?.readySpell?.(player()?.spells?.find((s) => s?.tag === TAG));
  }

  const setMode = (m) => { mode = m; on = false; dfo.store.set('mode', mode); };
  const setFollows = (f) => { follows = f; dfo.store.set('follows', follows); };
  const modeWord = (m) => ({
    always: () => tx('module.clairvoyance.modeAlways', 'instant'),
    spell: () => tx('module.clairvoyance.modeSpell', 'Decay over time'),
    toggle: () => tx('module.clairvoyance.modeToggle', 'Toggle casting'),
  })[m]();
  const modeNote = (m) => ({
    always: () => tx('module.clairvoyance.noteAlways', 'The path shows as it always has.'),
    spell: () => tx('module.clairvoyance.noteSpell', 'The path shows only while Clairvoyance lasts.'),
    toggle: () => tx('module.clairvoyance.noteToggle', 'A cast turns the path on. Cast again to turn it off.'),
  })[m]();

  // THE SETTING IN THE SPELL'S DESCRIPTION: the enhanced spellbook calls this when it builds the spell's detail view
  const el = (/** @type {string} */ tag, /** @type {string|null} */ cls, /** @type {string|null} */ text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const divider = (/** @type {string} */ text) => {
    const d = el('div', 'px-divider', null);
    d.append(el('span', 'px-gem', null), el('span', 'px-divword', text), el('span', 'px-gem', null));
    return d;
  };
  /** A row of buttons, left to right and wrapping; `on` marks the chosen one. @param {[string, boolean, () => void, string?][]} items label, on, click, colour */
  const buttons = (items) => {
    const row = el('div', 'sb-acts', null);
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-start;margin:0';
    for (const [label, isOn, click, colour] of items) {
      const b = el('button', `act${isOn ? ' on' : ''}`, label);
      if (colour) b.style.borderLeft = `4px solid ${colour}`;
      b.onclick = click;
      row.append(b);
    }
    return row;
  };
  /** One setting: its name on the left, its buttons beside it. */
  const settingRow = (/** @type {string} */ label, /** @type {HTMLElement} */ content) => {
    const r = el('div', null, null);
    r.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:8px 0 2px';
    const l = el('span', 'px-note', label);
    l.style.cssText = 'flex:0 0 150px;text-align:left;margin:0';
    r.append(l, content);
    return r;
  };
  /** A quiet line under a setting. */
  const hint = (/** @type {string} */ text) => {
    const h = el('p', 'px-note', text);
    h.style.cssText = 'margin:0 0 4px;opacity:0.75;text-align:left';
    return h;
  };

  // THE COMPASS'S DIAMOND (the game's own quest mark on the compass): shown or hidden on its own, whatever the waypoint does
  let compass = dfo.store.get('compass', true);
  function applyCompass() {
    try {
      let style = document.getElementById('dfo-compass-style');
      if (compass) style?.remove();
      else if (!style) {
        style = document.createElement('style');
        style.id = 'dfo-compass-style';
        style.textContent = '.hud-quest { display: none !important; }';
        document.head.append(style);
      }
    } catch { /* no page to style */ }
  }
  applyCompass();

  // THE SETTINGS, in the spell's description: the lore and who made it, when the path shows, what shows, and the colours.
  // Waypoint and trail state come through the small surface those modules offer (`globalThis.dfoWayfarer`); where a module is
  // not installed its rows are simply not there.
  globalThis.dfoSpellPanel = (spell, detail, redraw) => {
    if (spell?.tag !== TAG) return;
    try {
      const wp = globalThis.dfoWayfarer?.waypoint, trail = globalThis.dfoWayfarer?.trail, notice = globalThis.dfoWayfarer?.notice;
      const wrap = el('div', 'sb-effects', null);
      const note = (/** @type {string} */ text) => { const n = el('p', 'px-note', text); n.style.cssText = 'margin:4px 0;text-align:left'; return n; };
      // the sprite, and what the spell does
      const top = el('div', null, null);
      top.style.cssText = 'display:flex;gap:10px;align-items:center;margin:4px 0';
      const pic = el('img', null, null);
      pic.alt = '';
      pic.src = iconDataUrl();
      pic.style.cssText = 'width:64px;height:64px;image-rendering:pixelated;flex:none';
      top.append(pic, note(tx('module.clairvoyance.what', WHAT)));
      // the lore, and where the spell comes from
      const credit = el('div', null, null);
      credit.style.cssText = 'opacity:0.75;margin:4px 0 6px';
      credit.append(note(tx('module.clairvoyance.creditIdea', "The original idea comes from Bethesda's Skyrim. Improved and adapted for Daggerfall.")), note(tx('module.clairvoyance.creditMade', "Created by BearddOddity")));
      wrap.append(top, note(tx('module.clairvoyance.lore', LORE)), credit, divider(tx('module.clairvoyance.settings', 'Settings')));

      // when the path shows
      wrap.append(settingRow(tx('module.clairvoyance.rowPath', 'Path shows'), buttons(MODES.map((m) => [modeWord(m), mode === m, () => { setMode(m); redraw(); }]))), hint(modeNote(mode)));
      if (mode === 'toggle' && on) wrap.append(buttons([[tx('module.clairvoyance.turnOff', 'Turn it off now'), false, () => { endEffect(effectNow()); on = false; redraw(); }]]));
      // which map a cast follows
      wrap.append(settingRow(tx('module.clairvoyance.rowFollows', 'Cast follows'), buttons(FOLLOWS.map((f) => [mapWord(f), follows === f, () => { setFollows(f); redraw(); }]))),
        hint(tx('module.clairvoyance.followsNote', 'Automatic follows the map you are in. Shift+1, 2 and 3 cast for the town and city, the region and the dungeon.')));
      // what shows: each on its own (the compass's diamond can be on with the waypoint off, or the other way round)
      const word = (label, isOn) => tx('module.clairvoyance.onOff', '{label}: {state}', { label, state: isOn ? tx('module.clairvoyance.on2', 'on') : tx('module.clairvoyance.off2', 'off') });
      const shows = [];
      if (wp) shows.push([word(tx('module.clairvoyance.showWaypoint', 'Waypoint'), wp.on), wp.on, () => { wp.on = !wp.on; redraw(); }]);
      if (trail) shows.push([word(tx('module.clairvoyance.showTrail', 'Guide trail'), trail.on), trail.on, () => { trail.on = !trail.on; redraw(); }]);
      shows.push([word(tx('module.clairvoyance.showCompass', 'Compass diamond'), compass), compass, () => { compass = !compass; dfo.store.set('compass', compass); applyCompass(); redraw(); }]);
      if (notice) shows.push([word(tx('module.clairvoyance.showNotice', 'Login reminder'), notice.on), notice.on, () => { notice.on = !notice.on; redraw(); }]);
      wrap.append(settingRow(tx('module.clairvoyance.rowShow', 'Show'), buttons(shows)));
      // the colours
      if (wp) wrap.append(settingRow(tx('module.clairvoyance.rowWaypointColour', 'Waypoint colour'), buttons(wp.looks.map((l) => [wp.word(l), wp.look === l, () => { wp.look = l; redraw(); }, wp.css(l)]))));
      if (trail) wrap.append(settingRow(tx('module.clairvoyance.rowTrailColour', 'Trail colour'), buttons(trail.looks.map((l) => [trail.word(l), trail.look === l, () => { trail.look = l; redraw(); }]))));
      detail.append(wrap);
    } catch (e) { console.warn('[module clairvoyance] the settings could not be drawn:', e); }
  };

  // THE DIRECT CASTS (in the keys panel, Shift+F1, to move): Shift+1 town and city, Shift+2 region, Shift+3 dungeon, on the top row or
  // the number pad. They are casts, not settings: the settings are on the spell's page, so no other key is left.
  MAPS.forEach((m, i) => {
    const label = tx('module.clairvoyance.keyMap', 'Cast Clairvoyance: {map}', { map: mapWord(m) });
    dfo.onKey(DIGIT_KEYS[i], () => castMap(m), label);
    dfo.onKey(PAD_KEYS[i], () => castMap(m), label);
  });
}
