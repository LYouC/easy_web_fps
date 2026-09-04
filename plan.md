# FPS Game - Technical Plan

## Project Goal

Build a simple FPS game with Three.js: wave-based enemy spawning, ammo pickup, scoring, basic UI, and debug collision visualization.

## Tech Stack

- **Language**: TypeScript
- **Build**: Vite
- **3D**: Three.js
- **Controls**: Custom pointer-lock FPS camera
- **Physics**: Custom simple collision (AABB + ground detection), no physics engine
- **No external game framework**

## Requirements Summary

| Item | Detail |
|------|--------|
| Weapon | Single rifle, muzzle flash, recoil animation |
| Enemy | 2-3 types (normal/heavy/elite), ray-based shooting, cover obstruction |
| Spawning | Wave-based, increasing difficulty |
| Ammo | Map random spawn + enemy kill drop |
| Death | HP reaches 0 |
| Score | Pure kill count (different types = different points) |
| Scene | Simple textured box buildings, single scene, extensible to multi-scene |
| Collision | AABB/sphere, debug visualization toggle (hotkey) |
| HUD | Crosshair, HP bar, ammo count, score, wave number |
| Movement | Walk, run (shift), jump, gravity |

## Module Architecture

```
src/
├── core/                   # Engine layer
│   ├── Engine.ts           # Game loop, init, resize, delta time
│   ├── EventBus.ts         # Decoupled module communication
│   ├── InputManager.ts     # Keyboard + mouse input abstraction
│   └── Debug.ts            # Collision box visualization, hotkey toggle
│
├── scene/                  # Scene management (extensible)
│   ├── SceneBase.ts        # Base scene interface
│   ├── SceneManager.ts     # Scene switching
│   └── scenes/
│       └── MainArena.ts    # The single arena scene
│
├── player/                 # Player layer
│   ├── Player.ts           # Player orchestrator (HP, state)
│   ├── FPSCamera.ts        # PointerLock + view rotation
│   └── Movement.ts         # WASD + run + jump + gravity + ground detection
│
├── weapons/                # Weapon layer
│   ├── WeaponBase.ts       # Base class (ammo, fire rate, damage, recoil)
│   ├── Rifle.ts            # Rifle implementation
│   └── WeaponView.ts       # First-person weapon model + muzzle flash + animation
│
├── combat/                 # Combat layer
│   ├── RaycastShooter.ts   # Ray-based shooting (player & enemy)
│   ├── DamageSystem.ts     # Damage calculation, kill detection
│   └── CoverSystem.ts      # Ray obstruction check (enemy shot blocked by cover)
│
├── enemies/                # Enemy layer
│   ├── EnemyBase.ts        # Base class (HP, type, state)
│   ├── EnemyTypes.ts       # Normal / Heavy / Elite definitions
│   ├── EnemyAI.ts          # Simple AI: chase + shoot + take cover
│   └── WaveManager.ts      # Wave spawning logic, difficulty scaling
│
├── pickups/                # Pickup layer
│   ├── PickupBase.ts       # Base pickup class
│   ├── AmmoPickup.ts       # Ammo box (map spawn + kill drop)
│   └── PickupSpawner.ts    # Random map spawn + drop on kill
│
├── world/                  # World layer
│   ├── MapBuilder.ts       # Build arena from box primitives + textures
│   ├── ColliderManager.ts  # AABB collision registry + query
│   └── BuildingTemplates.ts # Reusable building configs
│
├── ui/                     # HUD layer (HTML overlay)
│   ├── HUD.ts              # Crosshair, HP bar, ammo, score, wave
│   ├── MainMenu.ts         # Start screen
│   └── DeathScreen.ts      # Game over + score display + restart
│
├── audio/                  # Audio layer
│   └── AudioManager.ts     # Shoot, hit, pickup, ambient sounds
│
└── config/                 # Game config
    └── GameConfig.ts       # All tunable constants (speeds, HP, damage, etc.)
```

### Module Communication

Modules communicate via `EventBus` — no direct cross-module imports of internals.

Key events:
- `player:shoot` → combat handles ray
- `player:hit` → player takes damage
- `enemy:died` → wave manager + pickup spawner + score
- `enemy:shoot` → cover check → player:hit if not blocked
- `pickup:collected` → ammo refill
- `wave:started` / `wave:completed` → UI update
- `game:over` → death screen

## Phased Development Plan

### P0 — Skeleton (Engine + Scene)

**Goal**: A running Three.js app with render loop and empty scene.

