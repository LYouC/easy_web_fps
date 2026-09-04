import assert from 'node:assert/strict';
import { DifficultyProfiles } from '../src/config/DifficultyConfig.ts';
import { GameConfig } from '../src/config/GameConfig.ts';
import { EventBus } from '../src/core/EventBus.ts';
import { canTransitionGameState, type GameState } from '../src/core/GameStateTransitions.ts';
import { SceneManager } from '../src/scene/SceneManager.ts';

assert.equal(DifficultyProfiles.normal.enemyDamageMultiplier, 1);
assert.equal(DifficultyProfiles.normal.enemyAccuracyMultiplier, 1);
assert.equal(DifficultyProfiles.normal.enemyReactionTimeMultiplier, 1);
assert.equal(DifficultyProfiles.normal.baseEnemyCount, GameConfig.WAVE.BASE_ENEMY_COUNT);
assert.equal(DifficultyProfiles.normal.enemyCountIncrement, GameConfig.WAVE.ENEMY_COUNT_INCREMENT);
assert.equal(DifficultyProfiles.normal.mapPickupIntervalMultiplier, 1);
assert.equal(DifficultyProfiles.normal.enemyDropChanceMultiplier, 1);
assert.ok(DifficultyProfiles.easy.enemyDamageMultiplier < 1);
assert.ok(DifficultyProfiles.easy.enemyAccuracyMultiplier < 1);
assert.ok(DifficultyProfiles.easy.enemyReactionTimeMultiplier > 1);
assert.ok(DifficultyProfiles.easy.baseEnemyCount < DifficultyProfiles.normal.baseEnemyCount);
assert.ok(DifficultyProfiles.easy.enemyDropChanceMultiplier > 1);
assert.ok(DifficultyProfiles.hard.enemyDamageMultiplier > 1 && DifficultyProfiles.hard.enemyDamageMultiplier < 1.25);
assert.ok(DifficultyProfiles.hard.enemyAccuracyMultiplier > 1);
assert.ok(DifficultyProfiles.hard.enemyReactionTimeMultiplier < 1);
assert.ok(DifficultyProfiles.hard.baseEnemyCount > DifficultyProfiles.normal.baseEnemyCount);
assert.ok(DifficultyProfiles.hard.enemyDropChanceMultiplier < 1);

const legalTransitions: ReadonlyArray<readonly [GameState, GameState]> = [
  ['menu', 'playing'], ['playing', 'paused'], ['paused', 'playing'],
  ['playing', 'dead'], ['paused', 'dead'], ['dead', 'playing'],
];
legalTransitions.forEach(([from, to]) => assert.equal(canTransitionGameState(from, to), true));
assert.equal(canTransitionGameState('menu', 'paused'), false);
assert.equal(canTransitionGameState('menu', 'dead'), false);

const eventBus = EventBus.getInstance();
eventBus.clear();
const callback = (): void => undefined;
for (let cycle = 0; cycle < 3; cycle += 1) {
  eventBus.on('lifecycle:test', callback);
  assert.equal(eventBus.listenerCount('lifecycle:test'), 1);
  eventBus.off('lifecycle:test', callback);
  assert.equal(eventBus.listenerCount('lifecycle:test'), 0);
}

let unloads = 0;
const sceneManager = new SceneManager();
for (let cycle = 0; cycle < 3; cycle += 1) {
  sceneManager.switchTo({ load: (): void => undefined, unload: (): void => { unloads += 1; }, update: (): void => undefined });
  sceneManager.clear();
  assert.equal(sceneManager.getCurrentScene(), null);
}
assert.equal(unloads, 3);

console.log('P5 smoke checks passed: state transitions, immutable difficulty mapping, listener cleanup, and repeated scene teardown.');
