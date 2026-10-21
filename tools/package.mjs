// Builds the player download: one zip with only what a player needs, laid out so the top of the folder is short and clear.
//
//   node tools/package.mjs            -> dist/Beardds-Wayfarer-<version>.zip   (the version is the newest CHANGELOG heading)
//
// The repository keeps the developer's layout (source/, test/, game-integration/, dev-review/, tools/, docs/developers/). The zip
// has none of that. It is the same files, regrouped. They sit at the ROOT of the zip, with no folder around them: a player who
// unzips gets one folder (named after the zip), and that folder is the mod's folder the launchers look for beside the game. A
// folder inside the zip would make two, and put the mod one level too deep.
//
//   (the zip's root)
//     README.md  CHANGELOG.md  LICENSE
//     Install.cmd  Play Wayfarer.cmd  Uninstall.cmd         Windows: double-click
//     Linux and macOS/  install.sh  play-wayfarer.sh  uninstall.sh
//     Mods/                                                 the five modules
//     Loader/                                               the loader the launchers run (dev-review/ + tools/, merged)
//     docs/                                                 the player's pages
//
// Every path a launcher uses is rewritten by an exact, checked replacement: a replacement that matches nothing stops the build.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = /^## (\d+\.\d+\.\d+)/m.exec(readFileSync(join(repo, 'CHANGELOG.md'), 'utf8'))?.[1];
if (!version) throw new Error('no version heading in CHANGELOG.md');
const dist = join(repo, 'dist');
const top = "Beardd's Wayfarer";
const out = join(dist, top);
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });   // only ever this repo's own dist/
mkdirSync(out, { recursive: true });

const copy = (from, to, filter) => cpSync(join(repo, from), join(out, to), { recursive: true, filter });
const read = (p) => readFileSync(join(out, p), 'utf8');
const write = (p, t) => writeFileSync(join(out, p), t);
/** Replace every `from` in a packaged file by `to`; a miss is an error (the file changed and this list did not). */
function swap(file, pairs) {
  let t = read(file);
  for (const [from, to] of pairs) {
    if (!t.includes(from)) throw new Error(`${file}: expected to find ${JSON.stringify(from)}`);
    t = t.split(from).join(to);
  }
  write(file, t);
}

// the mod, the loader and the pages
copy('Mods', 'Mods');
copy('LICENSE', 'LICENSE');
copy('CHANGELOG.md', 'CHANGELOG.md');
copy('docs/players', 'docs');
for (const f of ['launch.mjs', 'platform.cjs']) copy(`dev-review/${f}`, `Loader/${f}`);
copy('dev-review/loader', 'Loader/loader');
copy('dev-review/core', 'Loader/core', (p) => !/[\\/]src([\\/]|$)/.test(p));   // the page host's source is for developers; core.js is built from it
for (const f of ['install.ps1', 'uninstall.ps1', 'common.sh']) copy(`tools/${f}`, `Loader/${f}`);
for (const f of ['Install.cmd', 'Uninstall.cmd', 'Play Wayfarer.cmd']) copy(f, f);
mkdirSync(join(out, 'Linux and macOS'));
for (const f of ['install.sh', 'uninstall.sh', 'play-wayfarer.sh']) copy(f, `Linux and macOS/${f}`);
copy('tools/package-readme.md', 'README.md');

// the launchers: the loader's folder is Loader/ now, and the shell scripts sit one folder down
swap('Install.cmd', [['tools\\install.ps1', 'Loader\\install.ps1']]);
swap('Uninstall.cmd', [['tools\\uninstall.ps1', 'Loader\\uninstall.ps1']]);
swap('Play Wayfarer.cmd', [['dev-review\\', 'Loader\\']]);
const up = ['here=$(cd "$(dirname "$0")" && pwd)', 'here=$(cd "$(dirname "$0")/.." && pwd)'];
for (const f of ['install.sh', 'uninstall.sh']) swap(`Linux and macOS/${f}`, [up, ['$here/tools/common.sh', '$here/Loader/common.sh']]);
swap('Linux and macOS/play-wayfarer.sh', [up, ['$here/tools/common.sh', '$here/Loader/common.sh'], ['dev-review/', 'Loader/'], ['./play-wayfarer.sh', './"Linux and macOS"/play-wayfarer.sh']]);
swap('Linux and macOS/install.sh', [['./play-wayfarer.sh', 'Linux and macOS/play-wayfarer.sh']]);

// the install page ends with a section for developers, and points at their guide: neither is in the download
write('docs/install.md', read('docs/install.md').replace(/\n## For developers[^]*$/, '\n').replace(' To change the mod, see [Maintaining](../developers/maintaining.md).', ''));

// the words in the pages and scripts: say Loader/, never dev-review/ or tools/
const textFiles = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(md|cmd|sh|ps1)$/.test(n)) textFiles.push(p); } })(out);
for (const p of textFiles) {
  const rel = relative(out, p);
  if (rel === 'CHANGELOG.md') continue;   // history keeps the names it was written with
  const t = readFileSync(p, 'utf8');
  let n = t;
  if (rel.startsWith('docs')) n = n.replace(/\.\/(install|uninstall|play-wayfarer)\.sh/g, '"./Linux and macOS/$1.sh"').replace('chmod +x *.sh dev-review/*.sh', 'chmod +x "Linux and macOS"/*.sh');
  if (rel.startsWith('docs')) n = n.split('\n').filter((l) => !/Check hooks/.test(l)).join('\n').replace(/ \(\[details\]\([^)]*game-integration[^)]*\)\)/g, '');   // the developer's tools are not in the download
  n = n.replace(/docs([\\/])players\1/g, 'docs$1').replace(/dev-review/g, 'Loader').replace(/\btools([\\/])/g, 'Loader$1');
  if (n !== t) writeFileSync(p, n);
}

// no page may point at a file that is not in the zip
const dead = [];
for (const p of textFiles.filter((f) => f.endsWith('.md'))) {
  for (const m of readFileSync(p, 'utf8').matchAll(/\]\((?!https?:|#|mailto:)([^)\s#]+)/g)) if (!existsSync(resolve(dirname(p), decodeURI(m[1])))) dead.push(`${relative(out, p)} -> ${m[1]}`);
}
if (dead.length) throw new Error(`links to files that are not in the download:\n  ${dead.join('\n  ')}`);

const zip = join(dist, `Beardds-Wayfarer-${version}.zip`);
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : null;
const r = tar
  ? spawnSync(tar, ['-a', '-c', '-f', zip, '-C', out, ...readdirSync(out)], { stdio: 'inherit' })   // Windows' own bsdtar writes a real zip; named entries, so none starts with ./
  : spawnSync('zip', ['-qr', zip, ...readdirSync(out)], { cwd: out, stdio: 'inherit' });
if (r.status !== 0) throw new Error('could not make the zip');
console.log(`${relative(repo, zip)}  (${(statSync(zip).size / 1024).toFixed(0)} KB)`);
