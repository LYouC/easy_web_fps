# AGENTS.md — FPS Game Vibe Coding Guide

## Project Overview

A simple FPS game built with TypeScript + Vite + Three.js. See `plan.md` for full technical plan.

## Current Phase

**P8 — Melee Loadout & Difficulty Expansion** ✅ Complete · **Post-P8 character model polish complete**

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| core/ | ✅ Done | Engine, EventBus, InputManager |
| scene/ | ✅ Done | SceneBase, SceneManager, MainArena |
| player/ | ✅ Done | FPSCamera, Movement, Player |
| weapons/ | ✅ Done | Rifle plus switchable tactical knife, centered RMB ADS, modular models, reload animation, shell ejection |
| combat/ | ✅ Done | RaycastShooter, DamageSystem, CoverSystem, layered hit effects |
| enemies/ | ✅ Done | Tactical range control, strafing, sight memory, suppression cover, detailed models and weapons |
| pickups/ | ✅ Done | Randomized map/drop ammo, PickupBase, AmmoPickup, PickupSpawner, spawn/amount rules |
| world/ | ✅ Done | ColliderManager, shared building sources, factory/scenic environment and dressing props |
| ui/ | ✅ Done | Combat HUD, player-relative enemy radar, and owned responsive menu screens |
| audio/ | ✅ Done | Rifle/enemy/pickup cues plus lifecycle-safe procedural ambience |
| config/ | ✅ Done | GameConfig and full Easy/Normal/Hard combat profiles |

## Architecture Rules

1. **EventBus communication only** — modules communicate via events, never import internals of other modules
2. **Event naming**: `module:action` (e.g. `player:shoot`, `enemy:died`, `wave:started`)
3. **No `any` types** — use proper TypeScript types throughout
4. **All magic numbers in GameConfig.ts** — no hardcoded gameplay values in logic code
5. **SceneBase interface** — all scenes implement the same interface for extensibility
6. **AABB collision** — all colliders are axis-aligned bounding boxes or spheres

## Agent Principles

1. **Proactive questioning on impactful decisions** — if an implementation detail significantly affects the final result, ask the user before proceeding
2. **Ask when uncertain** — if you don't fully understand what needs to be done, ask the user for clarification rather than guessing
3. **Dependency pragmatism** — prefer minimal dependencies; use short inline code when simple enough, use well-encapsulated external libraries when they provide clear value
4. **Warning handling** — attempt to resolve warnings, but weigh necessity vs. difficulty; don't require fixing all warnings

## Coding Conventions

- **Language**: TypeScript (strict mode)
- **Naming**: PascalCase for classes/interfaces/types, camelCase for methods/variables, UPPER_SNAKE for constants
- **Files**: One class per file, file name matches class name
- **Imports**: Use `@/` path alias for src root (configured in tsconfig)
- **No comments** unless explaining non-obvious logic
- **Three.js imports**: Import from `three` for core, `three/examples/jsm/...` for addons

## Session Workflow

Each vibe coding session should follow this pattern:

1. **Read this file** — understand current phase and constraints
2. **State the goal** — what specific task(s) this session will accomplish
3. **Limit scope** — only modify files in the relevant 1-2 modules
4. **Implement** — write code, verify with `npm run dev`
5. **Update this file** — mark completed tasks, update current phase, note any decisions

## Scope Control

- **Single session = 1-2 tasks within current phase**
- Do not jump ahead to future phases
- Do not modify modules unrelated to current task
- If a bug is found in a previous module, fix it but do not refactor

## Verification Commands

```bash
npm run dev        # Start dev server, verify visually
npm run build      # Type-check + build, no errors
```

## Known Issues

- Pointer lock re-acquisition after ESC may require two clicks (browser security cooldown)

## Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-03 | No physics engine | Gravity/collision hand-rolled, simpler to debug for this scope |
| 2026-09-03 | EventBus decoupling | Reduces context needed per module during vibe coding |
| 2026-09-03 | AABB collision | Sufficient for box buildings, easy to visualize |
| 2026-09-03 | HTML overlay HUD | Simpler than in-world UI for this project |
| 2026-09-04 | Custom FPSCamera (no PointerLockControls) | Less dependency, direct euler angle control |
| 2026-09-04 | performance.now() instead of THREE.Clock | Clock deprecated in Three.js 0.185+ |
| 2026-09-04 | Backquote key for debug toggle | F3 conflicts with browser find shortcut |
| 2026-09-04 | Pause overlay instead of start screen on ESC | Don't reset game state on pointer lock loss |
| 2026-09-04 | Rifle uses 30-round magazine + 90 reserve | Provides a complete reload loop before pickup implementation |
| 2026-09-04 | Procedural Web Audio rifle sound | Immediate shot feedback without adding asset dependencies |
| 2026-09-04 | Player collision uses a vertical cylinder profile | Keeps the configured eye height on box tops and prevents low camera/gun clipping |
| 2026-09-04 | Dual-layer hitscan tracers | A bright core plus additive glow gives readable shot direction without a persistent laser |
| 2026-09-04 | Jump force increased to 10.5 | Clears the 2m training box with frame-step margin while 3m boxes remain inaccessible |
| 2026-09-04 | DamageSystem is authoritative for HP and score settlement | Keeps weapon hits, enemy visuals, player damage, and wave progression decoupled through EventBus |
| 2026-09-04 | Enemy attacks use a two-stage cover pipeline | `enemy:attackRequested` is ray-tested against world AABBs before damage can reach the player |
| 2026-09-04 | AI world/player queries are EventBus requests | Enemy and combat modules receive transforms, ray hits, and area-clear results without direct cross-module references |
| 2026-09-04 | Deterministic enemy type slots per wave | Heavy begins on wave 2 and Elite on wave 3 while total count remains `3 + (wave - 1) * 2` |
| 2026-09-04 | Enemy simulation pauses with pointer lock | ESC pause freezes AI, attacks, and wave breaks without changing existing pause behavior |
| 2026-09-04 | Location reload is the combat-run reset boundary | Pause and death restart buttons rebuild every singleton, listener, scene object, score, wave, HP, and ammo state cleanly |
| 2026-09-04 | Enemy hit zones use configured multipliers | Head ×2, body ×1, and Heavy armor ×0.7 make aiming choices meaningful without changing rifle base damage |
| 2026-09-04 | First attack has a per-type reaction delay | Enemies enter a visible aim state after gaining an in-range line of sight; Normal/Heavy/Elite wait 0.65/1.1/0.35 seconds before firing |
| 2026-09-04 | Ammo pickup acceptance is a synchronous EventBus request | WeaponBase alone caps and grants reserve ammo; a full reserve rejects collection so the pickup is not wasted |
| 2026-09-04 | MapBuilder owns shared building source data | Each visible box, AABB, debug wireframe source, spawn point, and cover point derives from centralized world config |
| 2026-09-04 | Cover points use world-owned claims | One enemy owns a point at a time; death, timeout, attack readiness, and disposal release claims without module references |
| 2026-09-04 | Cover movement occupies post-shot downtime | Existing reaction and attack timing remain authoritative; bounded travel/hold/re-evaluation prevents cover search from stalling combat |
| 2026-09-04 | Ammo drops randomize quantity and placement | Map boxes grant 15–30 and enemy drops grant 10–25 in five-round steps; kill drops scatter within 1.6m through legal-position retries |
| 2026-09-04 | Enemy combat uses a preferred range band | Enemies advance at the edge of range, strafe while comfortable, retreat when crowded, and keep firing on the original cadence |
| 2026-09-04 | Cover is pressure-driven | Damage, low health, or two attacks without repositioning trigger bounded cover search; lost sight uses a 3.2-second last-known-position memory |
| 2026-09-04 | Enemy silhouettes include combat equipment | Legs, arms, waist gear, shoulder pads, backpack, and a visible rifle preserve typed hit zones while weapon meshes remain raycast-transparent |
| 2026-09-04 | Darkness and difficulty selection are deferred to P5 | Lighting is already a P5 polish item; Easy/Normal/Hard selection is now explicitly scheduled with the menu/state work |
| 2026-09-04 | GameStateManager is the sole menu/playing/paused/dead authority | Pointer Lock requests do not optimistically change state; only successful lock acquisition enters playing, while loss pauses |
| 2026-09-04 | Difficulty is an immutable per-run profile | Easy/Normal/Hard scale enemy pressure, wave opening size, and supply cadence without mutating GameConfig or changing type relationships |
| 2026-09-04 | SceneManager.clear defines the run reset boundary | Old MainArena listeners, entities, pickups, cover claims, timers, DOM, GPU resources, and audio graph are disposed before a new run is constructed |
| 2026-09-04 | Readability uses configured fill lighting and vertex color variation | Brighter ambient/hemisphere fill, tighter fog, face tones, and procedural ground variation retain shadows and atmosphere without assets/post-processing |
| 2026-09-04 | Ambient audio is a per-run procedural graph | Filtered noise plus a quiet low hum starts only after playing begins, fades with state, and is stopped/disconnected on unload |
| 2026-09-04 | The arena is an industrial processing yard | Tanks, stack, pipes, containers, machinery, gantry, signs, lane markings, and work lights establish a factory identity with procedural primitives only |
| 2026-09-04 | Factory gameplay solids share visual configuration and AABBs | Large props register deterministic colliders from the same position/size source; overhead details are explicitly decorative and raycast-transparent |
| 2026-09-04 | Collider debug starts hidden | The Backquote diagnostic remains available while the default presentation is clean enough for normal play |
| 2026-09-04 | Factory art direction is bright stylized low-poly | A supplied railway/coastal FPS reference informed the high-key sky, pastel concrete, simplified silhouettes, green backdrop, and teal/yellow accents without copying its UI or branding |
| 2026-09-04 | ScenicBackdrop owns non-gameplay set dressing | Distant hills, clustered trees, clouds, a coastal water plane, service railway, railcar, and catenary remain raycast-transparent and are disposed with MainArena |
| 2026-09-04 | ADS is a run-owned camera/weapon presentation system | RMB emits one typed aim state, smoothly narrows FOV to 45°, centers the sight, and resets on pause, death, or unload without changing shot damage/cadence |
| 2026-09-04 | Radar consumes transform events only | HUD projects typed player/enemy positions into player-local space and removes blips on death/dispose without holding enemy instances |
| 2026-09-04 | Hit feedback is a dedicated transient system | Configured cores, rings, and ballistic sparks freeze with gameplay and release every geometry/material on expiry or restart |
| 2026-09-04 | Small factory props are decorative | Barrels, pallets, cones, cable reel, and cabinets enrich composition while remaining raycast-transparent to avoid changing verified collision and cover behavior |
| 2026-09-05 | First-person rifle presentation is split into model, animation, and shell systems | Keeps metallic sci-fi geometry, moving reload parts, recoil/ADS poses, and bounded casing lifecycles independently maintainable behind `WeaponView` events |
| 2026-09-05 | ADS uses a raised open holographic window on the exact camera axis | The complete sight opening remains unobstructed by the receiver and centers the HUD crosshair geometrically |
| 2026-09-05 | Platform grounding uses contact tolerance and a circular footprint | Prevents tiny floating-point drift at a box top from entering the side-penetration branch and pushing the player off elevated surfaces |
| 2026-09-05 | Loadout uses 1/2 slots plus Q quick swap | The rifle retains its ammo/reload state while the tactical knife provides a permanent short-range fallback without bypassing EventBus combat settlement |
| 2026-09-05 | Difficulty profiles scale the complete pressure loop | Wave size/growth, HP, damage, fire interval, accuracy, reaction time, map supply timing, and enemy drop chance now form distinct Easy/Normal/Hard tiers while Normal remains the baseline |
| 2026-09-05 | Weapon changes use synchronized holster/draw transitions | A configured switch lockout matches both view animations so attacks cannot occur before the incoming weapon is ready |
| 2026-09-05 | Knife damage resolves at the visual strike frame | A reference-driven, upright single-edged tactical knife uses a lower forward grip; its left sharp edge leads the fixed upper-right to lower-left slash while a narrow straight child-node light streak follows the edge |
| 2026-09-05 | Knife edge is presented forward with lifted metallic values | A stronger negative yaw points the cutting edge primarily into view depth while preserving blade readability; brighter gunmetal, an emissive silver edge, and lower roughness keep the knife legible in shadow |

