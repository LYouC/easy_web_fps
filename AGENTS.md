# AGENTS.md — FPS Game Vibe Coding Guide

## Project Overview

A simple FPS game built with TypeScript + Vite + Three.js. See `plan.md` for full technical plan.

## Current Phase

**P3 — Enemies** ✅ Complete · **Next: P4 — Pickups & World**

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| core/ | ✅ Done | Engine, EventBus, InputManager |
| scene/ | ✅ Done | SceneBase, SceneManager, MainArena |
| player/ | ✅ Done | FPSCamera, Movement, Player |
| weapons/ | ✅ Done | WeaponBase, Rifle, WeaponView |
| combat/ | ✅ Done | RaycastShooter, DamageSystem, CoverSystem |
| enemies/ | ✅ Done | EnemyBase, EnemyTypes, EnemyAI, WaveManager |
| pickups/ | ⏳ Pending | PickupBase, AmmoPickup, PickupSpawner |
| world/ | 🚧 Partial | ColliderManager done; MapBuilder and BuildingTemplates pending P4 |
| ui/ | 🚧 Partial | Combat HUD plus pause/death restart overlays done; main menu polish pending P5 |
| audio/ | 🚧 Partial | Rifle and enemy combat cues done; pickup/ambient cues pending |
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

## P4 Workload Assessment

**Complexity: medium-high.** Expected scope is roughly 8-12 files across `pickups/`, `world/`, `enemies/`, `weapons/`, `audio/`, `config/`, and `MainArena`, with the largest risks in preserving existing collision behavior and making enemy cover selection stable.

Recommended delivery sequence:

1. Pickup loop — `PickupBase`, `AmmoPickup`, `PickupSpawner`, reserve-ammo event integration, kill drops, map spawns, and pickup feedback.
2. World extraction — move arena geometry out of `MainArena` into `BuildingTemplates` and `MapBuilder` while preserving every registered AABB and traversal surface.
3. Cover behavior and integration — expose cover points through EventBus, update EnemyAI selection/re-evaluation, add pickup audio, then run build and gameplay regression checks.

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
