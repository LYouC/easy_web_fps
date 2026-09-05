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
| Weapon | Modular sci-fi rifle, ADS optic, muzzle flash, recoil/reload animation, shell ejection |
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
│   ├── RifleModel.ts       # Procedural sci-fi rifle geometry + movable parts
│   ├── WeaponAnimator.ts   # ADS, recoil, magazine swap, and bolt animation
│   ├── ShellEjectionSystem.ts # Bounded casing simulation + cleanup
│   └── WeaponView.ts       # First-person weapon event/presentation coordinator
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
│   ├── FactoryEnvironment.ts # Procedural industrial props, lights, signs, and factory colliders
│   ├── ScenicBackdrop.ts   # Low-poly hills, vegetation, clouds, coastal rail, and water vista
│   ├── ColliderManager.ts  # AABB collision registry + query
│   ├── PlayerCollisionMath.ts # Testable player footprint + stable top-contact rules
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
- [x] PickupBase.ts + AmmoPickup.ts — floating ammo box, proximity pickup
- [x] PickupSpawner.ts — random legal map positions, timed cap + enemy:died drops
- [x] MapBuilder.ts — place buildings from shared box configs and register matching colliders
- [x] BuildingTemplates.ts — reusable wall, low wall, pillar, and room configs
- [x] EnemyAI update — claimed cover points, bounded re-evaluation/travel/hold, combat recovery
- [x] AudioManager — procedural pickup spawn and collection sounds

**Verify**: Buildings provide cover, ammo boxes appear on map, enemies drop ammo, can pick up.

**Implementation notes**:
- Ammo boxes use only Three.js primitives and configured float, rotation, emissive, rise, and fade feedback. Map boxes grant a random 15–30 rounds and enemy drops grant 10–25 in five-round steps; kill drops use bounded legal-position retries to scatter within 1.6m. All meshes and materials are disposed after collection or scene unload.
- `pickup:ammoCollectionRequested` is a synchronous typed request. WeaponBase owns reserve mutation, caps reserve at 150, emits `weapon:ammoChanged`, and rejects a pickup when no ammo can be granted.
- PickupSpawner pauses all timers and proximity checks outside active pointer-locked play. Map spawns use EventBus-provided legal points, area-clear queries, bounds/spacing rules, a five-map-pickup cap, and a ten-pickup total cap; enemy deaths use a configured 35% drop chance.
- MapBuilder consumes the same world configuration for each visible mesh and AABB. The five P3 test boxes retain their exact transforms, material values, collider IDs, and traversal surfaces; reusable room construction is available for future maps.
- Spawn points and cover points are queried through EventBus. MapBuilder arbitrates exclusive cover claims and releases them on explicit release, enemy death, or world disposal.
- EnemyAI preserves the original reaction/fire cadence while adding preferred-distance control, strafing, close-range retreat, 3.2-second last-seen memory, and pressure-driven cover. Damage, low health, or two attacks trigger cover search; searches occur every 0.8–1.2 seconds, travel is capped at 4.5 seconds, and arrival hold is capped at 1.1 seconds.
- Enemy models now include animated legs, arms, waist/shoulder gear, backpacks, and visible rifles. Raycast-transparent weapon geometry aligns with the actual enemy muzzle origin and does not absorb player shots.
- Player rifle recoil increased by 12%, retaining the existing recoil-return timing.
- MainArena owns assembly/update/disposal order. ESC and death stop pickup generation/collection and cover simulation; page restart reconstructs clean singleton listeners and scene resources.

**Automated verification (2026-09-04)**:
- `npm run build`: passed (`tsc` strict type-check and Vite production build).
- `npm run test:p4`: passed reserve grant/cap, spawn bounds/spacing, exact building parity, configured spawn legality, and map pickup cap checks.
- `git diff --check`: passed with only LF-to-CRLF working-copy notices.
- Source and smoke-test scan found no `any` types.
- Known non-blocking warning: the existing Three.js production chunk remains larger than 500 kB.

