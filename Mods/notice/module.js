// MODULE: MOD NOTICE.
//
// A small line at the top of the view for a few seconds when the game's HUD first comes up in a game start: "Beardd's Wayfarer
// active", so the player sees the mod has loaded. Shown once per game start, never again until the game is started anew.
// Hears `drawFx` (the world pass, which runs while the HUD is up: the heartbeat, and nothing else), and reaches nothing else.
//
// Key (only while the game's HUD is up): F6 on / off - the player may change it (Shift+F1). A line that is off stays off: the
// choice is kept. Setting: this module's own store (`on`, default on).
const SHOW_MS = 4000;          // how long the line stays up
const HUD_LIVE_MS = 400;       // the HUD draws every frame while the game is played; a menu, a dialog, a map or a loading screen stops it (and the keys)
const WAIT_MS = 3000;          // the longest the first show waits for Clairvoyance's check
const LATE_MS = 90000;         // the line may be shown again, if Clairvoyance settles late, within this long of its first show

/** The English with each `{name}` filled: the words of a host with no text core (no `dfo.t`). Pure. */
const english = (/** @type {string} */ en, /** @type {Record<string, unknown>|null} */ args = null) => en.replace(/\{(\w+)\}/g, (m, k) => (args && Object.hasOwn(args, k) ? String(args[k]) : m));

/** Run `register` (the module's keys) only where the Clairvoyance spell cannot hold the settings: it waits a few seconds for that
 *  module to load and finish its check (`globalThis.dfoWayfarerStatus`, at most two minutes), and registers when there is no such
 *  module or the spell is not ready. */
function keysUnlessSpell(register) {
  const t0 = performance.now();
  const id = setInterval(() => {
    const st = globalThis.dfoWayfarerStatus, elapsed = performance.now() - t0;
    if (elapsed < 3000 || (st?.waiting && elapsed < 120000)) return;
    clearInterval(id);
    if (!st?.ready) register();
  }, 1000);
  id?.unref?.();
}

export default function setup(dfo) {
  /** Words in the player's language (the game's own table), else the English. */
  const tx = (/** @type {string} */ key, /** @type {string} */ en, /** @type {any} */ args = null) => (typeof dfo.t === 'function' ? dfo.t(key, en, args) : english(en, args));
  let on = dfo.store.get('on', true);

  let hudSeen = -1e9;   // when the HUD last drew
  const playing = () => performance.now() - hudSeen < HUD_LIVE_MS;
  let shown = false;    // the line has come up in this game start
  let ui = null;        // the line's element, made on first use
  let timer = 0;

  // The line also says whether Clairvoyance is ready, when that module has checked (`globalThis.dfoWayfarerStatus`, set by it).
  // The first show waits for the check, but never longer than WAIT_MS; with no Clairvoyance module the line is the plain one.
  let firstFrame = 0;
  let shownAt = 0;      // when the line first came up
  let lastText = '';    // the words last shown
  dfo.on('drawFx', () => {
    hudSeen = performance.now();
    firstFrame ||= hudSeen;
    const st = globalThis.dfoWayfarerStatus;
    const settled = !st || !st.waiting || hudSeen - firstFrame > WAIT_MS;
    if (!shown && on && settled) { shown = true; shownAt = hudSeen; show(); }
    // Clairvoyance may settle after the line first came up (the game loads its parts as it goes): say the new state, once it changes
    else if (shown && on && hudSeen - shownAt < LATE_MS && lineText() !== lastText) show();
  });

  /** The line's words: the notice, and Clairvoyance's state when it reported one. */
  function lineText() {
    const base = tx('module.notice.text', "Beardd's Wayfarer active");
    const st = globalThis.dfoWayfarerStatus;
    if (!st || st.waiting) return base;
    return st.ready
      ? tx('module.notice.ready', '{base} - Clairvoyance ready', { base })
      : tx('module.notice.notReady', '{base} - Clairvoyance off: {reason}', { base, reason: st.reason });
  }

  function build() {
    const css = document.createElement('style');
    css.textContent = `
      #dfo-notice { position: fixed; left: 50%; top: 14px; transform: translate(-50%, -6px); z-index: 2147483000;
        pointer-events: none; opacity: 0; transition: opacity 0.6s, transform 0.6s; white-space: nowrap;
        font: 13px/1.2 "Pixelify Sans", Georgia, serif; color: #f2e6c4; text-shadow: 0 0 3px #000, 0 1px 2px #000;
        padding: 4px 12px; background: rgba(10, 12, 17, 0.6); border: 1px solid #c9962c; border-radius: 3px; }
      #dfo-notice.up { opacity: 1; transform: translate(-50%, 0); }`;
    document.head.append(css);
    ui = document.createElement('div');
    ui.id = 'dfo-notice';
    ui.setAttribute('role', 'status');   // a screen reader reads the line out
    document.body.append(ui);
  }

  function show() {
    try {
      if (!ui) build();
      lastText = lineText();
      ui.textContent = lastText;
      requestAnimationFrame(() => ui.classList.add('up'));
      clearTimeout(timer);
      timer = setTimeout(hide, SHOW_MS);
    } catch (e) { console.warn('[module notice] show failed:', e); }
  }

  function hide() {
    clearTimeout(timer);
    ui?.classList.remove('up');
  }

  // the line on or off, for the Clairvoyance spell's page (the setting sits there; nothing else reads this)
  (globalThis.dfoWayfarer ??= {}).notice = {
    get on() { return on; },
    set on(v) { on = !!v; dfo.store.set('on', on); if (!on) hide(); },
  };

  // the key, only while the HUD is up (in a menu or a dialog F6 means nothing here). The Clairvoyance spell's page holds this
  // setting; the key is only for where that spell is not ready.
  keysUnlessSpell(() => {
    dfo.onKey('F6', () => {
      if (!playing()) return;
      on = !on; dfo.store.set('on', on);
      if (!on) hide();
      dfo.say(on ? tx('module.notice.on', 'Mod notice on') : tx('module.notice.off', 'Mod notice off'));
    }, tx('module.notice.keyOnOff', 'Mod notice on / off'));
  });
}
