import type { Difficulty } from '@/core/GameEvents';

export interface DifficultyProfile {
  readonly id: Difficulty;
  readonly label: string;
  readonly description: string;
  readonly enemyDamageMultiplier: number;
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
    description: 'More supplies, slower reactions, lighter incoming fire.',
    enemyDamageMultiplier: 0.72,
    enemyAccuracyMultiplier: 0.82,
    enemyReactionTimeMultiplier: 1.3,
    baseEnemyCount: 2,
    enemyCountIncrement: 2,
    mapPickupIntervalMultiplier: 0.8,
    enemyDropChanceMultiplier: 1.35,
  }),
  normal: Object.freeze({
    id: 'normal',
    label: 'NORMAL',
    description: 'The original P4 combat balance.',
    enemyDamageMultiplier: 1,
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
    description: 'Larger waves, sharper reactions, fewer supply drops.',
    enemyDamageMultiplier: 1.18,
    enemyAccuracyMultiplier: 1.06,
    enemyReactionTimeMultiplier: 0.82,
    baseEnemyCount: 4,
    enemyCountIncrement: 2,
    mapPickupIntervalMultiplier: 1.2,
    enemyDropChanceMultiplier: 0.78,
  }),
});

export function getDifficultyProfile(difficulty: Difficulty): DifficultyProfile {
  return DifficultyProfiles[difficulty];
}