## P8 Verification

- `npm run build` and `npm run test:p4` through `npm run test:p8` — passed on 2026-09-05.
- GitHub Actions CI uses Node.js 22 with `npm ci`, `npm run build`, and the unified `npm test` command for main, pull requests, and version tags.
- Knife attacks resolve on the visible strike frame as range-bounded raycasts through the existing hit/damage/death/score pipeline and cannot pass through world geometry.
- Weapon holster/draw interpolation, attack lockout, three-stage knife motion, additive blade trail, enemy-only impact kick/ring/audio, and cleanup hooks are covered by P8 checks.
- Difficulty ordering is verified for enemy count growth, HP, damage, attack interval, accuracy/reaction, map pickup timing, and enemy ammo-drop chance.

## P8 Manual Test Steps

1. Start a run, press 2, and confirm the rifle lowers while the tactical knife draws smoothly; press 1 or Q and confirm the reverse transition with no instant pop and the previous rifle ammo intact.
2. Confirm the idle weapon is an upright wide-spine tactical knife with the handle below the blade, the point facing up, the bright sharp edge on the left, and sawback detail on the right. Hold LMB near an enemy and verify the left sharp edge leads the upper-right to lower-left travel, its narrow straight core/glow streak remains just outside that edge, and no semicircular trail appears.
3. Confirm damage resolves while the blade crosses the center of the slash, with filtered whoosh, knife kick, expanded particles, low impact thump, HUD shock ring, death, score, and wave settlement; repeat outside 2.35 m and behind cover to confirm no damage.
4. Switch to the knife while aiming and confirm ADS immediately releases; pause during a swing and confirm combat animation/timing freezes until resume.
5. Compare new runs: Easy uses 2 enemies +1/wave, 80% HP, 70% damage, 25% slower firing, and about 47% drops; Normal retains 3 +2/wave and original values; Hard uses 4 +3/wave, 125% HP, 120% damage, 22% faster firing, and about 19% drops.

