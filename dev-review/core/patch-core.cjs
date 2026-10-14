// One patch applied to one chunk's text. Shared by the loader and check.cjs so
// both judge a match the same way.
'use strict';

/** @returns {{ count: number, text: string }} count is how many times `find` matched; text is patched only when count is 1. */
function applyPatch(p, text) {
  if (!text.includes(p.needle)) return { count: 0, text };
  const all = new RegExp(p.find.source, p.find.flags.replace('g', '') + 'g');
  const count = (text.match(all) || []).length;
  return { count, text: count === 1 ? text.replace(p.find, p.replace) : text };
}

module.exports = { applyPatch };
