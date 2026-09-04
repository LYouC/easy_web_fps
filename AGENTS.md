# AGENTS.md — FPS Game Vibe Coding Guide

## Project Overview

A simple FPS game built with TypeScript + Vite + Three.js. See `plan.md` for full technical plan.

## Current Phase

**P1 — Player Movement** ✅ Complete

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| core/ | ✅ Done | Engine, EventBus, InputManager |
| scene/ | ✅ Done | SceneBase, SceneManager, MainArena |
| player/ | ✅ Done | FPSCamera, Movement, Player |
| weapons/ | ⏳ Pending | WeaponBase, Rifle, WeaponView |
| combat/ | ⏳ Pending | RaycastShooter, DamageSystem, CoverSystem |
| enemies/ | ⏳ Pending | EnemyBase, EnemyTypes, EnemyAI, WaveManager |
| pickups/ | ⏳ Pending | PickupBase, AmmoPickup, PickupSpawner |
| world/ | ✅ Done | ColliderManager |
| ui/ | ⏳ Pending | HUD, MainMenu, DeathScreen |
| audio/ | ⏳ Pending | AudioManager |
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
