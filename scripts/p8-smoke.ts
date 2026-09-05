import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DifficultyProfiles } from '../src/config/DifficultyConfig.ts';
import { GameConfig } from '../src/config/GameConfig.ts';

assert.ok(DifficultyProfiles.easy.enemyHealthMultiplier < DifficultyProfiles.normal.enemyHealthMultiplier);
assert.ok(DifficultyProfiles.normal.enemyHealthMultiplier < DifficultyProfiles.hard.enemyHealthMultiplier);
assert.ok(DifficultyProfiles.easy.enemyDamageMultiplier < DifficultyProfiles.normal.enemyDamageMultiplier);
assert.ok(DifficultyProfiles.normal.enemyDamageMultiplier < DifficultyProfiles.hard.enemyDamageMultiplier);
assert.ok(DifficultyProfiles.easy.enemyAttackIntervalMultiplier > DifficultyProfiles.normal.enemyAttackIntervalMultiplier);
assert.ok(DifficultyProfiles.normal.enemyAttackIntervalMultiplier > DifficultyProfiles.hard.enemyAttackIntervalMultiplier);
assert.ok(DifficultyProfiles.easy.baseEnemyCount < DifficultyProfiles.normal.baseEnemyCount);
assert.ok(DifficultyProfiles.normal.baseEnemyCount < DifficultyProfiles.hard.baseEnemyCount);
assert.ok(DifficultyProfiles.easy.enemyCountIncrement < DifficultyProfiles.normal.enemyCountIncrement);
assert.ok(DifficultyProfiles.normal.enemyCountIncrement < DifficultyProfiles.hard.enemyCountIncrement);
assert.ok(DifficultyProfiles.easy.enemyDropChanceMultiplier > DifficultyProfiles.normal.enemyDropChanceMultiplier);
assert.ok(DifficultyProfiles.normal.enemyDropChanceMultiplier > DifficultyProfiles.hard.enemyDropChanceMultiplier);
assert.ok(GameConfig.WEAPON.KNIFE_DAMAGE > 0);
assert.ok(GameConfig.WEAPON.KNIFE_RANGE > 0 && GameConfig.WEAPON.KNIFE_RANGE < 3);
assert.ok(GameConfig.WEAPON.KNIFE_ATTACK_INTERVAL >= GameConfig.WEAPON.KNIFE_SWING_DURATION);
assert.ok(GameConfig.WEAPON.KNIFE_HIT_FRAME > GameConfig.WEAPON.KNIFE_WINDUP_END);
assert.ok(GameConfig.WEAPON.KNIFE_HIT_FRAME < GameConfig.WEAPON.KNIFE_STRIKE_END);
assert.ok(GameConfig.WEAPON.KNIFE_WINDUP_POSITION[0] > 0 && GameConfig.WEAPON.KNIFE_WINDUP_POSITION[1] > 0);
assert.ok(GameConfig.WEAPON.KNIFE_STRIKE_POSITION[0] < 0 && GameConfig.WEAPON.KNIFE_STRIKE_POSITION[1] < 0);
assert.ok(GameConfig.WEAPON.KNIFE_IDLE_ROTATION[1] < -Math.PI / 4);
const strikePhase = (GameConfig.WEAPON.KNIFE_HIT_FRAME - GameConfig.WEAPON.KNIFE_WINDUP_END)
  / (GameConfig.WEAPON.KNIFE_STRIKE_END - GameConfig.WEAPON.KNIFE_WINDUP_END);
const easedStrikePhase = strikePhase * strikePhase * (3 - 2 * strikePhase);
const hitRotation = GameConfig.WEAPON.KNIFE_IDLE_ROTATION[2]
  + GameConfig.WEAPON.KNIFE_WINDUP_ROTATION[2]
  + (GameConfig.WEAPON.KNIFE_STRIKE_ROTATION[2] - GameConfig.WEAPON.KNIFE_WINDUP_ROTATION[2])
    * easedStrikePhase;
const slashX = GameConfig.WEAPON.KNIFE_STRIKE_POSITION[0] - GameConfig.WEAPON.KNIFE_WINDUP_POSITION[0];
const slashY = GameConfig.WEAPON.KNIFE_STRIKE_POSITION[1] - GameConfig.WEAPON.KNIFE_WINDUP_POSITION[1];
const slashLength = Math.hypot(slashX, slashY);
const edgeAlignment = (-Math.cos(hitRotation) * slashX - Math.sin(hitRotation) * slashY) / slashLength;
assert.ok(edgeAlignment > 0.9, 'the left sharp edge must lead the upper-right to lower-left strike');
assert.ok(GameConfig.WEAPON.KNIFE_TRAIL_X <= -GameConfig.WEAPON.KNIFE_BLADE_WIDTH * 0.5);

const loadout = readFileSync(new URL('../src/weapons/WeaponLoadout.ts', import.meta.url), 'utf8');
const shooter = readFileSync(new URL('../src/combat/RaycastShooter.ts', import.meta.url), 'utf8');
const knifeView = readFileSync(new URL('../src/weapons/KnifeView.ts', import.meta.url), 'utf8');
const enemyTypes = readFileSync(new URL('../src/enemies/EnemyTypes.ts', import.meta.url), 'utf8');
const weaponView = readFileSync(new URL('../src/weapons/WeaponView.ts', import.meta.url), 'utf8');
const hitEffects = readFileSync(new URL('../src/combat/HitEffectSystem.ts', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/audio/AudioManager.ts', import.meta.url), 'utf8');
const daggerModel = readFileSync(new URL('../src/weapons/DaggerModel.ts', import.meta.url), 'utf8');
assert.match(loadout, /Digit1/);
assert.match(loadout, /Digit2/);
assert.match(loadout, /KeyQ/);
assert.match(loadout, /player:melee/);
assert.match(loadout, /weapon:meleeSwing/);
assert.match(loadout, /switchRemaining/);
assert.match(shooter, /eventBus\.on\('player:melee'/);
assert.match(shooter, /eventBus\.off\('player:melee'/);
assert.match(knifeView, /eventBus\.off\('weapon:changed'/);
assert.match(knifeView, /KNIFE_WINDUP_END/);
assert.match(knifeView, /KNIFE_STRIKE_END/);
assert.match(knifeView, /KNIFE_TRAIL_CORE_OPACITY/);
assert.match(knifeView, /eventBus\.off\('combat:meleeHit'/);
assert.match(weaponView, /WEAPON_HOLSTER_DROP/);
assert.match(hitEffects, /eventBus\.off\('combat:meleeHit'/);
assert.match(audio, /playFilteredNoise/);
assert.doesNotMatch(audio, /KNIFE_ATTACK_FREQUENCY/);
assert.match(audio, /event\?\.source === 'knife'/);
assert.match(daggerModel, /ExtrudeGeometry/);
assert.match(daggerModel, /PlaneGeometry/);
assert.match(daggerModel, /createSharpEdgeShape/);
assert.match(daggerModel, /KNIFE_BLADE_EMISSIVE_INTENSITY/);
assert.doesNotMatch(daggerModel, /RingGeometry/);
assert.match(enemyTypes, /maxHp: definition\.maxHp \* profile\.enemyHealthMultiplier/);
assert.match(enemyTypes, /attackInterval: definition\.attackInterval \* profile\.enemyAttackIntervalMultiplier/);

console.log('P8 smoke checks passed: animated loadout, strike-synced melee feedback, difficulty scaling, and cleanup hooks.');
