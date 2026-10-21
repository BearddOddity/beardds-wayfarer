// Where things are on this computer, on Windows, macOS and Linux: the game, its runtime, and the game's user-data folder.
// Shared by launch.mjs and check.cjs so both find the game alike. The loader itself (loader/main.cjs) needs none of it: it runs
// inside the game and asks Electron.
//
// The game ships as: Windows - a folder holding "DFO Online.exe"; macOS - "DFO Online.app"; Linux - an AppImage
// ("DFO-Online-linux-*.AppImage"), or an unpacked folder. `where` may be any of those, or a folder holding one.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const kind = (p) => { try { return fs.statSync(p).isDirectory() ? 'dir' : 'file'; } catch { return null; } };
const BINARIES = ['DFO Online.exe', 'dfo-online', 'DFO Online', 'daggerfall-js-app'];   // an unpacked game's executable, by platform

/** The runtime of the game at `where`: { exe, name } or null. `exe` is what to start; the game's own Electron runs the loader. */
function inspect(where) {
  if (!where) return null;
  const p = path.resolve(where);
  const k = kind(p);
  if (k === 'file') return /\.appimage$/i.test(p) || BINARIES.includes(path.basename(p)) ? { exe: p } : null;
  if (k !== 'dir') return null;
  if (/\.app$/i.test(p)) {   // macOS bundle: the binary is the only file in Contents/MacOS
    const dir = path.join(p, 'Contents', 'MacOS');
    const bin = fs.existsSync(path.join(dir, 'DFO Online')) ? 'DFO Online' : (fs.readdirSync(dir)[0] ?? null);
    return bin ? { exe: path.join(dir, bin) } : null;
  }
  for (const b of BINARIES) if (kind(path.join(p, b)) === 'file' && kind(path.join(p, 'resources')) === 'dir') return { exe: path.join(p, b) };
  const inside = fs.readdirSync(p).filter((n) => /\.app$/i.test(n) || /^DFO[ -]Online.*\.appimage$/i.test(n)).sort();   // a folder holding the game
  return inside.length ? inspect(path.join(p, inside[0])) : null;
}

/** Where to look when nobody says: DFO_GAME, beside or around the mod's folder, then the usual homes of the game. */
function candidates(modFolder) {
  const home = os.homedir();
  const around = [path.join(modFolder, '..', 'Daggerfall Online'), path.join(modFolder, '..')];   // beside the mod's folder, or the mod's folder inside the game's
  if (process.platform === 'darwin') return [...around, '/Applications/DFO Online.app', path.join(home, 'Applications', 'DFO Online.app')];
  if (process.platform === 'linux') return [...around, ...['Applications', 'Games', 'Downloads', '.'].map((d) => path.join(home, d)), '/opt/DFO Online', '/opt/dfo-online'];
  return around;
}

/** The game to use: the argument, else DFO_GAME, else the first candidate that holds one. { where, exe } or null. */
function findGame(modFolder, given) {
  for (const w of [given, process.env.DFO_GAME, ...candidates(modFolder)]) {
    const g = w && inspect(w);
    if (g) return { where: path.resolve(w), ...g };
    if (w && (given === w || process.env.DFO_GAME === w)) return null;   // asked for by name and not there: never fall through to another
  }
  return null;
}

/** The game's own user-data folder (the game sets it the same way); the Mods folder is inside it. */
function userData() {
  if (process.env.DAGGER_USER_DATA) return process.env.DAGGER_USER_DATA;
  const home = os.homedir();
  const appData = process.platform === 'win32' ? (process.env.APPDATA || path.join(home, 'AppData', 'Roaming'))
    : process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support')
      : (process.env.XDG_CONFIG_HOME || path.join(home, '.config'));
  return path.join(appData, 'Daggerfall JavaScript');
}

/** The game's resources folder, seen from inside its own runtime (ELECTRON_RUN_AS_NODE): this is also true inside an AppImage's
 *  mount, where the folder cannot be reached from outside. */
const resources = () => process.resourcesPath || path.join(path.dirname(process.execPath), process.platform === 'darwin' ? '../Resources' : 'resources');

module.exports = { inspect, findGame, userData, resources };
