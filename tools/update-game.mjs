// Brings the mod up to the current DFO build, in one command:
//
//   node tools/update-game.mjs [--source <daggerfall-js-source folder>] [--base origin/main] [--branch mod-api]
//                              [--game <DFO Online folder>] [--install] [--skip-git]
//
// Steps (each stops the run on failure, and says what to do next):
//   1. fetch the game source's upstream and check the source folder is clean
//   2. rebase the Mod API commits (--branch, default mod-api) onto --base, on a new branch mod-api-<short base>
//      (a conflict aborts the cherry-pick and lists the files: those need a hand, see docs/developers/maintaining.md)
//   3. sync: regenerate game-integration/patches and the dev-review core (tools/sync.mjs)
//   4. self-check: every loader hook must match the installed game (dev-review/check.cjs). A FAIL names the hook:
//      its regex in dev-review/core/hooks.cjs is the one to adjust. Optional hooks may say "no match" and still pass.
//   5. the mod's own tests and build (npm test, npm run build)
//   6. --install: copy the built modules into the player's Mods folder (tools/install.ps1)
//
// --skip-git runs only steps 3-6 (use it on a source branch you already rebased by hand).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const source = resolve(arg('--source', join(repo, '..', 'daggerfall-js-source')));
const base = arg('--base', 'origin/main');
const branch = arg('--branch', 'mod-api');
const game = resolve(arg('--game', process.env.DFO_GAME || join(repo, '..', 'Daggerfall Online')));

const log = (msg) => console.log(`\n== ${msg}`);
const fail = (msg, code = 1) => { console.error(`\nSTOP: ${msg}`); process.exit(code); };
const git = (args, cwd = source) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const gitTry = (args, cwd = source) => spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const run = (cmd, args, cwd = repo, env = process.env) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env, shell: process.platform === 'win32' && cmd === 'npm' });
  return r.status ?? 1;
};

if (!existsSync(join(source, 'src', 'systems', 'inputActions.js'))) fail(`no game source at ${source} (--source <folder>)`);
if (!existsSync(game)) fail(`no game folder at ${game} (--game <folder> or DFO_GAME)`);

if (!flag('--skip-git')) {
  log('1. fetch the game source upstream');
  git(['fetch', 'origin']);
  if (git(['status', '--porcelain'])) fail(`${source} has uncommitted changes: commit or stash them first`);

  const short = git(['rev-parse', '--short', base]);
  const target = `${branch}-${short}`;
  const commits = git(['rev-list', '--reverse', `${base}..${branch}`]).split('\n').filter(Boolean);
  if (!commits.length) fail(`no commits of ${branch} beyond ${base}: nothing to rebase`);
  console.log(`${commits.length} Mod API commit(s) of ${branch} onto ${base} (${short}) as ${target}`);

  log(`2. rebase onto ${base} as ${target}`);
  if (gitTry(['rev-parse', '--verify', '-q', target]).status === 0) {
    fail(`branch ${target} exists already. Delete it (git branch -D ${target}) or pass --branch <other name>.`);
  }
  git(['checkout', '-q', '-b', target, base]);
  const pick = gitTry(['cherry-pick', ...commits]);
  if (pick.status !== 0) {
    const conflicts = git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
    gitTry(['cherry-pick', '--abort']);
    git(['checkout', '-q', branch]);
    fail(`cherry-pick conflicts in ${conflicts.length} file(s); aborted, back on ${branch}:\n  ${conflicts.join('\n  ')}\n` +
      `Most are moved paths (the game source moved files into folders) and additive import lines. Resolve them on ${target}`
      + ` by hand, commit, then rerun with --skip-git after moving the mod's test paths if needed.`, 2);
  }
  console.log(`cherry-picked cleanly on ${target}`);
}

log('3. sync the patches and the dev-review core from the game source');
if (run(process.execPath, [join(repo, 'tools', 'sync.mjs'), '--source', source, '--base', base]) !== 0) fail('sync failed');

log('4. self-check the loader against the installed game');
const check = spawnSync(join(game, 'DFO Online.exe'), [join(repo, 'dev-review', 'check.cjs')], {
  cwd: repo, encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
});
const out = (check.stdout || '') + (check.stderr || '');
process.stdout.write(out);
if (check.status !== 0) {
  const bad = out.split('\n').filter((l) => /^FAIL/.test(l));
  fail(`the self-check failed (${bad.length} FAIL line(s)). Each FAIL names a hook: adjust its regex in dev-review/core/hooks.cjs\n` +
    `(read the minified chunk with the game's own Electron, see docs/developers/maintaining.md), then rerun with --skip-git.`, 3);
}

log('5. the mod\'s tests and build');
if (run('npm', ['test']) !== 0) fail('npm test failed');
if (run('npm', ['run', 'build']) !== 0) fail('npm run build failed');

if (flag('--install')) {
  log('6. install the modules into the Mods folder');
  if (run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(repo, 'tools', 'install.ps1')]) !== 0) fail('install failed');
}

console.log('\nDone. The mod matches the game at ' + game + '.');
console.log('Still to decide: the version and CHANGELOG entry, and whether to commit.');