## Post-P7 Weapon Presentation Verification

- `npm run build` — passed on 2026-09-05 (`tsc` strict + Vite production build).
- `npm run test:p4`, `npm run test:p5`, `npm run test:p6`, and `npm run test:p7` — passed with the existing gameplay, lifecycle, and presentation checks intact.
- Local automated weapon showcase confirmed readable gunmetal highlights, cyan energy accents, a visible staged magazine swap, bolt-rack finish, and bounded spinning brass ejection.
- Local ADS showcase confirmed the settled HUD crosshair is centered inside the complete open optic window; the platform contact scenario remained grounded without horizontal displacement for 300 simulated frames.
- Pointer Lock remained unavailable to automated browser input, so final in-game timing remains in the manual list.

## Post-P7 Weapon Presentation Manual Test Steps

1. Start a run and inspect hip fire and ADS; confirm the dark gunmetal receiver, brighter machined edges, cyan rails, optic, and angular armor remain readable against the bright yard.
2. Fire single shots and short bursts; confirm one brass casing exits the right-side port per shot, tumbles outward, falls, fades, and never blocks raycasts.
3. Spend at least one round and press R; confirm the rifle moves into view, the magazine drops out, a replacement inserts, and the side bolt cycles before ammo updates.
4. Pause during a reload or while casings are visible; confirm animation time freezes, then resumes without duplicate magazines or casings.
5. Repeat fire, reload, ADS, pause, and restart cycles; confirm one event response per action and no retained weapon meshes, materials, or casing objects.
6. Hold RMB until the ADS transition settles; confirm the crosshair sits in the geometric center of the unobstructed holographic window at multiple viewport sizes.
7. Jump onto the 2 m training box and other reachable raised solids, release movement, and confirm the player remains stationary instead of being pushed toward the nearest edge.

