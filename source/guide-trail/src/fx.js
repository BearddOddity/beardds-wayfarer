// @ts-check
// GUIDE10 (the guide trail, systems/guideTrail.js): THE EMBERS IN THE WORLD PASS.
//
// The renderer already draws a stream of camera-facing quads in world space for Morrowind's spell effects
// (renderer.createParticleEffect / updateParticleEffect / drawWorldParticleEffects: depth-tested against the world, never
// written, a blend of the caller's choosing), so the trail is one more such stream - no program, no buffer of its own:
// ONE effect made the first time there is a trail to draw, sized for the most embers a stream holds, its texture a small
// soft-edged glow made here and freed with it, its quads written each frame into ONE Float32Array made once. The blend
// is additive (SRC_ALPHA, ONE): a gold ember over a dark dungeon glows, over a sunlit street it is a warm spark, and an
// ember over another never turns dark.
//
// A host hands this a PATH each frame - the points of the way from where the player stands to where they are going - and
// this cuts the stretch ahead, writes the embers and draws them. A host with no path (the trail is off, or it has nowhere
// to lead) hands null and this draws nothing and holds nothing live. EVERY ALLOCATION HAS AN OWNER: `dispose` frees the
// effect and the glow.
//
// Not a DFU member. Ledger A (GUIDE10).

import { createStream, GUIDE_MAX_EMBERS } from './embers.js';
/** The renderer's particle stream: 12 floats a vertex, six vertices a quad (corner, then picture coordinates). */
const PARTICLE_FLOATS = 12;
const PARTICLE_CORNERS = [[-1, -1, 0, 1], [1, -1, 1, 1], [1, 1, 1, 0], [-1, -1, 0, 1], [1, 1, 1, 0], [-1, 1, 0, 0]];

/** The glow's side in texels: small and hard-edged enough to read as the game's own pixels at an ember's size. */
export const GLOW_TEXELS = 16;
/** The renderer's NIF blend indices (render/renderer.js NIF_BLEND_MODES): the SPARKS are SRC_ALPHA, ONE - additive, so a spark over a dark
 *  floor glows; the floor's POOLS are SRC_ALPHA, ONE_MINUS_SRC_ALPHA - an ordinary translucent stain, because an additive gold over a
 *  bright floor (snow, pale stone) washes out to white and the trail is lost exactly where the player most needs it. Both are tested
 *  against the world and never written. */
export const EMBER_BLEND = Object.freeze({ blend: true, srcBlend: 6, dstBlend: 0, depthTest: true, depthWrite: false });
export const POOL_BLEND = Object.freeze({ blend: true, srcBlend: 6, dstBlend: 7, depthTest: true, depthWrite: false });

/** The glow: white, its alpha a bright core falling off to nothing at the edge (the vertex colour is the ember's gold).
 *  Pure. @returns {{ width: number, height: number, rgba: Uint8Array }} */
export function glowMip(side = GLOW_TEXELS) {
  const rgba = new Uint8Array(side * side * 4);
  const c = (side - 1) / 2;
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const r = Math.hypot(x - c, y - c) / (side / 2);
      const a = r >= 1 ? 0 : Math.pow(1 - r, 1.6);
      const o = (y * side + x) * 4;
      rgba[o] = 255; rgba[o + 1] = 255; rgba[o + 2] = 255; rgba[o + 3] = Math.round(a * 255);
    }
  }
  return { width: side, height: side, rgba };
}

/** The live embers as the particle stream's six vertices a quad - formats/mwParticles.js packParticleQuads' layout - into
 *  `buf`. Pure but for `buf`. @param {Float32Array} buf @param {ReadonlyArray<{ pos: number[], size: number, color: number[], alpha: number }>} embers @param {number} n */
export function packEmbers(buf, embers, n, from = 0, step = 1) {
  let o = 0, count = 0;
  for (let i = from; i < n; i += step) {
    count++;
    const q = embers[i];
    for (const [cx, cy, u, v] of PARTICLE_CORNERS) {
      buf[o++] = q.pos[0]; buf[o++] = q.pos[1]; buf[o++] = q.pos[2];
      buf[o++] = cx; buf[o++] = cy;
      buf[o++] = u; buf[o++] = v;
      buf[o++] = q.color[0]; buf[o++] = q.color[1]; buf[o++] = q.color[2]; buf[o++] = q.alpha;
      buf[o++] = q.size;
    }
  }
  return count * 6;
}

/**
 * @param {{ renderer: any, clock?: () => number }} o `renderer` the port's; `clock` seconds (the embers are a function of it)
 */
export function createGuideTrailFx({ renderer, clock = () => performance.now() / 1000 }) {
  const field = createStream();
  const poolBuf = new Float32Array(GUIDE_MAX_EMBERS * 6 * PARTICLE_FLOATS), sparkBuf = new Float32Array(GUIDE_MAX_EMBERS * 6 * PARTICLE_FLOATS);
  /** @type {any} */ let effect = null, pools = null;
  /** @type {any} */ let tex = null;
  let broken = false;
  const ready = () => !broken && !!renderer?.gl && !!renderer._proj && !!renderer._view && typeof renderer.createParticleEffect === 'function';
  function ensure() {
    if (effect) return true;
    try {
      tex = renderer.createCharacterTexture([glowMip()]);
      pools = renderer.createParticleEffect(GUIDE_MAX_EMBERS, POOL_BLEND);
      effect = renderer.createParticleEffect(GUIDE_MAX_EMBERS, EMBER_BLEND);
      pools.tex = tex; effect.tex = tex;   // one glow under both: each lets go of it before it is released, the glow freed once below
      return true;
    } catch (e) {
      broken = true;
      console.warn('[guide-trail] the embers would not build', /** @type {any} */ (e)?.message ?? e);
      return false;
    }
  }
  return {
    /**
     * One frame. `path` the way from the player's feet to the goal (points [x, y, z], pass space) or null; `feet` where
     * the player stands. Answers whether it drew.
     * @param {number[][]|null} path @param {number[]|null} feet @param {{ brightness?: number, ahead?: number, style?: any }} [o]
     */
    draw(path, feet, { brightness = 1, ahead, style } = {}) {
      const hide = () => { if (effect) { effect.hidden = true; pools.hidden = true; } return false; };
      if (!path || !feet || !ready()) return hide();
      const n = field.fill(path, feet, clock(), { ahead, brightness, style });
      if (!n || !ensure()) return hide();
      // the field writes a floor pool and then a spark for every slot of the window: the pools are the even quads, the sparks the odd
      renderer.updateParticleEffect(pools, poolBuf, packEmbers(poolBuf, field.embers, n, 0, 2));
      pools.hidden = false;
      renderer.updateParticleEffect(effect, sparkBuf, packEmbers(sparkBuf, field.embers, n, 1, 2));
      effect.hidden = false;
      renderer.drawWorldParticleEffects([pools, effect]);
      return true;
    },
    /** Frees the effect and the glow (a host's end). */
    dispose() {
      if (effect) { effect.tex = null; renderer.releaseParticleEffect(effect); effect = null; }
      if (pools) { pools.tex = null; renderer.releaseParticleEffect(pools); pools = null; }
      if (tex) { renderer.releaseCharacterTexture(tex); tex = null; }
    },
    /** For a pin and the console: is an effect standing. */
    get live() { return !!effect && !effect.hidden && effect.count > 0; },
  };
}
