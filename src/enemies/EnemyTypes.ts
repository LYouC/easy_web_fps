import { GameConfig } from '@/config/GameConfig';
import type { EnemyType } from '@/core/GameEvents';
import { DifficultyProfiles, type DifficultyProfile } from '@/config/DifficultyConfig';

export interface EnemyDefinition {
  type: EnemyType;
  maxHp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  attackRange: number;
  accuracy: number;
  points: number;
  color: number;
  scale: number;
  radius: number;
  reactionTime: number;
}

const DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  normal: {
    type: 'normal',
    maxHp: GameConfig.ENEMY.NORMAL_HP,
    speed: GameConfig.ENEMY.NORMAL_SPEED,
    damage: GameConfig.ENEMY.NORMAL_DAMAGE,
    attackInterval: GameConfig.ENEMY.NORMAL_FIRE_RATE,
    attackRange: GameConfig.ENEMY.NORMAL_ATTACK_RANGE,
    accuracy: GameConfig.ENEMY.NORMAL_ACCURACY,
    points: GameConfig.ENEMY.NORMAL_POINTS,
    color: GameConfig.ENEMY.NORMAL_COLOR,
    scale: GameConfig.ENEMY.NORMAL_SCALE,
    radius: GameConfig.ENEMY.NORMAL_RADIUS,
    reactionTime: GameConfig.ENEMY.NORMAL_REACTION_TIME,
  },
  heavy: {
    type: 'heavy',
    maxHp: GameConfig.ENEMY.HEAVY_HP,
    speed: GameConfig.ENEMY.HEAVY_SPEED,
    damage: GameConfig.ENEMY.HEAVY_DAMAGE,
    attackInterval: GameConfig.ENEMY.HEAVY_FIRE_RATE,
    attackRange: GameConfig.ENEMY.HEAVY_ATTACK_RANGE,
    accuracy: GameConfig.ENEMY.HEAVY_ACCURACY,
    points: GameConfig.ENEMY.HEAVY_POINTS,
    color: GameConfig.ENEMY.HEAVY_COLOR,
    scale: GameConfig.ENEMY.HEAVY_SCALE,
    radius: GameConfig.ENEMY.HEAVY_RADIUS,
    reactionTime: GameConfig.ENEMY.HEAVY_REACTION_TIME,
  },
  elite: {
    type: 'elite',
    maxHp: GameConfig.ENEMY.ELITE_HP,
    speed: GameConfig.ENEMY.ELITE_SPEED,
    damage: GameConfig.ENEMY.ELITE_DAMAGE,
    attackInterval: GameConfig.ENEMY.ELITE_FIRE_RATE,
    attackRange: GameConfig.ENEMY.ELITE_ATTACK_RANGE,
    accuracy: GameConfig.ENEMY.ELITE_ACCURACY,
    points: GameConfig.ENEMY.ELITE_POINTS,
    color: GameConfig.ENEMY.ELITE_COLOR,
    scale: GameConfig.ENEMY.ELITE_SCALE,
    radius: GameConfig.ENEMY.ELITE_RADIUS,
    reactionTime: GameConfig.ENEMY.ELITE_REACTION_TIME,
  },
};

export function getEnemyDefinition(type: EnemyType, profile: DifficultyProfile = DifficultyProfiles.normal): EnemyDefinition {
  const definition = DEFINITIONS[type];
  return {
    ...definition,
    maxHp: definition.maxHp * profile.enemyHealthMultiplier,
    damage: definition.damage * profile.enemyDamageMultiplier,
    attackInterval: definition.attackInterval * profile.enemyAttackIntervalMultiplier,
    accuracy: Math.min(0.99, definition.accuracy * profile.enemyAccuracyMultiplier),
    reactionTime: definition.reactionTime * profile.enemyReactionTimeMultiplier,
  };
}
