import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GameConfig } from '../src/config/GameConfig.ts';
import { RadarMath } from '../src/ui/RadarMath.ts';

assert.ok(GameConfig.WEAPON.ADS_FOV < GameConfig.VISUAL.CAMERA_FOV);
assert.ok(GameConfig.WEAPON.ADS_FOV >= 40);
assert.ok(GameConfig.WEAPON.ADS_TRANSITION_SPEED > 0);
assert.equal(GameConfig.WEAPON.HIP_POSITION.length, 3);
assert.equal(GameConfig.WEAPON.ADS_POSITION[0], 0);
assert.ok(Math.abs(GameConfig.WEAPON.ADS_POSITION[1] + 0.105) < 0.001);

const ahead = RadarMath.project(0, -24, 0, -1, 48, 67);
assert.ok(Math.abs(ahead.x) < 0.001);
assert.ok(ahead.y < 0);
assert.equal(ahead.clamped, false);

const right = RadarMath.project(24, 0, 0, -1, 48, 67);
assert.ok(right.x > 0);
assert.ok(Math.abs(right.y) < 0.001);

const distant = RadarMath.project(200, 0, 0, -1, 48, 67);
assert.equal(distant.clamped, true);
assert.ok(Math.abs(Math.hypot(distant.x, distant.y) - 67) < 0.001);

assert.ok(GameConfig.WEAPON.IMPACT_SPARK_COUNT >= 5);
assert.ok(GameConfig.WEAPON.IMPACT_SPARK_DURATION > GameConfig.WEAPON.IMPACT_DURATION);
assert.ok(GameConfig.WEAPON.IMPACT_RING_DURATION > 0);
assert.ok(GameConfig.FACTORY.PROPS.length >= 8);
assert.ok(new Set(GameConfig.FACTORY.PROPS.map((prop) => prop.kind)).size >= 5);

const mainArena = readFileSync(new URL('../src/scene/scenes/MainArena.ts', import.meta.url), 'utf8');
assert.match(mainArena, /aimController\.dispose\(\)/);
assert.match(mainArena, /hitEffectSystem\.dispose\(\)/);
assert.match(mainArena, /enemy:transformChanged|player:transformChanged/);

const hud = readFileSync(new URL('../src/ui/HUD.ts', import.meta.url), 'utf8');
assert.match(hud, /enemy:transformChanged/);
assert.match(hud, /eventBus\.off\('enemy:transformChanged'/);

console.log('P7 smoke checks passed: ADS profile, radar projection/clamping, hit effects, factory dressing, and disposal hooks.');
