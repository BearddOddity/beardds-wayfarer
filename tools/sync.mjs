// Refreshes the two things this repository takes FROM THE GAME SOURCE - the Mod API, which the game owns:
//   game-integration/patches/   the Mod API branch as patches on the upstream main it was cut from (git format-patch)
//   dev-review/core/            the loader's page host, rebuilt from the game's own Mod API (dev-review/build-core.mjs)
//
// The mod itself (source/ -> Mods/) is this repository's own: `npm test`, `npm run build`. It needs no game source and no sync,
// so it is updated with no game release - before or after the Mod API is merged. Run this only when the API changes.
//
//   node tools/sync.mjs [--source <daggerfall-js-source folder>] [--base <upstream ref, default origin/main>]
//
// Commit the source branch first: the patches are made from its commits, never from uncommitted work.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; };
const source = resolve(arg('--source', join(repo, '..', 'daggerfall-js-source')));
const base = arg('--base', 'origin/main');
const run = (cmd, args, cwd = repo) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });

if (!existsSync(join(source, 'src', 'mods', 'modApi.js'))) throw new Error(`no game source with the Mod API at ${source} (--source <folder>)`);
if (run('git', ['status', '--porcelain'], source).trim()) throw new Error(`${source} has uncommitted changes: commit them first`);

// the game integration: the branch as patches (none, once upstream holds it all)
const patches = join(repo, 'game-integration', 'patches');
rmSync(patches, { recursive: true, force: true });
mkdirSync(patches, { recursive: true });
run('git', ['format-patch', '-q', `${base}..HEAD`, '-o', patches], source);
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], source).trim();
console.log(`patches: ${readdirSync(patches).length} commit(s) of ${branch} on ${base} (${run('git', ['rev-parse', '--short', base], source).trim()})`);

// the dev-review loader's host
process.stdout.write(run(process.execPath, [join(repo, 'dev-review', 'build-core.mjs'), '--source', source]));
console.log('synced');