## P7 Verification

- `npm run build` — passed on 2026-09-04 (`tsc` strict + Vite production build).
- `npm run test:p4`, `npm run test:p5`, `npm run test:p6`, and `npm run test:p7` — passed; P7 checks ADS FOV/centering, radar orientation/clamping, positive effect timings, prop variety, and disposal hooks.
- Local browser inspection confirmed the responsive tactical menu after the added RMB instruction. The embedded browser rejected Pointer Lock as expected; its state remained safely in menu, so ADS/combat visual checks remain in the manual list.
- Non-blocking warning: the existing minified Three.js production chunk remains over 500 kB.

## P7 Manual Test Steps

1. Start a run, hold RMB, and confirm FOV smoothly narrows, the rifle sight moves to screen center, sway is reduced, and releasing RMB returns smoothly to hip view.
2. Aim, then press ESC or die; confirm FOV immediately returns to 75°, the aim event fires once, and resuming permits a fresh RMB aim without sticking.
3. Shoot the ground, buildings, and enemies; confirm a bright core, expanding ring, and short spark burst appears, with warm world impacts and red enemy impacts.
4. Pause while sparks or a ring are visible; confirm their lifetimes freeze. Restart repeatedly and confirm no old effects remain or duplicate.
5. Confirm the top-right radar keeps the player arrow fixed upward, places enemies according to view direction, rotates naturally while turning, removes dead enemies, and marks enemies beyond 48 m at the amber edge.
6. Inspect the yard props: paired barrels, stacked pallets, entrance cones, cable reel, and utility cabinets should add visual rhythm without blocking bullets, sight, movement, pickups, or central combat lanes.
7. At widths below 640 px, confirm the radar scales down without overlapping score/wave, crosshair, ammo, or health panels.
8. Repeat the three-cycle start → pause → resume → restart/death regression and confirm one radar blip per enemy, one aim transition, one hit burst, and no retained DOM, listeners, particles, or scene props.

## P6 Verification

- `npm run build` — passed on 2026-09-04.
- `npm run test:p4`, `npm run test:p5`, and `npm run test:p6` — passed; P6 checks model variety, unique IDs, map bounds, pickup clearance, scenery counts, railway/water configuration, markings, lighting, and signage.
- Local Vite factory panoramas — visually checked from the main yard and rail edge with no browser console warnings/errors; the result matches the reference's bright low-poly language while retaining the factory layout.
- Debug wireframes now default off and remain toggleable with Backquote.

## P6 Manual Test Steps

1. Start a run and inspect the yard from the center and perimeter; confirm tanks, pipe runs, chimney, containers, generator, crates, gantry, signs, lanes, and work lights form a coherent factory rather than isolated primitives.
2. Walk and shoot around every large factory prop; confirm tanks, chimney, containers, generator, and crates block movement and world attack rays at their configured AABBs.
3. Confirm overhead pipes, gantry members, signs, markings, fixtures, and poles do not unexpectedly block movement, enemy sight, or bullets.
4. Toggle Backquote and verify new factory collider wireframes cover only configured gameplay solids; toggle again for the clean default presentation.
5. Confirm all existing pickup points remain legal, enemy spawns avoid factory solids, and combat sightlines still provide open routes across the central processing lane.
6. Restart three times and verify no duplicated factory mesh, light, sign texture, or collider remains from the previous MainArena.
7. Inspect the perimeter and confirm low-poly hills, trees, cloud groups, railcar/catenary, and coastal water frame the arena without blocking combat rays or creating unreachable gameplay geometry.