**Manual verification steps**:
1. Wait through timed map spawns and verify floating ammo-box visuals, spawn cues, legal placement, and the five-map/ten-total caps.
2. Spend reserve ammo, collect several boxes, and verify a single rise/fade per box, collection cue, randomized source-specific reserve grants, and immediate HUD synchronization.
3. Fill reserve to 150 and verify a nearby ammo box is not consumed while the weapon cannot accept ammunition.
4. Kill enough enemies to observe configured drops; confirm no box appears inside a building or too close to another pickup.
5. Toggle Backquote and verify every migrated building mesh exactly matches its collider wireframe; repeat landing, side-blocking, underside, and ray-obstruction checks.
6. Observe enemies after firing near cover; verify exclusive destinations, stable movement, bounded holding, and recovery to chase/aim/attack.
7. Pause during spawn timing, pickup collection, cover travel, and a wave break; verify simulation freezes and resumes without lost state.
8. Die and restart; verify 30/90 ammo, wave 1, no stale pickups/claims, and no duplicate audio, event, or HUD behavior.

---

### P5 — Polish

**Goal**: Complete game loop with menus, death screen, visual polish.

**Tasks**:
- [x] MainMenu.ts — instructions, start action, and Easy/Normal/Hard selection
- [x] PauseMenu.ts + DeathScreen.ts — owned responsive DOM lifecycle and run controls
- [x] GameState machine — menu → playing ↔ paused → dead with Pointer Lock confirmation
- [x] Visual polish — configured fog, fill lighting, procedural ground and building face tones
- [x] Lighting pass — brighter navigation/combat readability while retaining atmosphere
- [x] Difficulty selection — immutable Easy / Normal / Hard per-run profiles
- [x] GameConfig.ts — P5 visual, animation, and ambient audio tuning centralized
- [x] Final HUD polish — wave announcement and damage flash

**Verify**: Full game loop: start → play → die → see score → restart.

**Implementation notes**:
- `GameStateManager` is the only authority for `menu`, `playing`, `paused`, and `dead`. UI actions and pointer-lock changes request typed transitions over EventBus; a failed/cooling-down lock request leaves the current state intact.
- MainArena derives its single `combatActive` flag only from `game:stateChanged`. Its inactive update path freezes movement, camera, rifle/reload, weapon feedback, tracers, enemy animation/AI, wave breaks, pickups, and their timers while leaving rendering and the debug overlay available.
- `DifficultyProfile` values are frozen per run and injected by MainArena. Normal multipliers are exactly 1 and retain P4; Easy opens at 2 enemies with 28% lighter damage, reduced accuracy, 30% longer reactions, and more/faster supplies; Hard opens at 4 with 18% more damage, modestly higher accuracy, 18% faster reactions, and fewer/slower supplies. HP, speed, fire intervals, score, and relative enemy identities remain unchanged.
- Restart calls `SceneManager.clear()` before constructing the next MainArena. Every module removes only its own EventBus/DOM/document listeners; entities, pickups, cover claims, AI memory, HUD timeouts/RAFs, transient meshes, material/geometry resources, and the audio context graph are disposed without `EventBus.clear()` or page reload.
- Arena presentation reads all P5 tunables from GameConfig: ACES exposure, background/fog, ambient/sun/hemisphere balance, shadow camera, ground/grid, and building face variation. Vertex colors add low-cost surface variation without altering building geometry or collider AABBs.
- AudioManager creates filtered procedural noise and a low oscillator only after the first successful playing transition. Master/ambient gains ramp across pause/death/resume, and unload stops, disconnects, and closes every persistent node/context.

**Automated verification (2026-09-04)**:
- `npm run build`: passed strict TypeScript and Vite production output.
- `npm run test:p4`: passed the complete P4 offline regression.
- `npm run test:p5`: passed transition rules, difficulty parity/order, three listener cleanup cycles, and three scene teardown cycles.
- `git diff --check`: passed with only expected LF-to-CRLF notices; `rg -n "\bany\b" src scripts` returned no matches.
- Local Vite browser smoke: responsive tactical menu and difficulty selection rendered correctly with no console errors. The embedded browser rejected Pointer Lock and correctly remained in menu, validating the failure-safe transition path.

