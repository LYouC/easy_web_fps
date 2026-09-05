import type { Difficulty } from '@/core/GameEvents';

export interface DifficultyProfile {
  readonly id: Difficulty;
  readonly label: string;
  readonly description: string;
  readonly enemyDamageMultiplier: number;
  readonly enemyHealthMultiplier: number;
  readonly enemyAttackIntervalMultiplier: number;
  readonly enemyAccuracyMultiplier: number;
  readonly enemyReactionTimeMultiplier: number;
  readonly baseEnemyCount: number;
  readonly enemyCountIncrement: number;
  readonly mapPickupIntervalMultiplier: number;
  readonly enemyDropChanceMultiplier: number;
}

export const DifficultyProfiles: Readonly<Record<Difficulty, DifficultyProfile>> = Object.freeze({
  easy: Object.freeze({
    id: 'easy',
    label: 'EASY',
    description: '2 +1/wave · 80% HP · 70% damage · 47% drops.',
    enemyDamageMultiplier: 0.7,
    enemyHealthMultiplier: 0.8,
    enemyAttackIntervalMultiplier: 1.25,
    enemyAccuracyMultiplier: 0.8,
    enemyReactionTimeMultiplier: 1.3,
    baseEnemyCount: 2,
    enemyCountIncrement: 1,
    mapPickupIntervalMultiplier: 0.75,
    enemyDropChanceMultiplier: 1.35,
  }),
  normal: Object.freeze({
    id: 'normal',
    label: 'NORMAL',
    description: '3 +2/wave · 100% HP/damage · 35% drops.',
    enemyDamageMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyAttackIntervalMultiplier: 1,
    enemyAccuracyMultiplier: 1,
    enemyReactionTimeMultiplier: 1,
    baseEnemyCount: 3,
    enemyCountIncrement: 2,
    mapPickupIntervalMultiplier: 1,
    enemyDropChanceMultiplier: 1,
  }),
  hard: Object.freeze({
    id: 'hard',
    label: 'HARD',
    description: '4 +3/wave · 125% HP · 120% damage · 19% drops.',
    enemyDamageMultiplier: 1.2,
    enemyHealthMultiplier: 1.25,
    enemyAttackIntervalMultiplier: 0.78,
    enemyAccuracyMultiplier: 1.08,
    enemyReactionTimeMultiplier: 0.75,
    baseEnemyCount: 4,
    enemyCountIncrement: 3,
    mapPickupIntervalMultiplier: 1.3,
    enemyDropChanceMultiplier: 0.55,
  }),
});

export function getDifficultyProfile(difficulty: Difficulty): DifficultyProfile {
  return DifficultyProfiles[difficulty];
}
