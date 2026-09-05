import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { ColliderManager } from '@/world/ColliderManager';

export class PerimeterFence {
  private readonly root = new THREE.Group();
  private readonly colliderIds: string[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliderManager: ColliderManager
  ) {
    this.root.name = 'perimeter_fence';
    this.scene.add(this.root);
    this.build();
  }

  private build(): void {
    const half = GameConfig.WORLD.MAP_SIZE / 2;
    this.buildSide('north', 'z', -1, half);
    this.buildSide('south', 'z', 1, half);
    this.buildSide('west', 'x', -1, half);
    this.buildSide('east', 'x', 1, half);
  }

  private buildSide(name: string, axis: 'x' | 'z', sign: number, half: number): void {
    const cfg = GameConfig.FENCE;
    const isZ = axis === 'z';
    const mapSize = GameConfig.WORLD.MAP_SIZE;

    const min = new THREE.Vector3();
    const max = new THREE.Vector3();
    if (isZ) {
      const z = sign * half;
      min.set(-half, 0, z - cfg.THICKNESS / 2);
      max.set(half, cfg.HEIGHT, z + cfg.THICKNESS / 2);
    } else {
      const x = sign * half;
      min.set(x - cfg.THICKNESS / 2, 0, -half);
      max.set(x + cfg.THICKNESS / 2, cfg.HEIGHT, half);
    }
    const colliderId = `fence_${name}`;
    this.colliderManager.add(colliderId, { min, max });
    this.colliderIds.push(colliderId);

    const baseW = isZ ? mapSize : cfg.THICKNESS;
    const baseD = isZ ? cfg.THICKNESS : mapSize;
    const sidePos = sign * half;

    const base = this.makeMesh(
      new THREE.BoxGeometry(baseW, cfg.BASE_HEIGHT, baseD),
      cfg.BASE_COLOR
    );
    base.position.y = cfg.BASE_HEIGHT / 2;
    if (isZ) base.position.z = sidePos;
    else base.position.x = sidePos;
    this.root.add(base);

    const stripeH = cfg.BASE_HEIGHT * cfg.STRIPE_HEIGHT_RATIO;
    const stripe = this.makeMesh(
      new THREE.BoxGeometry(baseW, stripeH, baseD),
      cfg.HAZARD_COLOR
    );
    stripe.position.y = cfg.BASE_HEIGHT * cfg.STRIPE_Y_RATIO;
    if (isZ) stripe.position.z = sidePos;
    else stripe.position.x = sidePos;
    this.root.add(stripe);

    const postCount = Math.floor(mapSize / cfg.POST_SPACING) + 1;
    for (let i = 0; i < postCount; i++) {
      const t = -half + i * cfg.POST_SPACING;
      this.addPost(t, sidePos, isZ);
    }

    for (let r = 0; r < cfg.RAIL_COUNT; r++) {
      const railY = cfg.BASE_HEIGHT + (r + 0.5) * (cfg.HEIGHT - cfg.BASE_HEIGHT) / cfg.RAIL_COUNT;
      const railW = isZ ? mapSize : cfg.RAIL_SIZE;
      const railD = isZ ? cfg.RAIL_SIZE : mapSize;
      const rail = this.makeMesh(
        new THREE.BoxGeometry(railW, cfg.RAIL_SIZE, railD),
        cfg.RAIL_COLOR
      );
      rail.position.y = railY;
      if (isZ) rail.position.z = sidePos;
      else rail.position.x = sidePos;
      this.root.add(rail);
    }
  }

  private addPost(t: number, sidePos: number, isZ: boolean): void {
    const cfg = GameConfig.FENCE;

    const post = this.makeMesh(
      new THREE.CylinderGeometry(cfg.POST_RADIUS, cfg.POST_RADIUS, cfg.HEIGHT, cfg.POST_SEGMENTS),
      cfg.POST_COLOR
    );
    post.position.y = cfg.HEIGHT / 2;
    if (isZ) { post.position.x = t; post.position.z = sidePos; }
    else { post.position.z = t; post.position.x = sidePos; }
    this.root.add(post);

    const cap = this.makeMesh(
      new THREE.SphereGeometry(cfg.POST_RADIUS * cfg.CAP_SCALE, cfg.POST_SEGMENTS, cfg.CAP_RINGS),
      cfg.POST_COLOR
    );
    cap.position.y = cfg.HEIGHT;
    if (isZ) { cap.position.x = t; cap.position.z = sidePos; }
    else { cap.position.z = t; cap.position.x = sidePos; }
    this.root.add(cap);
  }

  private makeMesh(geometry: THREE.BufferGeometry, color: number): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: GameConfig.FENCE.EMISSIVE_INTENSITY,
      roughness: GameConfig.FENCE.ROUGHNESS,
      metalness: GameConfig.FENCE.METALNESS,
      flatShading: GameConfig.FENCE.FLAT_SHADING,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  dispose(): void {
    this.colliderIds.forEach((id) => this.colliderManager.remove(id));
    this.colliderIds.length = 0;
    this.scene.remove(this.root);
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.root.clear();
  }
}
