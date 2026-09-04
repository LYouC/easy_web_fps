import assert from 'node:assert/strict';
import { GameConfig } from '../src/config/GameConfig.ts';

const structures = GameConfig.FACTORY.STRUCTURES;
assert.ok(structures.length >= 10);
assert.equal(new Set(structures.map((structure) => structure.id)).size, structures.length);
assert.ok(structures.some((structure) => structure.kind === 'tank'));
assert.ok(structures.some((structure) => structure.kind === 'stack'));
assert.ok(structures.some((structure) => structure.kind === 'container'));
assert.ok(structures.some((structure) => structure.kind === 'machine'));

for (const structure of structures) {
  assert.ok(structure.size.every((dimension) => dimension > 0));
  assert.ok(Math.abs(structure.position[0]) + structure.size[0] / 2 < GameConfig.WORLD.MAP_SIZE / 2);
  assert.ok(Math.abs(structure.position[2]) + structure.size[2] / 2 < GameConfig.WORLD.MAP_SIZE / 2);
  if (!structure.collider) continue;
  for (const point of GameConfig.WORLD.PICKUP_SPAWN_POINTS) {
    const overlapsX = Math.abs(point[0] - structure.position[0]) < structure.size[0] / 2 + GameConfig.PICKUP.SPAWN_CLEARANCE;
    const overlapsZ = Math.abs(point[2] - structure.position[2]) < structure.size[2] / 2 + GameConfig.PICKUP.SPAWN_CLEARANCE;
    assert.equal(overlapsX && overlapsZ, false);
  }
}

for (const pipe of GameConfig.FACTORY.PIPES) {
  const lengthSquared = pipe.start.reduce((total, coordinate, index) => {
    const difference = pipe.end[index] - coordinate;
    return total + difference * difference;
  }, 0);
  assert.ok(lengthSquared > 0);
  assert.ok(pipe.radius > 0);
}

assert.ok(GameConfig.FACTORY.MARKINGS.length >= 4);
assert.ok(GameConfig.FACTORY.LIGHTS.length >= 3);
assert.ok(GameConfig.FACTORY.SIGNS.length >= 2);
assert.ok(GameConfig.FACTORY.PROPS.length >= 8);
assert.ok(GameConfig.SCENERY.HILLS.length >= 4);
assert.ok(GameConfig.SCENERY.TREES.length >= 8);
assert.ok(GameConfig.SCENERY.CLOUDS.length >= 3);
assert.ok(GameConfig.SCENERY.RAILCAR_WINDOW_COUNT >= 6);
assert.ok(GameConfig.SCENERY.SLEEPER_COUNT >= 30);
assert.ok(GameConfig.SCENERY.WATER_SIZE.every((dimension) => dimension > 0));
assert.ok(GameConfig.VISUAL.BACKGROUND_COLOR !== GameConfig.VISUAL.FOG_COLOR);

console.log('P6 smoke checks passed: factory solids, stylized scenery, railway, water, bounds, pickup clearance, lighting, and signage.');
