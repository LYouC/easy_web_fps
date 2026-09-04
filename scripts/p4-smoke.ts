import assert from 'node:assert/strict';
import { GameConfig } from '../src/config/GameConfig.ts';
import { PickupSpawnRules } from '../src/pickups/PickupSpawnRules.ts';
import { AmmoReserve } from '../src/weapons/AmmoReserve.ts';
import { AmmoAmountRules } from '../src/pickups/AmmoAmountRules.ts';
import { EnemyTactics } from '../src/enemies/EnemyTactics.ts';

const reserve = new AmmoReserve(140, GameConfig.WEAPON.RIFLE_MAX_RESERVE_AMMO);
assert.equal(reserve.add(GameConfig.PICKUP.MAP_AMMO_MIN), 10);
assert.equal(reserve.getAmount(), GameConfig.WEAPON.RIFLE_MAX_RESERVE_AMMO);
assert.equal(reserve.add(GameConfig.PICKUP.ENEMY_AMMO_MIN), 0);
assert.equal(reserve.take(GameConfig.WEAPON.RIFLE_MAG_SIZE), GameConfig.WEAPON.RIFLE_MAG_SIZE);
assert.equal(reserve.add(GameConfig.PICKUP.MAP_AMMO_MIN), GameConfig.PICKUP.MAP_AMMO_MIN);
assert.equal((GameConfig.PICKUP.MAP_AMMO_MAX - GameConfig.PICKUP.MAP_AMMO_MIN) % GameConfig.PICKUP.AMMO_STEP, 0);
assert.equal((GameConfig.PICKUP.ENEMY_AMMO_MAX - GameConfig.PICKUP.ENEMY_AMMO_MIN) % GameConfig.PICKUP.AMMO_STEP, 0);
assert.equal(AmmoAmountRules.roll(GameConfig.PICKUP.MAP_AMMO_MIN, GameConfig.PICKUP.MAP_AMMO_MAX, GameConfig.PICKUP.AMMO_STEP, 0), GameConfig.PICKUP.MAP_AMMO_MIN);
assert.equal(AmmoAmountRules.roll(GameConfig.PICKUP.MAP_AMMO_MIN, GameConfig.PICKUP.MAP_AMMO_MAX, GameConfig.PICKUP.AMMO_STEP, 0.999), GameConfig.PICKUP.MAP_AMMO_MAX);
for (let index = 0; index <= 100; index += 1) {
  const amount = AmmoAmountRules.roll(GameConfig.PICKUP.ENEMY_AMMO_MIN, GameConfig.PICKUP.ENEMY_AMMO_MAX, GameConfig.PICKUP.AMMO_STEP, index / 100);
  assert.ok(amount >= GameConfig.PICKUP.ENEMY_AMMO_MIN && amount <= GameConfig.PICKUP.ENEMY_AMMO_MAX);
  assert.equal((amount - GameConfig.PICKUP.ENEMY_AMMO_MIN) % GameConfig.PICKUP.AMMO_STEP, 0);
}

assert.equal(PickupSpawnRules.isWithinMap(0, 0, GameConfig.WORLD.MAP_SIZE, GameConfig.PICKUP.SPAWN_CLEARANCE), true);
assert.equal(PickupSpawnRules.isWithinMap(GameConfig.WORLD.MAP_SIZE, 0, GameConfig.WORLD.MAP_SIZE, GameConfig.PICKUP.SPAWN_CLEARANCE), false);
assert.equal(PickupSpawnRules.hasSpacing(0, 0, [{ x: GameConfig.PICKUP.MIN_SPACING, z: 0 }], GameConfig.PICKUP.MIN_SPACING), true);
assert.equal(PickupSpawnRules.hasSpacing(0, 0, [{ x: GameConfig.PICKUP.MIN_SPACING / 2, z: 0 }], GameConfig.PICKUP.MIN_SPACING), false);

const expectedBuildings = [
  [[10, 2, -10], [4, 4, 4]],
  [[-12, 1.5, 8], [6, 3, 3]],
  [[0, 3, -25], [8, 6, 3]],
  [[20, 1, 15], [3, 2, 8]],
  [[-20, 2.5, -15], [5, 5, 5]],
];
assert.deepEqual(
  GameConfig.WORLD.BUILDINGS.map((building) => [building.position, building.size]),
  expectedBuildings
);

