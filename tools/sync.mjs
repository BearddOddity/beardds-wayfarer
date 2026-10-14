// Refreshes this repo from the game source's mod-modules branch, where the mod is written and tested:
//   Mods/                         the base mod, ready to install (the source's scripts/buildModules.mjs --install: built, with each
//                                 entry's sha256 in its module.json)
//   source/                       the modules' own source (the source's modules/ folder, guide-trail's src/ included)
//   game-integration/patches/     the branch as patches on the upstream main it was cut from (git format-patch)
//   dev-review/core/              the loader's page host, rebuilt from the source's Mod API (dev-review/build-core.mjs)
//
//   node tools/sync.mjs [--source <daggerfall-js-source folder>] [--base <upstream ref, default origin/main>]
//
// Commit the source branch first: the patches are made from its commits, never from uncommitted work.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const source = resolve(arg('--source', join(repo, '..', 'daggerfall-js-source')));
const base = arg('--base', 'origin/main');
const run = (cmd, args, cwd = repo) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

if (!existsSync(join(source, 'scripts', 'buildModules.mjs'))) throw new Error(`no game source at ${source} (--source <folder>)`);
if (run('git', ['status', '--porcelain'], source).trim()) throw new Error(`${source} has uncommitted changes: commit them first`);

// the base mod: built and installed into this repo, as into a player's user data folder (<dir>/Mods/<id>)
rmSync(join(repo, 'Mods'), { recursive: true, force: true });
process.stdout.write(run(process.execPath, [join(source, 'scripts', 'buildModules.mjs'), '--install', repo], source));

// the modules' source
rmSync(join(repo, 'source'), { recursive: true, force: true });
cpSync(join(source, 'modules'), join(repo, 'source'), { recursive: true });

// the game integration: the branch as patches
const patches = join(repo, 'game-integration', 'patches');
rmSync(patches, { recursive: true, force: true });
mkdirSync(patches, { recursive: true });
run('git', ['format-patch', '-q', `${base}..HEAD`, '-o', patches], source);
console.log(`patches: ${readdirSync(patches).length} commits on ${base} (${run('git', ['rev-parse', '--short', base], source).trim()})`);

// the dev-review loader's host
process.stdout.write(run(process.execPath, [join(repo, 'dev-review', 'build-core.mjs'), '--source', source]));
console.log('synced');
