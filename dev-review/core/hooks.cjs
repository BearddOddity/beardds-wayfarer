// THE HOOK CATALOG, keyed by the Mod API's EVENT NAMES: every place the loader reaches into the released game, each a text
// patch applied in memory as the game's code is served (the game's files are never changed). A module's `events` (its
// module.json) are the hooks the loader puts in; the game's own Mod API announces the same events natively, at the same
// seams, so a module cannot tell which host it is on.
//
// Two kinds of patch:
//   - EVENT hooks (questMark, quests, drawFx, mapPick and their parts) add a call onto the bus (`dfo.emit(event, ...)`,
//     core/core.js), or hand the core something to read (the world probe's extras, the map sheets' destination methods);
//     the game's own logic is unchanged.
//   - QUEST-GUIDANCE hooks (questMark:person, :dealt, :dealtPeople, :seek, :seekMap) DO change what the game's quest
//     guidance marks: they bring the game source's own fixes in the Mod API patch (game-integration/) (ui/questLens.js personSiteOf,
//     systems/questGuidance.js personDealtWith, ui/questMarks.js `seek`) to the released client. All are optional.
//
// `optional: true`: where a release moves it, the hook is skipped and no module is switched off (it costs its extra only).
// `event`: a patch that is one of several for one event names it; the event is hooked only when all its required parts are in.
//
// Anchors use property names and string shapes, which survive the minifier, rather than variable names, which change every
// build. `needle` is a cheap substring a chunk must hold before the regex is tried.
'use strict';

