// Brings the mod up to the current DFO build, in one command. It never leaves a half-done repo behind: a failure is
// written into a report file (UPDATE-REPORT.md, not committed), and says what to change next.
//
//   node tools/update-game.mjs [--source <daggerfall-js-source folder>] [--base origin/main] [--branch mod-api]
//                              [--game <DFO Online folder>] [--report <file>] [--install] [--skip-git]
//
// Steps:
//   1. fetch the game source's upstream; stop (nothing changed) if the source folder has uncommitted changes
//   2. rebase the Mod API commits (--branch, default mod-api) onto --base as <branch>-<short base>. An existing branch of
//      that name is renamed to <name>-old-<time>, never deleted. A conflict aborts the cherry-pick: the report lists the
//      files, and the rebase is then done by hand on the new branch (see docs/developers/maintaining.md)
//   3. sync: regenerate game-integration/patches and the developer core (tools/sync.mjs)
//   4. the loader self-check against the installed game (developer/check.cjs). Its report lists each hook that no longer
//      matches, with the code around its needle: that is what to write a new pattern from (developer/core/hooks.cjs)
//   5. the mod's own tests and build (npm test, npm run build)
//   6. --install, only when every step above passed: copy the modules into the player's Mods folder (tools/install.ps1)
//
// Exit codes: 0 all passed; 2 rebase conflicts; 3 self-check failed; 4 tests or build failed. The report is written every time.
// --skip-git runs steps 3-6 only (after you rebased by hand).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
const reportFile = resolve(arg('--report', join(repo, 'developer', 'UPDATE-REPORT.md')));
const checkFile = reportFile.replace(/\.md$/, '') + '.check.md';

const log = (msg) => console.log(`\n== ${msg}`);
const git = (args, cwd = source) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitTry = (args, cwd = source) => spawnSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const run = (cmd, args, cwd = repo, extraEnv = {}) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...extraEnv }, shell: process.platform === 'win32' && cmd === 'npm' });
  return r.status ?? 1;
};

const report = { started: new Date().toISOString(), lines: [], stages: [] };
const stage = (name, status, detail = '') => { report.stages.push({ name, status, detail }); console.log(`${status === 'ok' ? 'ok  ' : status === 'skipped' ? '-   ' : 'FAIL'} ${name}${detail ? ` - ${detail}` : ''}`); };
const finish = (code, next) => {
  const L = [
    '# Mod update report', '',
    `Run ${report.started}. Game folder \`${game}\`. Game source \`${source}\`, base \`${base}\`.`, '',
    '## Steps', '', '| Step | Result | Detail |', '| --- | --- | --- |',
    ...report.stages.map((s) => `| ${s.name} | ${s.status} | ${s.detail.replace(/\|/g, '/')} |`), '',
  ];
  if (report.conflicts) L.push('## Rebase conflicts (the rebase was aborted, nothing changed)', '', ...report.conflicts.map((f) => `- \`${f}\``), '');
  if (existsSync(checkFile)) { L.push('## Loader self-check', '', readFileSync(checkFile, 'utf8').replace(/^# /m, '### ')); }
  L.push('## What to do next', '', next || 'Nothing: the mod matches the game. Commit it when you like, and run with --install to update the player copy.', '');
  writeFileSync(reportFile, L.join('\n'));
  console.log(`\nReport: ${reportFile}`);
  process.exit(code);
};

if (!existsSync(join(source, 'src', 'systems', 'inputActions.js'))) { console.error(`no game source at ${source} (--source <folder>)`); process.exit(1); }
if (!existsSync(game)) { console.error(`no game folder at ${game} (--game <folder> or DFO_GAME)`); process.exit(1); }

if (!flag('--skip-git')) {
  log('1. fetch the game source upstream');
  git(['fetch', 'origin']);
  if (git(['status', '--porcelain'])) { console.error(`${source} has uncommitted changes: commit or stash them first (nothing was changed)`); process.exit(1); }
  stage('fetch and clean source', 'ok', `base ${base} at ${git(['rev-parse', '--short', base])}`);

  const short = git(['rev-parse', '--short', base]);
  const target = `${branch}-${short}`;
  const commits = git(['rev-list', '--reverse', `${base}..${branch}`]).split('\n').filter(Boolean);
  if (!commits.length) finish(2, `No commits of \`${branch}\` beyond \`${base}\`: check the branch name (--branch).`);

  log(`2. rebase ${commits.length} Mod API commit(s) onto ${base} as ${target}`);
  if (gitTry(['rev-parse', '--verify', '-q', target]).status === 0) {
    const old = `${target}-old-${Date.now()}`;
    git(['branch', '-m', target, old]);
    console.log(`existing ${target} kept as ${old}`);
  }
  git(['checkout', '-q', '-b', target, base]);
  const pick = gitTry(['cherry-pick', ...commits]);
  if (pick.status !== 0) {
    report.conflicts = git(['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
    gitTry(['cherry-pick', '--abort']);
    git(['checkout', '-q', branch]);
    stage('rebase onto base', 'FAIL', `${report.conflicts.length} conflicting file(s), aborted`);
    finish(2, `Resolve the conflicts by hand: \`git -C "${source}" checkout ${target}\`, then \`git cherry-pick ${commits.join(' ')}\`, fix the files,\n` +
      `then \`git cherry-pick --continue\`. Most conflicts are moved paths and additive import lines. Then run this script with --skip-git.`);
  }
  stage('rebase onto base', 'ok', `${commits.length} commit(s) on ${target}`);
} else {
  stage('rebase onto base', 'skipped', '--skip-git');
}

log('3. sync the patches and the developer core from the game source');
if (run(process.execPath, [join(repo, 'tools', 'sync.mjs'), '--source', source, '--base', base]) !== 0) {
  stage('sync patches and core', 'FAIL');
  finish(1, 'tools/sync.mjs failed: read its output above.');
}
stage('sync patches and core', 'ok');

log('4. self-check the loader against the installed game');
const check = run(join(game, 'DFO Online.exe'), [join(repo, 'developer', 'check.cjs')], repo, { ELECTRON_RUN_AS_NODE: '1', DFO_REPORT: checkFile, DFO_GAME: game });
if (check !== 0) {
  stage('loader self-check', 'FAIL', 'see the hooks below');
  finish(3, `Each hook listed under "Hooks that need a new pattern" no longer matches the game. For each, find the same\n` +
    `behaviour in the code shown, and write its new \`find\` pattern in developer/core/hooks.cjs (a list of patterns is tried in\n` +
    `order, so the old one can stay first). Then run: \`node tools/update-game.mjs --skip-git\`.`);
}
stage('loader self-check', 'ok');

log('5. the mod\'s tests and build');
if (run('npm', ['test']) !== 0) { stage('npm test', 'FAIL'); finish(4, 'npm test failed: read its output above, fix the failing test, then --skip-git.'); }
stage('npm test', 'ok');
if (run('npm', ['run', 'build']) !== 0) { stage('npm run build', 'FAIL'); finish(4, 'npm run build failed: read its output above.'); }
stage('npm run build', 'ok');

if (flag('--install')) {
  log('6. install the modules into the Mods folder');
  if (run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(repo, 'tools', 'install.ps1')]) !== 0) { stage('install', 'FAIL'); finish(1, 'tools/install.ps1 failed.'); }
  stage('install', 'ok');
}

finish(0);
