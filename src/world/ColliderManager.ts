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

  resolveCollision(position: THREE.Vector3, playerHeight: number, eyeHeight: number): CollisionResult {
    let onGround = false;
    const resolved = position.clone();
    const feetY = resolved.y - eyeHeight;

    if (feetY <= 0) {
      resolved.y = eyeHeight;
      onGround = true;
    }

    const radius = playerHeight / 2;

    for (const entry of this.colliders.values()) {
      const { box } = entry;

      const closestX = Math.max(box.min.x, Math.min(resolved.x, box.max.x));
      const closestY = Math.max(box.min.y, Math.min(resolved.y, box.max.y));
      const closestZ = Math.max(box.min.z, Math.min(resolved.z, box.max.z));

      const dx = resolved.x - closestX;
      const dy = resolved.y - closestY;
      const dz = resolved.z - closestZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radius * radius) {
        if (distSq < 0.0001) {
          const centerX = (box.min.x + box.max.x) / 2;
          const centerZ = (box.min.z + box.max.z) / 2;
          resolved.x = centerX + (resolved.x >= centerX ? 1 : -1) * ((box.max.x - box.min.x) / 2 + radius);
          resolved.z = centerZ + (resolved.z >= centerZ ? 1 : -1) * ((box.max.z - box.min.z) / 2 + radius);
          continue;
        }

        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;

        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        if (ny > 0.7) {
          resolved.y += overlap;
          onGround = true;
        } else if (ny < -0.7) {
          resolved.y -= overlap;
        } else {
          resolved.x += nx * overlap;
          resolved.z += nz * overlap;
        }
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
