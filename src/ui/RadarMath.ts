export interface RadarPoint {
  x: number;
  y: number;
  clamped: boolean;
}

export class RadarMath {
  static project(
    deltaX: number,
    deltaZ: number,
    forwardX: number,
    forwardZ: number,
    range: number,
    radius: number
  ): RadarPoint {
    const rightX = -forwardZ;
    const rightZ = forwardX;
    const localX = deltaX * rightX + deltaZ * rightZ;
    const localY = -(deltaX * forwardX + deltaZ * forwardZ);
    const distance = Math.hypot(localX, localY);
    const clamped = distance > range;
    const scale = distance > 0 ? Math.min(distance, range) / distance : 0;
    return {
      x: localX * scale / range * radius,
      y: localY * scale / range * radius,
      clamped,
    };
  }
}