**Manual verification steps**:
1. Verify initial menu, instructions, exclusive difficulty selection, and no background wave/audio before user interaction.
2. Start Easy/Normal/Hard and verify wave-1 counts of 2/3/4 plus documented pressure/resource differences; confirm Normal matches all P4 combat values.
3. Pause and resume during movement, reload, attacks, cover travel, spawn/death/pickup effects, map spawn timing, and a wave break; all timers must freeze until Pointer Lock actually returns.
4. Trigger Pointer Lock cooldown by pressing ESC and immediately resuming; a rejected first click must keep paused state and a later click must resume without reset.
5. Die after changing score/wave and verify death score, reached wave, selected difficulty, stopped gameplay, and faded ambience.
6. Restart from pause and death without reloading. Repeat the full loop three times and verify clean 100 HP, 30/90 ammo, zero score, wave 1, no stale objects/claims/AI memory/timers, and single event/audio/HUD responses.
7. Re-run P3/P4 collision, landing, ray cover, debug wireframe, tactical AI, hit-zone, randomized pickup, full-ammo rejection, and cap checks.
8. Inspect the polished arena in light and shadow; building sides, enemy silhouettes, ground limits, pickups, tracers, muzzle flash, hit feedback, and debug lines must remain distinct without flattening the fog/shadows.

**Workload assessment**:
- Complexity: high; approximately 10–15 touched files spanning state, UI ownership, difficulty configuration, arena presentation, audio lifecycle, and integration.
- State slice: introduce a typed `GameState` authority for menu, playing, paused, and dead transitions while preserving pointer-lock behavior and eliminating reload-only restart coupling.
- UI/difficulty slice: extract overlay ownership, expose Easy/Normal/Hard selection before a run, and apply immutable per-run profiles through EventBus/config boundaries.
- Presentation slice: brighten the arena, retune fog and light balance, add inexpensive material variation and ambient Web Audio without external assets or post-processing dependencies.
- Primary risks: duplicate listeners after restart, competing state flags, pointer-lock cooldown behavior, difficulty values mutating mid-run, and lighting changes reducing enemy/tracer readability.
- Recommended execution: state/difficulty foundation first, UI lifecycle second, visual/audio polish third, then one full regression pass covering P0–P4 invariants.

**P5 acceptance targets**:
1. A single state authority drives menu, playing, pause, death, and restart; UI overlays do not maintain competing game-state truth.
2. Easy/Normal/Hard can be chosen before starting and visibly affect documented enemy or wave parameters without changing during a run.
3. Restart produces fresh HP, ammo, score, wave, enemies, pickups, cover claims, timers, and listeners without requiring a page reload.
4. Arena navigation and enemy silhouettes remain readable in shadow while fog, tracers, emissive feedback, and debug wireframes retain clear contrast.
5. Ambient audio starts only after user interaction, respects pause/death, and releases its audio graph on teardown.
6. `npm run build`, gameplay smoke tests, `git diff --check`, and the no-`any` scan pass; manual regression covers all three difficulty profiles and the complete game loop.

---

### P6 — Factory Environment

**Goal**: Give the arena a coherent industrial-factory identity without external assets or changes to established combat mechanics.

**Tasks**:
- [x] Add a dedicated FactoryEnvironment world owner with complete GPU/collider disposal.
- [x] Model tanks, chimney, pipes, containers, generator, crates, gantry framing, work lights, signs, and ground zones from Three.js primitives.
- [x] Register AABB collision for major gameplay solids from the same immutable position/size configuration.
- [x] Keep overhead/decorative details raycast-transparent so presentation does not create invisible gameplay obstruction.
- [x] Default collider debugging to hidden while retaining the Backquote toggle.
- [x] Add offline validation for factory variety, bounds, pickup clearance, and configured visual systems.

**Design notes**:
- The arena reads as an outdoor processing and assembly yard: vertical tank/stack silhouettes define the skyline, a central yellow logistics lane preserves combat readability, and container/machinery clusters frame cover at the edges.
- The final art direction follows the supplied bright railway FPS reference: clear blue sky, soft white cloud clusters, faceted green hills/trees, pastel industrial surfaces, teal accents, and a coastal service rail line. Reference UI, logos, and text are not reproduced.
- `ScenicBackdrop` owns the non-gameplay vista—hills, vegetation, clouds, water, railway, railcar, and catenary—and marks the entire group raycast-transparent so distant dressing cannot affect combat.
- Warm sodium and cool cyan work lights create focal contrast without replacing the P5 global lighting. Procedural canvas signs and geometric ribs/bands give the primitives authored detail without texture downloads.
- Tanks, chimney, containers, generator, and crate stack are gameplay solids. Their visible roots and AABBs use one config entry; pipes, gantries, signs, markings, and light fixtures remain decorative.
- FactoryEnvironment owns and disposes all meshes, materials, canvas textures, lights, and collider IDs when MainArena unloads.

