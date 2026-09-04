import * as THREE from 'three';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface ColliderEntry {
  id: string;
  box: AABB;
  isGround: boolean;
}

export interface CollisionResult {
  position: THREE.Vector3;
  onGround: boolean;
}

export class ColliderManager {
  private colliders: Map<string, ColliderEntry> = new Map();

  add(id: string, box: AABB, isGround: boolean = false): void {
    this.colliders.set(id, { id, box, isGround });
  }

  remove(id: string): void {
    this.colliders.delete(id);
  }

  clear(): void {
    this.colliders.clear();
  }

  getAll(): ColliderEntry[] {
    return Array.from(this.colliders.values());
  }

  resolveCollision(
    position: THREE.Vector3,
    previousPosition: THREE.Vector3,
    playerHeight: number,
    eyeHeight: number,
    playerRadius: number
  ): CollisionResult {
    let onGround = false;
    const resolved = position.clone();
    let feetY = resolved.y - eyeHeight;

    if (feetY <= 0) {
      resolved.y = eyeHeight;
      feetY = 0;
      onGround = true;
    }

    for (const entry of this.colliders.values()) {
      const { box } = entry;
      const previousFeetY = previousPosition.y - eyeHeight;
      const previousHeadY = previousFeetY + playerHeight;
      const headY = feetY + playerHeight;
      const withinFootprint = resolved.x >= box.min.x - playerRadius
        && resolved.x <= box.max.x + playerRadius
        && resolved.z >= box.min.z - playerRadius
        && resolved.z <= box.max.z + playerRadius;

      if (
        withinFootprint
        && resolved.y <= previousPosition.y
        && previousFeetY >= box.max.y
        && feetY <= box.max.y
      ) {
        resolved.y = box.max.y + eyeHeight;
        feetY = box.max.y;
        onGround = true;
        continue;
      }

      if (
        withinFootprint
        && resolved.y > previousPosition.y
        && previousHeadY <= box.min.y
        && headY >= box.min.y
      ) {
        resolved.y = box.min.y - (playerHeight - eyeHeight);
        feetY = resolved.y - eyeHeight;
        continue;
      }

      const bodyTop = feetY + playerHeight;
      const verticallyOverlapping = bodyTop > box.min.y && feetY < box.max.y;
      if (!verticallyOverlapping) continue;

      const closestX = Math.max(box.min.x, Math.min(resolved.x, box.max.x));
      const closestZ = Math.max(box.min.z, Math.min(resolved.z, box.max.z));

      const dx = resolved.x - closestX;
      const dz = resolved.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < playerRadius * playerRadius) {
        if (distSq < 0.0001) {
          const distances = [
            { value: Math.abs(resolved.x - box.min.x), axis: 'x', target: box.min.x - playerRadius },
            { value: Math.abs(box.max.x - resolved.x), axis: 'x', target: box.max.x + playerRadius },
            { value: Math.abs(resolved.z - box.min.z), axis: 'z', target: box.min.z - playerRadius },
            { value: Math.abs(box.max.z - resolved.z), axis: 'z', target: box.max.z + playerRadius },
          ] as const;
          const nearest = distances.reduce((best, candidate) => candidate.value < best.value ? candidate : best);
          resolved[nearest.axis] = nearest.target;
          continue;
        }

        const dist = Math.sqrt(distSq);
        const overlap = playerRadius - dist;
        resolved.x += (dx / dist) * overlap;
        resolved.z += (dz / dist) * overlap;
      }
    }

    return { position: resolved, onGround };
  }

  raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): { hit: boolean; point: THREE.Vector3; id: string } | null {
    const ray = new THREE.Ray(origin, direction.normalize());
    let closest: { distance: number; point: THREE.Vector3; id: string } | null = null;

    for (const entry of this.colliders.values()) {
      const { box, id } = entry;
      const threeBox = new THREE.Box3(box.min, box.max);
      const intersectionPoint = new THREE.Vector3();
      const hit = ray.intersectBox(threeBox, intersectionPoint);
      if (hit) {
        const distance = origin.distanceTo(intersectionPoint);
        if (distance <= maxDistance && (!closest || distance < closest.distance)) {
          closest = { distance, point: intersectionPoint, id };
        }
      }
    }

    if (closest) {
      return { hit: true, point: closest.point, id: closest.id };
    }
    return null;
  }
}
