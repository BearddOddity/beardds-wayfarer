// Draws the Clairvoyance spell icon: a 16 x 16 pixel sprite (the size of the game's own spell icons) of a blue burst of light
// with a bright core, rays of two lengths and a squashed ring, after the player's reference art. No dependencies.
//
//   node tools/make-clairvoyance-icon.mjs            writes source/clairvoyance/art/ (icon-16.png, icon-128.png) and icon.rgba.b64
//
// icon.rgba.b64 is the 16 x 16 RGBA bytes in base64: source/clairvoyance/module.js carries them (ICON_RGBA_B64).
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'source', 'clairvoyance', 'art');
const N = 16;

// the palette: a few blues from white-hot to deep, each one a pixel-art step
const P = {
  core: [255, 255, 255, 255],
  hot: [214, 242, 255, 255],
  bright: [140, 208, 255, 255],
  mid: [74, 158, 246, 255],
  deep: [38, 96, 205, 255],
  shade: [24, 56, 140, 235],
  none: [0, 0, 0, 0],
};

const px = Array.from({ length: N }, () => Array.from({ length: N }, () => P.none));
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y][x] = c; };
const cx = 7.5, cy = 7.5;
const near = (r, len) => (r < len * 0.34 ? P.hot : r < len * 0.62 ? P.bright : r < len * 0.86 ? P.mid : P.deep);

// the ring first, so the rays cross it: a squashed ellipse, drawn as arcs (thin, light blue)
for (let t = 0; t < 360; t += 3) {
  const a = (t * Math.PI) / 180, x = Math.round(cx + Math.cos(a) * 5.6), y = Math.round(cy + Math.sin(a) * 3.6);
  put(x, y, Math.sin(a) < 0 ? P.bright : P.mid);
}
// the rays: eight long ones on the compass points, eight short ones between, one pixel wide, brightest at the core
for (let k = 0; k < 16; k++) {
  const a = (k * Math.PI) / 8, len = k % 2 === 0 ? 7.6 : 4.8;
  for (let r = 1.4; r <= len; r += 0.25) put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), near(r, len));
}
// the core: a white-hot heart
for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]]) put(x, y, P.core);
for (const [x, y] of [[6, 7], [9, 7], [6, 8], [9, 8], [7, 6], [8, 6], [7, 9], [8, 9]]) put(x, y, P.hot);
// a few sparks, as in the art
for (const [x, y] of [[2, 2], [13, 3], [13, 13], [1, 12]]) put(x, y, P.hot);

// PNG writer (RGBA, 8 bit)
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const rgba = Buffer.alloc(N * N * 4);
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) Buffer.from(px[y][x]).copy(rgba, (y * N + x) * 4);
const S = 8, big = Buffer.alloc(N * S * N * S * 4);     // the same sprite, nearest-neighbour, for looking at
for (let y = 0; y < N * S; y++) for (let x = 0; x < N * S; x++) Buffer.from(px[Math.floor(y / S)][Math.floor(x / S)]).copy(big, (y * N * S + x) * 4);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'icon-16.png'), png(N, N, rgba));
writeFileSync(join(out, 'icon-128.png'), png(N * S, N * S, big));
writeFileSync(join(out, 'icon.rgba.b64'), rgba.toString('base64'));
console.log('wrote', out);