## P5 Verification

- `npm run build` — passed on 2026-09-04 (`tsc` strict type-check + Vite production build).
- `npm run test:p4` — passed all P4 ammo, world parity, spawning, tactical AI, recoil, and enemy weapon checks.
- `npm run test:p5` — passed legal/illegal state transitions, Normal parity and Easy/Hard ordering, three listener attach/detach cycles, and three scene unload cycles.
- `git diff --check` — passed; only expected LF-to-CRLF working-copy notices.
- `rg -n "\bany\b" src scripts` — no matches.
- Local Vite visual smoke check — responsive menu rendered correctly, difficulty controls switched correctly, and no browser console errors occurred. The embedded browser intentionally rejected Pointer Lock and the state remained safely in menu.
- Non-blocking warning: the existing minified Three.js bundle remains over 500 kB.

## P5 Manual Test Steps

1. Load the page and confirm no wave starts behind the main menu; select Easy, Normal, and Hard in turn and verify only one threat card is selected before choosing the intended run.
2. Begin each difficulty and confirm successful Pointer Lock hides the menu, shows one HUD, resets HP/score/wave/ammo to 100/0/0/30+90, and starts wave 1 with 2/3/4 enemies for Easy/Normal/Hard.
3. Press ESC while moving, firing/reloading, an enemy is spawning/dying/moving to cover, a pickup is animating, and the wave break is counting down; confirm every world/combat timer freezes and the pause panel appears.
4. Click Resume once, then again if the browser cooldown rejects the first Pointer Lock request; confirm the state remains paused until lock succeeds and the simulation continues from the exact frozen state.
5. On Easy, confirm incoming damage/accuracy are lower, reactions are slower, map ammo arrives sooner, and enemy drops are more common while all enemy types still use their original relative cadence, speed, HP, and roles.
6. On Normal, confirm the P4 values remain exact: 3 + 2 per wave, type HP/speed/damage/accuracy/reaction/fire cadence, rifle 25 damage at 0.12s, 30/90 ammo, reload/recoil, and configured pickup quantities/caps.
7. On Hard, confirm wave 1 has four enemies, aim and reactions are sharper, damage pressure is higher but non-lethal per hit, map ammo is slower, and drops are less common.
8. Earn score, reach a later wave, die, and confirm the death screen shows the padded final score, reached wave, and selected difficulty; confirm ambience and gameplay stop.
9. Use Restart Run from both pause and death. Repeat start → pause → resume → restart at least three times and confirm exactly one HUD, shot sound, ambient bed, damage event, pickup response, and wave announcement per action.
10. After each restart, confirm no old enemies/pickups/tracers remain, cover destinations can be claimed normally, wave 1 restarts, and HP/ammo/score/AI memory/timers are fresh without a page reload.
11. Compare the arena to P4: verify building transforms, landing surfaces, side/underside collision, ray obstruction, cover points, and Backquote wireframes are unchanged while shadowed faces, enemy silhouettes, ground divisions, and ammo boxes are easier to read.
12. Confirm ambience is silent on the initial menu, fades in only after the start interaction and successful play state, fades out on pause/death, returns smoothly on resume, and never stacks after repeated restarts.

## P4 Verification

- `npm run build` — passed on 2026-09-04 (`tsc` strict type-check + Vite production build).
- `npm run test:p4` — passed randomized ammo ranges/steps, reserve cap/partial refill/full rejection, map bounds/spacing, building parity, spawn caps, tactical range/cover decisions, recoil bounds, and enemy weapon alignment.
- `git diff --check` — passed; only expected LF-to-CRLF working-copy notices.
- `rg -n "\bany\b" src scripts` — no `any` usage found.
- The five migrated building boxes preserve the exact P3 positions, dimensions, colors, collider IDs, AABBs, shadows, and material tuning.
- Non-blocking warning: the existing minified Three.js bundle remains over 500 kB.