**Automated verification (2026-09-04)**:
- `npm run build`, `npm run test:p4`, `npm run test:p5`, and `npm run test:p6` passed.
- P6 smoke checks cover unique structure IDs, positive dimensions, map bounds, pickup-spawn clearance, nonzero pipe runs, scenery coverage, railway density, coastal water, and minimum marking/light/sign coverage.
- Local Vite panoramic inspection covered both the central yard and railway edge, confirming the reference-inspired low-poly palette with collider debug hidden and no browser console warnings/errors.

**Manual verification steps**:
1. Tour the central lane and perimeter to confirm every factory cluster is readable and does not obscure enemy or pickup silhouettes.
2. Test movement and combat rays against every configured gameplay solid, then use Backquote to compare its visual volume and AABB.
3. Shoot through/under decorative overhead pipes and gantries and confirm they introduce no unexpected cover behavior.
4. Re-run pickup legality, enemy spawn clearance, player landing/collision, cover, and restart cleanup checks.
5. Restart repeatedly and verify lights, collider IDs, canvas sign textures, and factory geometry do not duplicate.

---

### P7 — Combat Presentation

**Goal**: Improve aiming, hit readability, battlefield awareness, and environmental density without changing P4 combat balance or collision behavior.

**Tasks**:
- [x] Run-owned RMB ADS with a smooth 75° → 45° FOV transition and centered weapon sight.
- [x] Layered procedural hit feedback: impact core, oriented expanding ring, and gravity-driven sparks.
- [x] Responsive top-right tactical radar driven only by typed player/enemy transform events.
- [x] Factory dressing from primitives: barrels, pallets, cones, cable reel, and utility cabinets.
- [x] Cleanup for all new listeners, DOM blips, transient meshes/materials, and run-owned state.
- [x] Offline P7 checks plus the complete P4–P6 regression suite.

**Design notes**:
- `AimController` owns camera FOV and publishes only `weapon:aimChanged`; `WeaponView` consumes that state and interpolates between configured hip/ADS transforms. Pause, death, and unload restore the standard FOV immediately.
- `HitEffectSystem` listens to `combat:shotHit`, detects enemy ancestry from scene metadata, and owns every effect lifetime. MainArena updates it only during `playing`, so particles freeze during pause.
- HUD radar uses `RadarMath` to rotate world offsets into the camera horizontal frame. Nearby hostiles use red blips; out-of-range hostiles clamp to an amber 48 m boundary. Enemy objects are never referenced by UI.
- Decorative props are grouped under `FactoryEnvironment`, marked raycast-transparent, and kept outside core lanes. Existing MapBuilder geometry, factory solid AABBs, spawn legality, cover claims, and projectile obstruction remain unchanged.

**Automated verification (2026-09-04)**:
- `npm run build`: passed strict TypeScript and Vite production output.
- `npm run test:p4`, `npm run test:p5`, `npm run test:p6`, and `npm run test:p7`: passed.
- P7 validates zoom ordering, centered ADS configuration, radar cardinal projection/edge clamping, effect counts/durations, five prop categories, and MainArena/HUD cleanup hooks.
- Local browser menu inspection passed with the new RMB instruction; Pointer Lock is unavailable in the embedded preview, so live ADS/radar/hit-effect confirmation remains in the manual steps.

**Manual verification steps**:
1. Hold/release RMB while moving and firing; verify smooth centered ADS and zoom without changes to rifle damage, cadence, recoil return, reload, or ammunition.
2. Pause/death while aiming and verify FOV resets; resume/restart and confirm aim state is fresh and the context menu does not appear while Pointer Lock is active.
3. Hit enemies and world surfaces at several angles; verify distinct colors, surface-aligned rings, short sparks, pause freezing, and complete cleanup on restart.
4. Circle enemies while watching the radar; verify player-relative orientation, accurate quadrants, 48 m edge clamping, and immediate death removal.
5. Inspect radar on desktop and a sub-640 px viewport; confirm it remains legible and does not cover critical HUD panels.
6. Tour all new factory dressing and verify it improves composition while remaining decorative, raycast-transparent, and non-colliding.
7. Repeat three complete game loops and confirm a single ADS response, hit burst, blip per enemy, and prop set with no old event listeners or GPU/DOM residue.