**Tasks**:
- [x] Vite + TS project setup
- [x] Engine.ts — init renderer, camera, scene, resize, game loop with delta time
- [x] EventBus.ts — on/off/emit
- [x] InputManager.ts — keyboard + mouse state tracking
- [x] SceneBase interface + SceneManager
- [x] Basic HTML shell with canvas

**Verify**: Black screen with Three.js rendering, no errors in console.

---

### P1 — Player Movement

**Goal**: First-person walk/run/jump in a flat ground with simple collision.

**Tasks**:
- [x] FPSCamera.ts — PointerLockControls, mouse look
- [x] Movement.ts — WASD walk, Shift run, Space jump, gravity, ground detection
- [x] Player.ts — HP, state (alive/dead)
- [x] Ground plane (flat box, textured)
- [x] ColliderManager.ts — AABB collision for ground + walls
- [x] Debug.ts — wireframe collision box visualization, Backquote toggle

**Verify**: Can move around on ground, jump onto the 2m training box, run, and view collision boxes via Backquote.

---

### P2 — Shooting

**Goal**: Can shoot with rifle, muzzle flash, recoil, ammo system.

**Tasks**:
- [x] WeaponBase.ts — ammo, fire rate, damage, recoil params
- [x] Rifle.ts — rifle stats
- [x] WeaponView.ts — weapon model (box geometry), muzzle flash (sprite/light), recoil animation
- [x] RaycastShooter.ts — ray from camera center, hit detection
- [x] HUD.ts — crosshair, ammo count display
- [x] AudioManager.ts — shoot sound (Web Audio)

**Verify**: Click to shoot, see muzzle flash + recoil, ammo decreases, crosshair + ammo shown.

**Implementation notes**:
- Rifle uses a 30-round magazine with 90 rounds in reserve and a 2-second reload.
- Hitscan feedback includes a dual-layer gold/white tracer and a short surface impact flash.
- The shooting HUD includes a reactive crosshair, ammo state, reload state, and low-ammo styling.
- Rifle and dry-fire sounds are synthesized with Web Audio, so no external audio assets are required.

---

### P3 — Enemies

**Goal**: Enemies spawn in waves, chase player, shoot, can be killed.

**Tasks**:
- [x] EnemyBase.ts — HP, type, mesh, state (spawning/idle/chase/attack/dead)
- [x] EnemyTypes.ts — Normal (low HP, fast), Heavy (high HP, slow), Elite (medium, accurate)
- [x] EnemyAI.ts — chase player, stop and shoot in range, line of sight, obstacle steering, separation
- [x] CoverSystem.ts — raycast from enemy to player; world AABB obstruction blocks damage
- [x] DamageSystem.ts — apply damage, kill detection, score settlement, player damage events
- [x] WaveManager.ts — wave N spawns N*2+1 enemies, short break between waves
- [x] HUD update — HP bar, score, wave number, damage flash, wave announcements

**Verify**: Enemies spawn, chase, shoot (damage player), player can kill them, waves progress.

**Implementation notes**:
- Normal, Heavy, and Elite definitions read all combat, movement, geometry, feedback, and audio tuning from `GameConfig.ts`.
- Enemy state transitions require range and unobstructed line of sight; chase steering slides around AABBs and applies neighbor separation to prevent full overlap.
- In-range enemies enter a visible aim state before their first shot. Reaction delays are 0.65s Normal, 1.1s Heavy, and 0.35s Elite, and reset after range or line of sight is lost.
- Enemy meshes expose head, body, and armor hit zones. Configured ×2/×1/×0.7 multipliers are applied by DamageSystem before HP settlement.
- Enemy fire follows `enemy:attackRequested` → `combat:enemyAttackResolved` → `player:damageRequested`, keeping cover and damage resolution independent.
- Player transforms and world collision queries use EventBus request events, so enemy/combat modules do not hold player or collider-module references.
- Wave 1 contains 3 enemies and each wave adds 2. Heavy slots begin in wave 2 and Elite slots in wave 3; a cleared wave advances after a 3-second break.
- Enemy spawn scaling, hit emissive flash/health bar, attack tracer/muzzle light, death collapse, and synthesized Web Audio cues provide feedback without new dependencies.
- HUD retains the P2 teal glass-panel language and adds HP, score, wave, damage vignette, and incoming/complete notices.
- ESC opens a pause overlay with Resume and Restart controls. Player death exits pointer lock and opens an Eliminated overlay with final score, reached wave, and a full-run restart action.
- AI and wave timers pause while pointer lock is released or the player is dead.

