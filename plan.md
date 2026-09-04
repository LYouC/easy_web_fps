# FPS Game - Technical Plan

## Project Goal

Build a simple FPS game with Three.js: wave-based enemy spawning, ammo pickup, scoring, basic UI, and debug collision visualization.

## Tech Stack

- **Language**: TypeScript
- **Build**: Vite
- **3D**: Three.js
- **Controls**: PointerLockControls (three/examples)
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

**Verify**: Can move around on ground, jump, run. Collision boxes visible via F3.

---

### P2 — Shooting

**Goal**: Can shoot with rifle, muzzle flash, recoil, ammo system.

**Tasks**:
- [ ] WeaponBase.ts — ammo, fire rate, damage, recoil params
- [ ] Rifle.ts — rifle stats
- [ ] WeaponView.ts — weapon model (box geometry), muzzle flash (sprite/light), recoil animation
- [ ] RaycastShooter.ts — ray from camera center, hit detection
- [ ] HUD.ts — crosshair, ammo count display
- [ ] AudioManager.ts — shoot sound (Web Audio)

**Verify**: Click to shoot, see muzzle flash + recoil, ammo decreases, crosshair + ammo shown.

---

### P3 — Enemies

**Goal**: Enemies spawn in waves, chase player, shoot, can be killed.

**Tasks**:
- [ ] EnemyBase.ts — HP, type, mesh, state (idle/chase/attack/dead)
- [ ] EnemyTypes.ts — Normal (low HP, fast), Heavy (high HP, slow), Elite (medium, accurate)
- [ ] EnemyAI.ts — chase player, stop & shoot when in range, simple cover seeking
- [ ] CoverSystem.ts — raycast from enemy to player, if blocked = in cover
- [ ] DamageSystem.ts — apply damage, kill detection, emit enemy:died
- [ ] WaveManager.ts — wave N spawns N*2+1 enemies, short break between waves
- [ ] HUD update — HP bar, score, wave number

**Verify**: Enemies spawn, chase, shoot (damage player), player can kill them, waves progress.

---

### P4 — Pickups & World

**Goal**: Ammo pickups on map + kill drops, buildings for cover.

**Tasks**:
- [ ] PickupBase.ts + AmmoPickup.ts — floating ammo box, proximity pickup
- [ ] PickupSpawner.ts — random map positions, spawn on interval + on enemy:died
- [ ] MapBuilder.ts — place buildings (boxes with textures), register colliders
- [ ] BuildingTemplates.ts — wall, low wall, pillar, room configs
- [ ] EnemyAI update — use buildings as cover points
- [ ] AudioManager — hit sound, pickup sound, enemy death sound

**Verify**: Buildings provide cover, ammo boxes appear on map, enemies drop ammo, can pick up.

---

### P5 — Polish

**Goal**: Complete game loop with menus, death screen, visual polish.

**Tasks**:
- [ ] MainMenu.ts — start button, basic title
- [ ] DeathScreen.ts — final score, restart button
- [ ] GameState machine — menu → playing → dead → menu
- [ ] Visual polish — fog, ambient lighting, better textures
- [ ] GameConfig.ts — all magic numbers extracted
- [ ] Final HUD polish — wave announcement, damage flash

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