---

### Post-P7 — Weapon Presentation Refresh

**Goal**: Upgrade first-person weapon quality and interaction feedback while fixing optic alignment and elevated-platform stability without changing combat balance.

**Tasks**:
- [x] Replace the basic rifle mesh with layered gunmetal, machined edges, angular armor, cyan energy accents, and a raised open holographic sight.
- [x] Split model construction, weapon poses, and casing simulation into `RifleModel`, `WeaponAnimator`, and `ShellEjectionSystem`; keep `WeaponView` as the EventBus-facing coordinator.
- [x] Add staged reload presentation: weapon handling pose, magazine removal/replacement, and bolt-rack finish synchronized to the existing reload duration.
- [x] Emit one bounded, gravity-driven, spinning brass casing for each accepted `player:shoot` event and dispose all transient resources on run teardown.
- [x] Align the complete optic opening with the camera axis by pairing `OPTIC_CENTER_Y` with the inverse configured ADS Y position.
- [x] Stabilize raised-surface grounding with a contact epsilon, circular player footprint overlap, and a top-contact guard before side-penetration resolution.
- [x] Extend P4/P7 smoke coverage for collision edge cases and optic/ADS alignment.

**Design notes**:
- `WeaponAnimator` owns only presentation state and movable model parts; ammo settlement and reload authority remain in `WeaponBase`.
- Casings are raycast-transparent camera-space effects with a configured active-object cap, lifetime, gravity, spin, and fade interval.
- The holographic sight has no opaque center geometry. Its full window sits above the receiver, and its geometric center coincides with the HUD crosshair after ADS settles.
- `PlayerCollisionMath` isolates footprint and top-contact decisions. A player within the configured top-contact tolerance is snapped back to the exact platform height before side collision can push the cylinder toward an edge.

**Automated verification (2026-09-05)**:
- `npm run build`: passed strict TypeScript and Vite production output.
- `npm run test:p4`, `npm run test:p5`, `npm run test:p6`, and `npm run test:p7`: passed.
- A local ADS showcase confirmed the crosshair at the open optic's geometric center after the transition settled.
- A deterministic raised-platform scenario remained grounded with zero horizontal displacement for 300 consecutive frames.

**Manual verification steps**:
1. Compare hip and ADS presentation against the bright factory yard; verify gunmetal highlights and cyan details remain legible.
2. Hold RMB until the transition settles and verify the HUD crosshair is centered inside the complete unobstructed optic window.
3. Fire bursts and verify one casing per shot exits the right port, tumbles, falls, fades, and never affects raycasts.
4. Reload from a partially spent magazine and verify removal, replacement, bolt movement, ammo timing, pause freezing, and cleanup.
5. Jump onto the reachable 2 m box and other elevated solids, stop moving near both center and edge areas, and verify no unexplained lateral push occurs.

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

### P8 — Melee Loadout & Difficulty Expansion

**Goal**: Preserve a viable combat option at zero ammunition and make every difficulty tier affect the full combat economy.

- [x] Add a tactical knife selected with 2, rifle selected with 1, and Q quick swap while retaining rifle ammunition and reload state.
- [x] Route short-range knife attacks through the existing raycast, damage, death, score, hit-effect, audio, and lifecycle systems.
- [x] Scale enemy count and per-wave growth, HP, damage, attack interval, accuracy, reaction time, map pickup timing, and enemy ammo-drop chance by difficulty.
- [x] Expose loadout controls in the menu/HUD and summarize key difficulty values on selection cards.
- [x] Add synchronized holster/draw transitions, a reference-driven upright wide-spine single-edged tactical knife with a lower forward grip, attack lockout, a sharp-edge-leading upper-right to lower-left slash, a narrow straight edge-attached core/glow streak, filtered-noise whoosh, and enemy-only layered impact feedback.
- [x] Turn the knife edge primarily toward view depth and brighten its gunmetal, silver edge, and metallic highlights for clear first-person readability.
