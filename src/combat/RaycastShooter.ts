import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { MeleeHitEvent, PlayerMeleeEvent, PlayerShootEvent, ShotHitEvent } from '@/core/GameEvents';

interface TracerMaterial {
  material: THREE.MeshBasicMaterial;
  opacity: number;
}

interface Tracer {
  group: THREE.Group;
  materials: TracerMaterial[];
  remaining: number;
}

export class RaycastShooter {
  private readonly scene: THREE.Scene;
  private readonly eventBus: EventBus;
  private readonly raycaster = new THREE.Raycaster();
  private readonly tracers: Tracer[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('player:shoot', this.onPlayerShoot);
    this.eventBus.on('player:melee', this.onPlayerMelee);
  }

  private onPlayerMelee = (...args: unknown[]): void => {
    const attack = args[0] as PlayerMeleeEvent | undefined;
    if (!attack) return;
    this.raycaster.set(attack.origin, attack.direction);
    this.raycaster.far = attack.range;
    const hit = this.raycaster.intersectObjects(this.scene.children, true)
      .find((intersection) => !this.isIgnored(intersection.object));
    if (!hit) return;
    const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)
      ?? attack.direction.clone().negate();
    const event: ShotHitEvent = {
      point: hit.point.clone(),
      normal,
      object: hit.object,
      damage: attack.damage,
      source: 'knife',
    };
    this.eventBus.emit('combat:shotHit', event);
    const meleeHit: MeleeHitEvent = {
      point: event.point.clone(),
      normal: event.normal.clone(),
      object: event.object,
      enemyHit: this.isEnemy(event.object),
    };
    this.eventBus.emit('combat:meleeHit', meleeHit);
  };

  private onPlayerShoot = (...args: unknown[]): void => {
    const shot = args[0] as PlayerShootEvent | undefined;
    if (!shot) return;

    this.raycaster.set(shot.origin, shot.direction);
    this.raycaster.far = shot.range;
    const hit = this.raycaster.intersectObjects(this.scene.children, true)
      .find((intersection) => !this.isIgnored(intersection.object));

    if (!hit) {
      this.createTracer(
        shot.muzzleOrigin,
        shot.origin.clone().addScaledVector(shot.direction, shot.range)
      );
      this.eventBus.emit('combat:shotMissed');
      return;
    }

    this.createTracer(shot.muzzleOrigin, hit.point);

    const normal = hit.face?.normal.clone().transformDirection(hit.object.matrixWorld)
      ?? shot.direction.clone().negate();
    const event: ShotHitEvent = {
      point: hit.point.clone(),
      normal,
      object: hit.object,
      damage: shot.damage,
      source: 'rifle',
    };
    this.eventBus.emit('combat:shotHit', event);
  };

  private isIgnored(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData.raycastIgnore === true) return true;
      current = current.parent;
    }
    return false;
  }

  private isEnemy(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (typeof current.userData.enemyId === 'string') return true;
      current = current.parent;
    }
    return false;
  }

  private createTracer(start: THREE.Vector3, end: THREE.Vector3): void {
    const direction = end.clone().sub(start);
    const distance = direction.length();
    if (distance <= 0) return;

    const group = new THREE.Group();
    group.position.copy(start).add(end).multiplyScalar(0.5);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.userData.raycastIgnore = true;

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: GameConfig.WEAPON.TRACER_COLOR,
      transparent: true,
      opacity: GameConfig.WEAPON.TRACER_GLOW_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff4d6,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(GameConfig.WEAPON.TRACER_GLOW_RADIUS, GameConfig.WEAPON.TRACER_GLOW_RADIUS, distance, 6),
      glowMaterial
    );
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(GameConfig.WEAPON.TRACER_CORE_RADIUS, GameConfig.WEAPON.TRACER_CORE_RADIUS, distance, 5),
      coreMaterial
    );
    group.add(glow, core);
    this.scene.add(group);
    this.tracers.push({
      group,
      materials: [
        { material: glowMaterial, opacity: GameConfig.WEAPON.TRACER_GLOW_OPACITY },
        { material: coreMaterial, opacity: 0.95 },
      ],
      remaining: GameConfig.WEAPON.TRACER_DURATION,
    });
  }

  update(delta: number): void {
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index];
      if (!tracer) continue;
      tracer.remaining -= delta;
      const progress = Math.max(0, tracer.remaining / GameConfig.WEAPON.TRACER_DURATION);
      tracer.materials.forEach(({ material, opacity }) => {
        material.opacity = opacity * progress * progress;
      });
      if (tracer.remaining > 0) continue;
      this.disposeTracer(tracer);
      this.tracers.splice(index, 1);
    }
  }

  private disposeTracer(tracer: Tracer): void {
    this.scene.remove(tracer.group);
    tracer.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    });
  }

  dispose(): void {
    this.eventBus.off('player:shoot', this.onPlayerShoot);
    this.eventBus.off('player:melee', this.onPlayerMelee);
    this.tracers.forEach((tracer) => this.disposeTracer(tracer));
    this.tracers.length = 0;
  }
}
