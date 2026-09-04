export class PickupSpawnRules {
  static isWithinMap(x: number, z: number, mapSize: number, clearance: number): boolean {
    const halfMap = mapSize / 2;
    return Math.abs(x) <= halfMap - clearance && Math.abs(z) <= halfMap - clearance;
  }

  static hasSpacing(
    x: number,
    z: number,
    existing: readonly { x: number; z: number }[],
    minimumSpacing: number
  ): boolean {
    const minimumSquared = minimumSpacing * minimumSpacing;
    return existing.every((point) => {
      const dx = point.x - x;
      const dz = point.z - z;
      return dx * dx + dz * dz >= minimumSquared;
    });
  }
}