## P4 Manual Test Steps

1. Start a run and wait ten active gameplay seconds; confirm a green/gold floating ammo box appears with a short spawn tone, then verify no more than five map pickups remain active.
2. Spend reserve ammo, approach several boxes, and confirm each rises/fades once, plays the collect cue, grants a configured random amount (map 15–30, enemy 10–25), and updates the HUD immediately; kill drops should scatter slightly around death positions.
3. Reach 150 reserve rounds with a full magazine and approach another box; confirm it remains available and ammo stays capped at 150.
4. Kill enemies repeatedly; confirm drops occur at the configured 35% rate, never inside buildings or overlapping nearby pickups, and total active pickups never exceed ten.
5. Toggle collision debug with Backquote and compare all five buildings; confirm every red wireframe exactly covers its visible box.
6. Repeat the P3 movement regression: land on the 2m box, collide with building sides/undersides, and confirm no camera or weapon clipping regression.
7. Shoot and receive enemy fire through/around each building; confirm hitscan and enemy attack rays remain blocked by the same AABBs as before migration.
8. Observe several enemies near buildings after they fire; confirm they choose player-occluded cover points, do not fully stack or rapidly switch points, and resume chase/aim/fire after cover hold or timeout.
9. Press ESC while a pickup spawn timer, collection animation, enemy cover movement, and wave break are in progress; confirm pickup and AI state freeze and resume without duplicate effects.
10. Die and use both restart paths; confirm a fresh wave 1 starts with 30/90 ammo, no old pickups/enemies, no retained cover claims, and no duplicate sounds or HUD updates.

## Post-P4 Combat Refinement Manual Test Steps

1. Fight an enemy inside roughly half its attack range; confirm it backs away while keeping aim rather than walking into the player.
2. Hold a medium engagement distance; confirm enemies alternate lateral strafing every 0.85–1.55 seconds and continue firing at their configured cadence.
3. Break line of sight after being detected; confirm the enemy searches the last seen position for up to 3.2 seconds, then returns idle if it cannot reacquire the player.
4. Damage an enemy or let it fire twice near a building; confirm it attempts a valid exclusive cover point, then returns to range control and attack.
5. Inspect all three enemy types; confirm visible legs, arms, waist/shoulder gear, backpack, rifle receiver, stock, magazine, and barrel, with tracers beginning at the barrel tip.
6. Fire the player rifle and confirm recoil is perceptibly stronger but still settles at the existing return speed.

## P5 Workload Assessment

**Complexity: high.** Expected scope is roughly 10–15 files across `core/`, `ui/`, `scene/`, `audio/`, `config/`, `main.ts`, and the HTML/CSS shell. The main risk is replacing page reloads and scattered overlay flags with a single state authority without leaking listeners or changing the verified P4 combat simulation.

Recommended delivery sequence:

1. State and difficulty foundation — add typed menu/playing/paused/dead transitions, Easy/Normal/Hard profiles, and EventBus state/difficulty events before changing presentation.
2. UI lifecycle — extract the start, pause, and death overlays into owned UI classes; make restart rebuild a clean run without relying on `window.location.reload()`.
3. Visual/audio polish — brighten combat readability, tune fog/lights/material variation, add subtle ambient audio, and keep all values in `GameConfig.ts`.
4. Final regression — verify every difficulty profile, complete start→play→pause→death→restart flows, listener/resource cleanup, P3/P4 combat invariants, production build, and smoke checks.

Defer optional asset pipelines, post-processing, additional weapons/maps, and save/progression systems unless explicitly added to P5 scope.

## P3 Verification