module.exports = {
  // ui/enhancedHud.js drawQuestMark(quest, playerXZ, heading01): every HUD frame, in every scene, the point the game's own
  // compass marks for the tracked quest (null when it marks none), where the player stands and which way they face; the mark is
  // pointed where a module asked (dfo.retarget) and coloured as one asked (dfo.markColour), as the game source's own.
  // Event: questMark(questXZ|null, playerXZ|null, heading01)
  questMark: {
    needle: '.questMark){',
    find: /function (\w+)\((\w+),(\w+),(\w+)\)\{if\(!(\w+)\.questMark\)\{/,
    replace: 'function $1($2,$3,$4){$2=globalThis.dfo?.retarget($2)??$2;globalThis.dfo?.emit("questMark",$2,$3,$4);globalThis.dfo?.tint?.($5.questMark);if(!$5.questMark){',
  },
  // systems/questGuidance.js questCompassPick: the Exact tier's mark keeps its height, as a third number (the compass reads the
  // first two), so a module knows which floor of a many-floored dungeon the mark is on. Event: questMark's questXZ[2]
  'questMark:height': {
    event: 'questMark',
    needle: '.at[0],',
    find: /return (\w+)\?\[\1\.at\[0\],\1\.at\[2\]\]:null\}/,
    replace: 'return $1?[$1.at[0],$1.at[2],$1.at[1]]:null}',
  },
  // THE QUEST'S TOWN ON THE REGION MAP (the player: "the region map should highlight the town/city" - the player finds it and sets a
  // waypoint there; the compass waits until they have). The game source's own (ui/questLens.js entryTarget's `seek`, ui/questMarks.js
  // questMapMarks): the town a quest's entry names but the player's map does not hold yet is handed beside `find`, and the region
  // map marks the TRACKED quest's. Two patches, both OPTIONAL: where a release moves them the map marks only the towns it holds, as
  // before, and no module is turned off. Event: questMark (a module that follows the quest is helped to find its town)
  'questMark:seek': {
    event: 'questMark',
    optional: true,
    needle: 'find:',
    find: /locationName:(\w+)\?(\w+)\.locationName:null,([^]*?)here:(\w+),find:(\w+)===!0&&!(\w+)\?\{regionIndex:\2\.regionIndex\?\?0,regionName:\2\.regionName\?\?"",locationName:\2\.locationName\}:null\}/,
    replace: (m, named, site, mid, here, onMap) => `${m.slice(0, -1)},...(${named}&&${onMap}!==!0&&!${here}?{seek:{regionIndex:${site}.regionIndex??0,regionName:${site}.regionName??"",locationName:${site}.locationName}}:{})}`,
  },
  // ui/questLens.js entryTarget: an entry that names no place but says where a PERSON stands (their `__` building, `___` town -
  // "The Ransom": "_kidnapper_ ... awaits me in __kidnapper_ in ___kidnapper_") points at that person's place, as the game source's
  // own personSiteOf (the core's personSite, over the lens's own readers: its resources, its quiet roll, its macro reader and table).
  // OPTIONAL: where a release moves it such an entry points nowhere, as before. Event: questMark (the Town tier's building, the map)
  'questMark:person': {
    event: 'questMark',
    optional: true,
    needle: '.assignedPlaceSymbol)continue;',
    find: /const (\w+)=(\w+)\?null:(\w+)\((\w+)\);\1&&\(\2=\1\);const (\w+)=\2\?\.siteDetails\?\?null;if\(!\5\?\.locationName\)return null;const (\w+)=(\w+)\(\4,\2\.symbol\?\.name\)/,
    replace: (m, moved, place, movedOf, msg, site, said, saidOf, offset, whole) => {
      const res = new RegExp(`function ${movedOf}\\(\\w+\\)\\{let \\w+=null;for\\(const \\w+ of (\\w+)\\(\\w+,(\\w+)\\)\\?\\?\\[\\]\\)`).exec(whole);
      const macros = new RegExp(`function ${saidOf}\\(\\w+,\\w+\\)\\{[^}]*?\\.type>=(\\w+)\\.NameMacro1`).exec(whole);
      if (!res || !macros) return m;
      return `const ${moved}=${place}?null:${movedOf}(${msg});${moved}&&(${place}=${moved});const __dfoP=${place}?null:globalThis.dfo?.personSite?.(${msg},(x)=>${res[1]}(x,${res[2]}),(x,y)=>${saidOf}(x,y),${macros[1]});__dfoP&&(${place}=__dfoP.place);const ${site}=${place}?.siteDetails??null;if(!${site}?.locationName)return null;const ${said}=__dfoP?.said??${saidOf}(${msg},${place}.symbol?.name)`;
    },
  },
  // systems/questGuidance.js dungeonQuestMarks: the Exact tier's marks - A PERSON DEALT WITH MARKS NOTHING (the player, in "The
  // Ransom": the waypoint "should disappear after speaking with the agent"): one the quest's clicks wait on, all of whose tasks have
  // fired - the game source's own personDealtWith (the core's dealtWith). Two patches, the stands' and the people's; both OPTIONAL:
  // where a release moves them such a person stays marked, as before. Event: questMark
  'questMark:dealt': {
    event: 'questMark',
    optional: true,
    needle: '.isHidden===!0||',
    find: /if\(!(\w+)\|\|!(\w+)\.active\|\|\2\.dead\|\|\1\.isHidden===!0\|\|(\w+)\(\2\.behaviour\)\)continue;/,
    replace: 'if(!$1||!$2.active||$2.dead||$1.isHidden===!0||$3($2.behaviour)||globalThis.dfo?.dealtWith?.($1))continue;',
  },
  'questMark:dealtPeople': {
    event: 'questMark',
    optional: true,
    needle: '.isDestroyed===!0||',
    find: /!(\w+)\|\|(\w+)\.active===!1\|\|\1\.isHidden===!0\|\|\1\.isDestroyed===!0\|\|(\w+)\((\w+)\)\|\|/,
    replace: '!$1||$2.active===!1||$1.isHidden===!0||$1.isDestroyed===!0||$3($4)||globalThis.dfo?.dealtWith?.($1)||',
  },
  'questMark:seekMap': {
    event: 'questMark',
    optional: true,
    needle: '.target?.find;',
    find: /function (\w+)\((\w+),(\w+),(\w+)\)\{const (\w+)=new Map;for\(const (\w+) of \2\?\?\[\]\)\{const (\w+)=\6\?\.target\?\.find;if\(!\7\)continue;/,
    replace: (m, fn, views, tracked, pixelOf, byPixel, v, find) => `function ${fn}(${views},${tracked},${pixelOf}){const ${byPixel}=new Map;for(const ${v} of ${views}??[]){const ${find}=${v}?.target?.find??(${v}?.id!=null&&${v}.id===${tracked}?${v}?.target?.seek:null);if(!${find})continue;`,
  },
  // scenes/hostMagic.js drawFx(): the world pass's effects door, called by every host's shared magic engine right after its
  // billboards, under the renderer's own camera. The renderer's variable is read off the function's own first guard.
  // The engine's collider is the first argument of the same engine's burst-clear door (`clear:(a,b)=>burstClear(collider,a,b)`), read
  // off that line; with none found the event still goes, with no world probe (a module falls back to what it can do without).
  // Event: drawFx(renderer, world)
  drawFx: {
    needle: 'drawFx(){',
    find: /drawFx\(\)\{(const \w+=\w+\.draw\(\);if\(!\w+\.live\|\|\w+\|\|!(\w+)\?\.gl\|\|!\2\._proj)/,
    replace: (m, body, renderer, offset, whole) => {
      const c = /clear:\(\w+,\w+\)=>\w+\((\w+),\w+,\w+\)/.exec(whole)?.[1];
      return `drawFx(){globalThis.dfo?.emit("drawFx",${renderer},${c ? `globalThis.dfo.world(${c})` : 'undefined'});${body}`;
    },
  },
  // scenes/dungeonContext.js: the dungeon's automap record (its walked trail, the teleporters and drops taken), handed to the core
  // for the world probe's known() - the way between floors. OPTIONAL: where a release moves it the trail keeps its floor-only way,
  // and no module is turned off. Event: drawFx (world.known())
  'drawFx:known': {
    event: 'drawFx',
    optional: true,
    needle: 'automapRecord:()=>',
    find: /\},automapRecord:\(\)=>(\w+),openSheetPage\(/,
    replace: '},automapRecord:(globalThis.dfo?.knownRec?.(()=>$1),()=>$1),openSheetPage(',
  },
  // scenes/world.js, THE OPEN WORLD: the region map's waypoints the player follows (systems/mapWaypoints.js), where each lies in
  // the open world's frame, and the terrain's height (heightAt) - the released game's magic collider answers rays alone, and its
  // rays miss the terrain, so without it the trail lies at the player's own height and sinks into every hill ahead. Read off the
  // Overworld's followed-distance function (its store's shown list, its followed test, its map-to-native conversion, the streaming
  // world), its right-click's ground pick (the terrain) and the scene's mode switch; registered once, beside that function, and
  // answering outdoors alone. OPTIONAL: where a release moves it the waypoints are not led to and the floor is taken as level, and
  // no module is turned off. Event: drawFx (world.waypoints(), world.floor())
  'drawFx:outdoors': {
    event: 'drawFx',
    optional: true,
    needle: '.worldCoords(',
    find: /function \w+\(\)\{const \w+=(\w+)\.worldCoords\(\w+\.pos\),\w+=\{\};for\(const (\w+) of (\w+)\(\)\)\{if\(!(\w+)\(\2\.id\)\)continue;const \w+=(\w+)\(\2\.mx,\2\.my\);/,
    replace: (m, state, _w, shown, followed, toNative, offset, whole) => {
      const modes = /\((\w+)\?\.mode\?\?"exterior"\)==="exterior"/.exec(whole)?.[1];
      if (!modes) return m;
      const ground = /\w+\(\w+\.eye,\w+,\((\w+),(\w+)\)=>(\w+)\(\1,\2\)\);if\(!\w+\.point\)/.exec(whole)?.[3];
      const terrain = ground ? `globalThis.dfo?.terrain?.((x,z)=>(${modes}?.mode??"exterior")!=="exterior"?NaN:${ground}(x,z));` : '';
      return `${terrain}globalThis.dfo?.bayWays?.(()=>(${modes}?.mode??"exterior")!=="exterior"?null:${shown}().filter(w=>${followed}(w.id)).map(w=>{const n=${toNative}(w.mx,w.my),l=${state}.localFromWorld(n.x,n.z);return Object.freeze({id:w.id,name:w.name,x:l[0],z:l[1]})}));${m}`;
    },
  },
  // ui/questLens.js QuestLens.look(): after each quest tick, the game's own view of every active quest (title, where, latest
  // entry, time left). Event: quests(views[])
  quests: {
    needle: 'events:',
    find: /\{quests:(\w+),events:(\w+)\}/,
    replace: '(globalThis.dfo?.emit("quests",$1),{quests:$1,events:$2})',
  },

  // EVENT mapPick(sheet, dxMetres, dzMetres, quest) - a right click on the local map sets a destination. The game's own source
  // (the Mod API patch) does this in ui/heldMap.js _destinationContext and the sheets' destinationAt; the released game has neither, so
  // four patches give it the same: each sheet gets the destination methods (built by the core, over the sheet's own closures, read
  // off its code), the map window's right press asks the core when the sheet does not take it, and the window's paint asks the core
  // to stand the flag. A patch that is one of several for an event names it in `event`; the event is hooked only when all are in.
  mapPick: {
    // ui/townSheet.js: the street plan. Its view is the variable its hoverLabel tests first; its player, field and quest rings
    // are the functions its homeView, field getter and `quests` member name.
    needle: 'context(){return!1},homeView(',
    find: /context\(\)\{return!1\},homeView\((\w+)\)\{return (\w+)\(\1,(\w+)\(\)\)\},get field\(\)\{return (\w+)\(\)\},get plan\(\)\{return \4\(\),(\w+)\},names:(\w+),quests:(\w+),/,
    replace: (m, d, fit, player, field, plan, names, quests, offset, whole) => {
      const view = /hoverLabel\(\w+,\w+\)\{if\((\w+)\)\{for\(const (\w+) of \w+\(\)\)\{const\[\w+,\w+\]=\w+\(\1,\2\.x,\2\.y\)/.exec(whole)?.[1];
      if (!view) return m;   // no view to read: the street plan is left as it was (the hook is reported as not applied by its count)
      return `context(){return!1},...(globalThis.dfo?.townDest?.({view:()=>${view},player:()=>${player}(),field:()=>${field}(),quests:()=>${quests}()})??{}),homeView(${d}){return ${fit}(${d},${player}())},get field(){return ${field}()},get plan(){return ${field}(),${plan}},names:${names},quests:${quests},`;
    },
  },
  'mapPick:dungeon': {
    // ui/automapSheet.js: a dungeon's plan. Its view and its solid switch are read off planAt; its player (in plan units, on
    // this floor) and its way out (entranceHere, once found) off the overlay's `player:` and `entrance:` members.
    event: 'mapPick',
    needle: 'context(){return!1},homeView(',
    find: /context\(\)\{return!1\},(homeView\((\w+)\)\{const (\w+)=(\w+)\(\),(\w+)=)/,
    replace: (m, rest, k, a, playerHere, p, offset, whole) => {
      const pa = /planAt\((\w+),(\w+)\)\{return (\w+)&&(\w+)\?\w+\(\1,\2,\4,\w+\(\)\):null\}/.exec(whole);
      const ent = new RegExp(`player:${playerHere}\\(\\),entrance:(\\w+)\\(\\)`).exec(whole);
      if (!pa || !ent) return m;
      return `context(){return!1},...(globalThis.dfo?.planDest?.({view:()=>${pa[4]},solid:()=>${pa[3]},player:()=>${playerHere}(),entrance:()=>${ent[1]}()})??{}),${rest}`;
    },
  },
  'mapPick:note': {
    // ui/automapSheet.js mark(): the dungeon map's own pin (the middle click) - a new note named is a place to follow, its name
    // cleared takes it away. The note's world position, the player's feet and the way out (once found) go to the core.
    event: 'mapPick',
    needle: '.askText(',
    find: /return (\w+)\.askText\((\w+)\.notes\.get\((\w+)\)\?\.note\?\?"",(\w+)=>\{\4==null\?(\w+)&&\2\.notes\.delete\(\3\):String\(\4\)\.trim\(\)\?(\w+)\(\2,\3,\4\):\2\.notes\.delete\(\3\),/,
    replace: 'return $1.askText($2.notes.get($3)?.note??"",$4=>{$4==null?$5&&$2.notes.delete($3):String($4).trim()?($6($2,$3,$4),$5&&globalThis.dfo?.notePin?.($3,$2.notes.get($3)?.position,$1.player?.()?.feet,$2.entranceDiscovered?$1.startMarker:null)):($2.notes.delete($3),globalThis.dfo?.notePin?.($3,null)),',
  },
  'mapPick:press': {
    // ui/heldMap.js: the window's right press - the sheet's own arm first (the bay's waypoint menu), then the core's
    event: 'mapPick',
    needle: '.button===2&&(',
    find: /(\w+)\.button===2&&\(\1\.preventDefault\?\.\(\),this\._sheet\?\.context\(\1\.clientX,\1\.clientY\)\)/,
    replace: '$1.button===2&&($1.preventDefault?.(),this._sheet?.context($1.clientX,$1.clientY)||globalThis.dfo?.mapContext?.(this,$1.clientX,$1.clientY))',
  },
  'mapPick:paint': {
    // ui/heldMap.js: the window's paint - the flag over the sheet's own overlay
    event: 'mapPick',
    needle: '.paintOverlay(',
    find: /(\w+)\.paintOverlay\((\w+),(\w+)\),this\._bandShown/,
    replace: '$1.paintOverlay($2,$3),globalThis.dfo?.paintDest?.(this,$1,$2,$3),this._bandShown',
  },
};
