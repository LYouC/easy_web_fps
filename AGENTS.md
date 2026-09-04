# AGENTS.md — FPS Game Vibe Coding Guide

## Project Overview

A simple FPS game built with TypeScript + Vite + Three.js. See `plan.md` for full technical plan.

## Current Phase

**P4 — Pickups & World** ✅ Complete · **Next: P5 — Polish**

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| core/ | ✅ Done | Engine, EventBus, InputManager |
| scene/ | ✅ Done | SceneBase, SceneManager, MainArena |
| player/ | ✅ Done | FPSCamera, Movement, Player |
| weapons/ | ✅ Done | WeaponBase, Rifle, WeaponView |
| combat/ | ✅ Done | RaycastShooter, DamageSystem, CoverSystem |
| enemies/ | ✅ Done | Tactical range control, strafing, sight memory, suppression cover, detailed models and weapons |
| pickups/ | ✅ Done | Randomized map/drop ammo, PickupBase, AmmoPickup, PickupSpawner, spawn/amount rules |
| world/ | ✅ Done | ColliderManager, MapBuilder, BuildingTemplates, spawn/cover queries |
| ui/ | 🚧 Partial | Combat HUD plus pause/death restart overlays done; main menu polish pending P5 |
| audio/ | 🚧 Partial | Rifle, enemy combat, and pickup cues done; ambient cues pending P5 |
| config/ | ✅ Done | GameConfig |

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