**Automated verification (2026-09-04)**:
- `npm run build`: passed (`tsc` strict type-check and Vite production bundle).
- `git diff --check`: passed with only LF-to-CRLF working-copy notices.
- Source scan found no `any` types.
- Node config smoke check passed for wave counts 3/5/7/9 and positive Normal/Heavy/Elite damage values.
- Detail smoke check passed for body/head/armor damage 25/50/17.5, distinct positive reaction delays, and required pause/death overlay controls.
- Known non-blocking warnings: Vite config module-format forward-compatibility and the existing Three.js bundle chunk exceeding 500 kB.

**Manual verification steps**:
1. Lock the pointer and verify wave 1 announces and spawns three green Normal enemies.
2. Observe chase, spacing, attack cadence, red attack tracers, and HUD HP loss.
3. Break line of sight with each test building and verify enemy rays hit cover without player damage.
4. Kill each enemy type and verify health/hit/death feedback plus scores of 100, 250, and 200.
5. Clear waves and verify the 3-second completion break, +2 enemies per wave, Heavy in wave 2, and Elite in wave 3.
6. Pause with ESC during combat and a wave break; verify simulation timers freeze and state resumes intact.
7. Use both pause-overlay buttons: Resume must restore pointer lock and Restart must return to a fresh wave-1 run.
8. Verify hit-zone damage: Normal takes 25 body damage, 50 head damage, and Heavy armor takes 17.5 damage from the 25-damage rifle.
9. Verify Normal/Heavy/Elite wait approximately 0.65/1.1/0.35 seconds after first gaining an in-range clear sightline, then use their configured 1.5/2.5/1.0-second firing intervals.
10. Die after earning score; verify the Eliminated overlay reports the current score/wave and its restart button resets HP, ammo, score, enemies, and wave state.

---

### P4 — Pickups & World

**Goal**: Ammo pickups on map + kill drops, buildings for cover.

**Tasks**:
- [ ] PickupBase.ts + AmmoPickup.ts — floating ammo box, proximity pickup
- [ ] PickupSpawner.ts — random map positions, spawn on interval + on enemy:died
- [ ] MapBuilder.ts — place buildings (boxes with textures), register colliders
- [ ] BuildingTemplates.ts — wall, low wall, pillar, room configs
- [ ] EnemyAI update — use buildings as cover points
- [ ] AudioManager — pickup collection sound (enemy hit/death cues completed in P3)

**Verify**: Buildings provide cover, ammo boxes appear on map, enemies drop ammo, can pick up.

**Workload assessment**:
- Complexity: medium-high; approximately 8-12 touched files and three cohesive implementation slices.
- Pickup slice: create the pickup classes/spawner and an EventBus reserve-ammo grant path, including timed map spawns, enemy kill drops, proximity collection, cleanup, and clear feedback.
- World slice: extract the current arena boxes from `MainArena` into reusable templates/builder output without changing player grounding, collision, ray obstruction, or debug visualization.
- AI slice: publish cover points through EventBus and add bounded cover selection/re-evaluation without regressing reaction delays, separation, pause behavior, or wave progression.
- Primary risks: pickups spawning inside geometry, duplicate EventBus listeners after reset, enemies oscillating between cover points, and collider/render meshes becoming inconsistent during extraction.
- Recommended execution: three focused sessions following the project scope rule, then one end-to-end manual pass.

---

### P5 — Polish

**Goal**: Complete game loop with menus, death screen, visual polish.

**Tasks**:
- [ ] MainMenu.ts — start button, basic title
- [x] Death UI — final score, reached wave, and restart button (implemented during P3; optional class extraction remains)
- [ ] GameState machine — menu → playing → dead → menu
- [ ] Visual polish — fog, ambient lighting, better textures
- [ ] GameConfig.ts — all magic numbers extracted
- [x] Final HUD polish — wave announcement and damage flash

**Verify**: Full game loop: start → play → die → see score → restart.

---

## Enemy Types

| Type | HP | Speed | Damage | Fire Rate | Points | Color |
|------|-----|-------|--------|-----------|--------|-------|
| Normal | 30 | 3 | 8 | 1.5s | 100 | Green |
| Heavy | 80 | 1.5 | 15 | 2.5s | 250 | Red |
| Elite | 50 | 2.5 | 12 | 1.0s | 200 | Yellow |

## Key Design Decisions

1. **No physics engine** — gravity/collision are hand-rolled, simpler to debug
2. **EventBus decoupling** — modules never import each other's internals
3. **SceneBase interface** — current single scene, but architecture supports adding more
4. **AABB collision** — good enough for box buildings, easy to visualize
5. **Ray-based combat** — both player and enemy use raycasting, cover = ray obstruction
6. **HTML overlay HUD** — simpler than in-world UI, easier to style
7. **GameConfig constants** — all tunables in one place for easy balancing
