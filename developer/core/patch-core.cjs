// One patch applied to one chunk's text. Shared by the loader and check.cjs so
// both judge a match the same way.
//
// A hook's `find` may be a list of patterns, tried in order (with `replace` a list of the same length, or one replace for all):
// the first pattern that matches the chunk is the one used. That lets a hook keep working across a release that
// reshapes its code, without a new hook: add the new shape as a further pattern.
'use strict';

const alternatives = (p) => {
  const finds = Array.isArray(p.find) ? p.find : [p.find];
  return finds.map((find, i) => ({ find, replace: Array.isArray(p.replace) ? p.replace[i] : p.replace }));
};

/** @returns {{ count: number, text: string }} count is how many times the first working pattern matched; text is patched only when
 *  count is 1. A pattern that matches but whose replacement changes nothing (a replace function that could not read what it needs
 *  returns the match as it was) does not work: it counts as no match, so a check can never report a hook that did nothing as applied. */
function applyPatch(p, text) {
  if (!text.includes(p.needle)) return { count: 0, text };
  for (const a of alternatives(p)) {
    const all = new RegExp(a.find.source, a.find.flags.replace('g', '') + 'g');
    const count = (text.match(all) || []).length;
    if (!count) continue;
    if (count > 1) return { count, text };
    const patched = text.replace(a.find, a.replace);
    if (patched === text) continue;
    return { count: 1, text: patched };
  }
  return { count: 0, text };
}

module.exports = { applyPatch };