- `npm run build` — passed on 2026-09-04 (`tsc` + Vite production build).
- `git diff --check` — no whitespace errors; only expected LF-to-CRLF working-copy notices.
- `rg -n "\bany\b" src` — no `any` usage found.
- Node config smoke check — passed for wave counts 3/5/7/9 and positive damage across all three enemy types.
- Detail smoke check — passed for rifle hit-zone damage 25/50/17.5, three distinct positive reaction delays, and all pause/death UI controls.
- Non-blocking warnings: Vite config CJS/ESM forward-compatibility warning and a >500 kB Three.js bundle chunk warning.

## P3 Manual Test Steps

1. Start the game, lock the pointer, and confirm wave 1 announces three green Normal enemies.
2. Let enemies approach; confirm they chase, spread apart, stop in range, fire red tracers, and reduce the HUD HP value/bar.
3. Put a building directly between an attacking enemy and the player; confirm shots strike the cover and do not reduce HP.
4. Shoot enemies and confirm hit flash/health-bar feedback, death animation/audio, and score increments by 100/250/200 for Normal/Heavy/Elite.
5. Kill the full wave; confirm the completion notice, three-second break, next-wave announcement, and enemy count increasing by two.
6. Reach waves 2 and 3; confirm red Heavy and yellow angular Elite enemies have visibly different size/shape, durability, speed, range, and cadence.
7. Press ESC during combat and during the inter-wave break; confirm enemies and the break timer freeze, then resume without resetting player, ammo, score, or wave.
8. In the ESC overlay, confirm RESUME restores pointer lock and RESTART reloads a fresh run.
9. Compare body and head shots; confirm Normal dies to one headshot but needs two body shots, while Heavy front armor takes reduced damage.
10. Enter each enemy's attack range and confirm the enemy brightens while aiming before its first shot; break line of sight and re-enter to confirm the reaction delay resets.
11. Let HP reach zero; confirm the ELIMINATED overlay shows final score/wave and RESTART RUN starts from full HP, zero score, and wave 1.


## Post-P8 Character Model Polish

- User requested brick-toy-inspired human models and confirmed first-person view with a visible body and legs when looking down.
- Shared core/BlockCharacterModel is a procedural visual asset used by player and enemies; it holds no combat state or cross-module references. Rounded edges, tapered torsos, cylindrical faces, hip-pivot legs, hands, boots, vests, and equipment use four coordinated palettes.
- Normal wears green infantry equipment, Heavy has a broader red armored silhouette and visor/respirator, Elite wears a slim dark uniform with a yellow beret and radio. Head/body/armor tags remain authoritative for hits; rifles remain raycast-transparent.
- PlayerModel follows player:transformChanged, animates only during active simulation, excludes its complete hierarchy from attack raycasts, and disposes listeners, materials, and geometry with the run. First-person head/arms write neither color nor depth but retain shadows. Upper-body setback keeps the legs visible below the chest.
- Verification (2026-09-05): production build and P4-P8 suites passed. Local Vite scripts/character-preview.html visually checked the four models and first-person body; 11 runtime checks passed for enemy hit zones, geometry disposal, and player raycast exclusion.
- Manual follow-up: walk/run/jump and look straight down in-game; inspect ADS, knife/reload, pause/resume, and restart. Automated preview does not exercise browser Pointer Lock.
- Existing >500 kB production chunk warning remains non-blocking.


## v1.0.1 Release Refinements

- User completed in-game testing and added world/PerimeterFence with four boundary colliders; preserve the authored fence layout and appearance.
- P8 remains the final phase; character, perimeter, and delivery changes are refinements of existing work.
- CI verifies all main/PR/version-tag builds and uploads web-dist for 30 days. Version tags additionally publish a Release ZIP and deploy the same verified files to GitHub Pages. Manual workflow dispatch on main can redeploy without a new version.
- Vite base is relative for repository-subpath hosting and portable static archives. The developer-only character preview is excluded from production output.
- v1.0.1 local verification: npm run build and npm test passed on 2026-09-05. The existing Three.js chunk-size warning is non-blocking.
