import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { MeleeHitEvent, ShotHitEvent } from '@/core/GameEvents';

interface HitEffect {
  object: THREE.Object3D;
  remaining: number;
  duration: number;
  velocity?: THREE.Vector3;
}

export class HitEffectSystem {
  private readonly eventBus = EventBus.getInstance();
  private readonly effects: HitEffect[] = [];

  constructor(private readonly scene: THREE.Scene) {
    this.eventBus.on('combat:shotHit', this.onShotHit);
    this.eventBus.on('combat:meleeHit', this.onMeleeHit);
  }

  private onShotHit = (...args: unknown[]): void => {
    const hit = args[0] as ShotHitEvent | undefined;
    if (!hit) return;
    const color = this.isEnemy(hit.object)
      ? GameConfig.WEAPON.IMPACT_ENEMY_COLOR
      : GameConfig.WEAPON.IMPACT_WORLD_COLOR;
    this.createCore(hit.point, hit.normal, color);
    this.createRing(hit.point, hit.normal, color);
    this.createSparks(hit.point, hit.normal, color);
  };

  private onMeleeHit = (...args: unknown[]): void => {
    const hit = args[0] as MeleeHitEvent | undefined;
    if (!hit?.enemyHit) return;
    this.createCore(hit.point, hit.normal, GameConfig.WEAPON.KNIFE_EDGE_COLOR, 1.8);
    this.createRing(hit.point, hit.normal, GameConfig.WEAPON.KNIFE_EDGE_COLOR, 2.2);
    this.createSparks(hit.point, hit.normal, GameConfig.WEAPON.KNIFE_EDGE_COLOR);
  };

  private createCore(point: THREE.Vector3, normal: THREE.Vector3, color: number, scale: number = 1): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(GameConfig.WEAPON.IMPACT_SIZE * scale, 7, 5),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mesh.position.copy(point).addScaledVector(normal, GameConfig.WEAPON.IMPACT_SIZE);
    mesh.userData.raycastIgnore = true;
    this.scene.add(mesh);
    this.effects.push({ object: mesh, remaining: GameConfig.WEAPON.IMPACT_DURATION, duration: GameConfig.WEAPON.IMPACT_DURATION });
  }

  private createRing(point: THREE.Vector3, normal: THREE.Vector3, color: number, scale: number = 1): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(
        GameConfig.WEAPON.IMPACT_RING_SIZE * 0.42 * scale,
        GameConfig.WEAPON.IMPACT_RING_SIZE * scale,
        12
      ),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mesh.position.copy(point).addScaledVector(normal, GameConfig.WEAPON.IMPACT_SIZE * 1.2);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
    mesh.userData.raycastIgnore = true;
    this.scene.add(mesh);
    this.effects.push({ object: mesh, remaining: GameConfig.WEAPON.IMPACT_RING_DURATION, duration: GameConfig.WEAPON.IMPACT_RING_DURATION });
  }

  private createSparks(point: THREE.Vector3, normal: THREE.Vector3, color: number): void {
    for (let index = 0; index < GameConfig.WEAPON.IMPACT_SPARK_COUNT; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.012, 0.012, GameConfig.WEAPON.IMPACT_SPARK_LENGTH),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      const tangent = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5)
        .projectOnPlane(normal)
        .normalize();
      const speed = THREE.MathUtils.lerp(
        GameConfig.WEAPON.IMPACT_SPARK_SPEED_MIN,
        GameConfig.WEAPON.IMPACT_SPARK_SPEED_MAX,
        Math.random()
      );
      const velocity = tangent.multiplyScalar(speed).addScaledVector(normal, speed * (0.3 + Math.random() * 0.35));
      mesh.position.copy(point).addScaledVector(normal, GameConfig.WEAPON.IMPACT_SIZE);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velocity.clone().normalize());
      mesh.userData.raycastIgnore = true;
      this.scene.add(mesh);
      this.effects.push({
        object: mesh,
        remaining: GameConfig.WEAPON.IMPACT_SPARK_DURATION,
        duration: GameConfig.WEAPON.IMPACT_SPARK_DURATION,
        velocity,
      });
    }
  }

  private isEnemy(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (typeof current.userData.enemyId === 'string') return true;
      current = current.parent;
    }
    return false;
  }

  update(delta: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      if (!effect) continue;
      effect.remaining = Math.max(0, effect.remaining - delta);
      const progress = effect.remaining / effect.duration;
      if (effect.velocity) {
        effect.object.position.addScaledVector(effect.velocity, delta);
        effect.velocity.y -= GameConfig.WEAPON.IMPACT_SPARK_GRAVITY * delta;
      } else if (effect.object instanceof THREE.Mesh && effect.object.geometry instanceof THREE.RingGeometry) {
        effect.object.scale.setScalar(1 + (1 - progress) * 0.7);
      }
      if (effect.object instanceof THREE.Mesh) {
        (effect.object.material as THREE.MeshBasicMaterial).opacity = progress * progress;
      }
      if (effect.remaining > 0) continue;
      this.disposeEffect(effect.object);
      this.effects.splice(index, 1);
    }
  }

  private disposeEffect(object: THREE.Object3D): void {
    this.scene.remove(object);
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    (object.material as THREE.Material).dispose();
  }

  dispose(): void {
    this.eventBus.off('combat:shotHit', this.onShotHit);
    this.eventBus.off('combat:meleeHit', this.onMeleeHit);
    this.effects.forEach((effect) => this.disposeEffect(effect.object));
    this.effects.length = 0;
  }
}