for (const point of GameConfig.WORLD.PICKUP_SPAWN_POINTS) {
  assert.equal(
    PickupSpawnRules.isWithinMap(point[0], point[2], GameConfig.WORLD.MAP_SIZE, GameConfig.PICKUP.SPAWN_CLEARANCE),
    true
  );
  for (const building of GameConfig.WORLD.BUILDINGS) {
    const insideX = Math.abs(point[0] - building.position[0]) < building.size[0] / 2 + GameConfig.PICKUP.SPAWN_CLEARANCE;
    const insideZ = Math.abs(point[2] - building.position[2]) < building.size[2] / 2 + GameConfig.PICKUP.SPAWN_CLEARANCE;
    assert.equal(insideX && insideZ, false);
  }
}

let elapsed = 0;
let mapPickupCount = 0;
for (let tick = 0; tick < 1000; tick += 1) {
  elapsed += 0.1;
  if (elapsed < GameConfig.PICKUP.MAP_SPAWN_INTERVAL) continue;
  elapsed %= GameConfig.PICKUP.MAP_SPAWN_INTERVAL;
  if (mapPickupCount < GameConfig.PICKUP.MAX_MAP_PICKUPS) mapPickupCount += 1;
  assert.ok(mapPickupCount <= GameConfig.PICKUP.MAX_MAP_PICKUPS);
}
assert.equal(mapPickupCount, GameConfig.PICKUP.MAX_MAP_PICKUPS);
assert.ok(GameConfig.PICKUP.ENEMY_DROP_CHANCE >= 0 && GameConfig.PICKUP.ENEMY_DROP_CHANCE <= 1);
assert.ok(GameConfig.PICKUP.ENEMY_DROP_SCATTER_RADIUS > 0);
assert.ok(GameConfig.PICKUP.ENEMY_DROP_SCATTER_ATTEMPTS > 0);
assert.ok(GameConfig.PICKUP.MAX_TOTAL_PICKUPS >= GameConfig.PICKUP.MAX_MAP_PICKUPS);
assert.ok(GameConfig.ENEMY.COVER_REEVALUATE_MIN > 0);
assert.ok(GameConfig.ENEMY.COVER_REEVALUATE_MIN < GameConfig.ENEMY.COVER_REEVALUATE_MAX);
assert.ok(GameConfig.ENEMY.COVER_MAX_TRAVEL_TIME > GameConfig.ENEMY.COVER_HOLD_DURATION);
assert.ok(GameConfig.ENEMY.ELITE_FIRE_RATE > GameConfig.ENEMY.COVER_REEVALUATE_MIN);
assert.equal(EnemyTactics.chooseRangeManeuver(3, 10, 0.5, 0.8), 'retreat');
assert.equal(EnemyTactics.chooseRangeManeuver(6, 10, 0.5, 0.8), 'strafe');
assert.equal(EnemyTactics.chooseRangeManeuver(9, 10, 0.5, 0.8), 'advance');
assert.equal(EnemyTactics.shouldSeekCover(1, 1, 0.5, 0, 2), true);
assert.equal(EnemyTactics.shouldSeekCover(0, 0.4, 0.5, 0, 2), true);
assert.equal(EnemyTactics.shouldSeekCover(0, 1, 0.5, 2, 2), true);
assert.equal(EnemyTactics.shouldSeekCover(0, 1, 0.5, 1, 2), false);
assert.ok(GameConfig.ENEMY.PREFERRED_RANGE_MIN_FACTOR > 0);
assert.ok(GameConfig.ENEMY.PREFERRED_RANGE_MIN_FACTOR < GameConfig.ENEMY.PREFERRED_RANGE_MAX_FACTOR);
assert.ok(GameConfig.ENEMY.PREFERRED_RANGE_MAX_FACTOR < 1);
assert.ok(GameConfig.ENEMY.LAST_SEEN_MEMORY > 0);
assert.ok(GameConfig.WEAPON.RIFLE_RECOIL > 1 && GameConfig.WEAPON.RIFLE_RECOIL < 1.25);
assert.ok(GameConfig.ENEMY.WEAPON_BARREL_Z + GameConfig.ENEMY.WEAPON_BARREL_LENGTH / 2 <= GameConfig.ENEMY.MUZZLE_FORWARD);

console.log('Gameplay smoke checks passed: randomized ammo, reserve cap, spawn legality, tactical AI decisions, cover timing, recoil, enemy weapon alignment.');
