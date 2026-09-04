export type RangeManeuver = 'advance' | 'strafe' | 'retreat';

export class EnemyTactics {
  static chooseRangeManeuver(
    distance: number,
    attackRange: number,
    minimumFactor: number,
    maximumFactor: number
  ): RangeManeuver {
    if (distance < attackRange * minimumFactor) return 'retreat';
    if (distance > attackRange * maximumFactor) return 'advance';
    return 'strafe';
  }

  static shouldSeekCover(
    suppressionRemaining: number,
    healthRatio: number,
    lowHealthRatio: number,
    attacksSinceCover: number,
    attacksBeforeCover: number
  ): boolean {
    return suppressionRemaining > 0
      || healthRatio <= lowHealthRatio
      || attacksSinceCover >= attacksBeforeCover;
  }
}
