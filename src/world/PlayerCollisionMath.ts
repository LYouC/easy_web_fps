export class PlayerCollisionMath {
  static overlapsFootprint(
    x: number,
    z: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    radius: number,
  ): boolean {
    const closestX = Math.max(minX, Math.min(x, maxX));
    const closestZ = Math.max(minZ, Math.min(z, maxZ));
    const dx = x - closestX;
    const dz = z - closestZ;
    return dx * dx + dz * dz <= radius * radius;
  }

  static isStableTopContact(
    previousFeetY: number,
    feetY: number,
    platformTop: number,
    descending: boolean,
    epsilon: number,
  ): boolean {
    return descending
      && previousFeetY >= platformTop - epsilon
      && feetY <= platformTop + epsilon;
  }
}
