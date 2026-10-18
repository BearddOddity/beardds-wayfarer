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
    find: /function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+)\)\{if\(!([\w$]+)\.questMark\)\{/,
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
    find: /locationName:(\w+)\?(\w+)\.locationName:null,([^]*?)here:(\w+),find:(\w+)===!0&&!(\w+)\?\{regionIndex:\2\.regionIndex\?\?0,regionName:\2\.regionName\?\?(?:""|``),locationName:\2\.locationName\}:null\}/,
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
    find: /function ([\w$]+)\(([\w$]+),([\w$]+),([\w$]+)\)\{(?:const|let) ([\w$]+)=new Map;for\((?:const|let) ([\w$]+) of \2\?\?\[\]\)\{(?:const|let) ([\w$]+)=\6\?\.target\?\.find;if\(!\7\)continue;/,
    replace: (m, fn, views, tracked, pixelOf, byPixel, v, find) => `function ${fn}(${views},${tracked},${pixelOf}){const ${byPixel}=new Map;for(const ${v} of ${views}??[]){const ${find}=${v}?.target?.find??(${v}?.id!=null&&${v}.id===${tracked}?${v}?.target?.seek:null);if(!${find})continue;`,
  },
  // scenes/hostMagic.js drawFx(): the world pass's effects door, called by every host's shared magic engine right after its
  // billboards, under the renderer's own camera. The renderer's variable is read off the function's own first guard.
  // The engine's collider is the first argument of the same engine's burst-clear door (`clear:(a,b)=>burstClear(collider,a,b)`), read
  // off that line; with none found the event still goes, with no world probe (a module falls back to what it can do without).
  // Event: drawFx(renderer, world)
  drawFx: {
    needle: 'drawFx(){',
    find: /drawFx\(\)\{((?:const|let) \w+=\w+\.draw\(\);if\(!\w+\.live\|\|\w+\|\|!(\w+)\?\.gl\|\|!\2\._proj)/,
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
    // the distances to the followed region-map waypoints, one per waypoint (the same function in both builds); the minifier writes
    // let/const and `$` in names from 0.1.9404 on, so the identifiers are classes, not \w
    find: /function ([\w$]+)\(\)\{(?:const|let) ([\w$]+)=([\w$]+)\.worldCoords\([\w$]+\.pos\),([\w$]+)=\{\};for\((?:const|let) ([\w$]+) of ([\w$]+)\(\)\)\{if\(!([\w$]+)\(\5\.id\)\)continue;(?:const|let) ([\w$]+)=([\w$]+)\(\5\.mx,\5\.my\);/,
    replace: (m, fn, _v, state, _res, _n, shown, followed, _r, toNative, offset, whole) => {
      // the mode and the ground are read from the code NEAREST this function: a chunk holds many functions that check the mode, and
      // the first one is another object's (0.1.9409's first check was not the world's)
      const nearest = (re, pick) => { let best = null, bd = Infinity; for (const mm of whole.matchAll(re)) { const d = Math.abs(mm.index - offset); if (d < bd) { bd = d; best = pick(mm); } } return best; };
      const modes = nearest(/\(([\w$]+)\?\.mode\?\?[`"]exterior[`"]\)[!=]==[`"]exterior[`"]/g, (mm) => mm[1]);
      if (!modes) return m;
      const ground = nearest(/[\w$]+\([\w$]+\.eye,[\w$]+,\(([\w$]+),([\w$]+)\)=>([\w$]+)\(\1,\2\)\);if\(![\w$]+\.point\)/g, (mm) => mm[3]);
      const terrain = ground ? `globalThis.dfo?.terrain?.((x,z)=>(${modes}?.mode??"exterior")!=="exterior"?NaN:${ground}(x,z));` : '';
      return `${terrain}globalThis.dfo?.bayWays?.(()=>{const md=(${modes}?.mode??"exterior");globalThis.dfo?.modeSeen?.(md);return md!=="exterior"?null:${shown}().filter(w=>${followed}(w.id)).map(w=>{const n=${toNative}(w.mx,w.my),l=${state}.localFromWorld(n.x,n.z);return Object.freeze({id:w.id,name:w.name,x:l[0],z:l[1]})})});${m}`;
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
      const view = /hoverLabel\(\w+,\w+\)\{if\((\w+)\)\{for\((?:const|let) (\w+) of \w+\(\)\)\{(?:const|let)\[\w+,\w+\]=\w+\(\1,\2\.x,\2\.y\)/.exec(whole)?.[1];
      if (!view) return m;   // no view to read: the street plan is left as it was (the hook is reported as not applied by its count)
      return `context(){return!1},...(globalThis.dfo?.townDest?.({view:()=>${view},player:()=>${player}(),field:()=>${field}(),quests:()=>${quests}()})??{}),homeView(${d}){return ${fit}(${d},${player}())},get field(){return ${field}()},get plan(){return ${field}(),${plan}},names:${names},quests:${quests},`;
    },
  },
  'mapPick:dungeon': {
    // ui/automapSheet.js: a dungeon's plan. Its view and its solid switch are read off planAt; its player (in plan units, on
    // this floor) and its way out (entranceHere, once found) off the overlay's `player:` and `entrance:` members.
    event: 'mapPick',
    needle: 'context(){return!1},homeView(',
    find: /context\(\)\{return!1\},(homeView\((\w+)\)\{(?:const|let) (\w+)=(\w+)\(\),(\w+)=)/,
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
    find: /return (\w+)\.askText\((\w+)\.notes\.get\((\w+)\)\?\.note\?\?(?:"",|``,)(\w+)=>\{\4==null\?(\w+)&&\2\.notes\.delete\(\3\):String\(\4\)\.trim\(\)\?([\w$]+)\(\2,\3,\4\):\2\.notes\.delete\(\3\),/,
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

  'drawFx:spellRow': {
    // spellEffects: the effect's row (the spellmaker lists it)
    event: 'drawFx', optional: true,
    needle: 'Shared Cartography',
    find: /\[46,255,`Shared Cartography`,``,\[(\w+)\]\]/,
    replace: (m, duration) => `${m},[47,255,\`Clairvoyance\`,\`\`,[${duration}]]`,
  },
  'drawFx:spellText': {
    // spellEffects: the words the spellmaker shows for the effect
    event: 'drawFx', optional: true,
    needle: '`46,255`,Object.freeze([`Shared Cartography`',
    find: /\[`46,255`,Object\.freeze\(\[`Shared Cartography`,/,
    replace: (m) => `[\`47,255\`,Object.freeze([\`Clairvoyance\`,\`While it lasts, a thread of light is drawn along\`,\`the road to the place you seek, as your map has\`,\`marked it. By BearddOddity (Beardd's Wayfarer).\`])],${m}`,
  },
  'drawFx:spellList': {
    // spellEffects: the effects a spell may carry (type,subtype tokens)
    event: 'drawFx', optional: true,
    needle: '.46,255.30,255.31,255.',
    find: /\.46,255\.30,255\.31,255\./,
    replace: '.46,255.47,255.30,255.31,255.',
  },
  'drawFx:spellSelf': {
    // mysticism: the effects that are cast on oneself
    event: 'drawFx', optional: true,
    needle: '.44,255.46,255`.split(',
    find: /\.44,255\.46,255`\.split\(`\.`\)\)/,
    replace: '.44,255.46,255.47,255`.split(`.`))',
  },
  'drawFx:spellKind': {
    // mysticism: the kind an active effect takes (type,subtype -> kind)
    event: 'drawFx', optional: true,
    needle: '"46,255":`sharedCartography`}',
    find: /"46,255":`sharedCartography`\}/,
    replace: '"46,255":`sharedCartography`,"47,255":`clairvoyance`}',
  },
  'drawFx:spellMessage': {
    // mysticism: the line shown while the effect lasts
    event: 'drawFx', optional: true,
    needle: 'sharedCartography:()=>',
    find: /sharedCartography:\(\)=>`Your map is shared with your party\.`\}/,
    replace: 'sharedCartography:()=>`Your map is shared with your party.`,clairvoyance:()=>`The way is drawn before your eyes.`}',
  },
  'drawFx:spellCost': {
    // spellcast: what the effect costs (the same as Shared Cartography's: a Mysticism effect with a duration)
    event: 'drawFx', optional: true,
    needle: '"46,255":',
    find: /"46,255":([\w$]+)\(([\w$.]+),\{duration:([\w$]+)\(8,8\)\}\),/,
    replace: (m, q, skill, k) => `${m}"47,255":${q}(${skill},{duration:${k}(8,8)}),`,
  },
  'drawFx:spellTown': {
    // worldTick: the effects that need no target
    event: 'drawFx', optional: true,
    needle: '`44,255`,`46,255`])',
    find: /`44,255`,`46,255`\]\)/,
    replace: '`44,255`,`46,255`,`47,255`])',
  },
  'drawFx:spellMade': {
    // arenaGate: the premade spell (as Shared Cartography's), kept for the shop below
    event: 'drawFx', optional: true,
    needle: 'name:`Shared Cartography`',
    find: /function ([\w$]+)\(\)\{return ([\w$]+)\(\{slots:\[\{type:46,subType:255,settings:\{\.\.\.([\w$]+)\}\}\],rangeType:0,element:4,name:`Shared Cartography`,icon:21,index:([\w$]+)\}\)\}/,
    replace: (m, f, make, settings) => `${m}globalThis.dfoClairvoyance=()=>${make}({slots:[{type:47,subType:255,settings:{...${settings}}}],rangeType:0,element:4,name:\`Clairvoyance\`,icon:21,index:-47001});`,
  },
  'drawFx:spellShop': {
    // arenaGate: the Mages Guild spell shop offers it beside Shared Cartography
    event: 'drawFx', optional: true,
    needle: 'guildServiceSpellbook',
    find: /\.\.\.([\w$]+)\(\)\?\[([\w$]+)\(\),([\w$]+)\(\)\]:\[\]/,
    replace: (m, d, a, b) => `...${d}()?[${a}(),${b}(),...(globalThis.dfoClairvoyance?[globalThis.dfoClairvoyance()]:[])]:[]`,
  },
  'drawFx:spellIconBox': {
    // worldTick: the spell icon for the hotbar, the quickslot and the drag ghost (`{ src, w, h }` for an image). Icon 200 is the
    // Clairvoyance sprite the module hands over (`globalThis.dfoSpellIcon.image(box)`); every other icon is the game's own.
    event: 'drawFx', optional: true,
    needle: 'spellicon${',
    find: /(function ([\w$]+)\(([\w$]+),\{box:([\w$]+),dpr:[\w$]+=[\w$]+\(\),onReady:[\w$]+=null\}=\{\}\)\{)(let [\w$]+=[\w$]+\(\3\);return [\w$]+\?[\w$]+\(`spellicon)/,
    replace: (m, head, fn, icon, box, rest) => `${head}if(${icon}===200&&globalThis.dfoSpellIcon)return globalThis.dfoSpellIcon.image(${box});${rest}`,
  },
  'drawFx:spellIconFrame': {
    // worldTick: the spell icon as a frame of pixels, for the classic windows (the same sprite, in the same way)
    event: 'drawFx', optional: true,
    needle: '`ICON00I0.IMG`,',
    find: /(function ([\w$]+)\(([\w$]+)\)\{)(let ([\w$]+)=([\w$]+)\(\3\|0\);return \5\?([\w$]+)\(`ICON00I0\.IMG`,\5,2\):null\})/,
    replace: (m, head, fn, icon, rest) => `${head}if((${icon}|0)===200&&globalThis.dfoSpellIcon)return globalThis.dfoSpellIcon.frame;${rest}`,
  },
  'drawFx:spellCaster': {
    // deepWaterRuntime: the spell controller (readySpell, recastSpell, ...) hangs on `globalThis.dfoCaster`, with the player's entity
    // beside it, so the clairvoyance module can give the player its spell once (as the game's vampirism and lycanthropy give theirs)
    event: 'drawFx', optional: true,
    needle: 'recastSpell(){return!',
    find: /return\{readySpell:([\w$]+),recastSpell\(\)\{return!([\w$]+)\|\|([\w$]+)\|\|([\w$]+)\(\)\?!1:([\w$]+)\(([\w$]+)\)\?/,
    replace: (m, ready, a, b, c, hasBook, entity) => `return globalThis.dfoCaster={playerEntity:()=>${entity},readySpell:${ready},recastSpell(){return!${a}||${b}||${c}()?!1:${hasBook}(${entity})?`,
  },
  'drawFx:spellPanel': {
    // enhancedSpellbook: the spell's detail view gives the module a place to add its own settings under the effects
    // (`globalThis.dfoSpellPanel(spell, detailElement, redraw)`), drawn each time the view is built
    event: 'drawFx', optional: true,
    needle: '`sb-acts`',
    find: /\}let ([\w$]+)=([\w$]+)\(`div`,`sb-acts`\),([\w$]+)=\2\(`button`,`act primary`,`Ready`\)/,
    replace: (m, acts, el, ready, offset, whole) => {
      const sel = /let ([\w$]+)=([\w$]+)\[([\w$]+)\],([\w$]+)=([\w$]+)\(`div`,`px-qdetail`\)/.exec(whole);
      const draw = /function ([\w$]+)\(\)\{if\(!([\w$]+)\)return;\2\.innerHTML=``/.exec(whole);
      if (!sel || !draw) return m;
      return `}globalThis.dfoSpellPanel?.(${sel[1]}.spell,${sel[4]},${draw[1]});${m.slice(1)}`;
    },
  },
};
