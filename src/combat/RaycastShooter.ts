import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { PlayerShootEvent, ShotHitEvent } from '@/core/GameEvents';

interface Impact {
  mesh: THREE.Mesh;
  remaining: number;
}

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
  private readonly impacts: Impact[] = [];
  private readonly tracers: Tracer[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('player:shoot', this.onPlayerShoot);
  }

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
    };
    this.eventBus.emit('combat:shotHit', event);
    this.createImpact(event.point, event.normal);
  };

  private isIgnored(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.userData.raycastIgnore === true) return true;
      current = current.parent;
    }
    return false;
  }

  private createImpact(point: THREE.Vector3, normal: THREE.Vector3): void {
    const material = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(GameConfig.WEAPON.IMPACT_SIZE, 6, 4), material);
    mesh.position.copy(point).addScaledVector(normal, GameConfig.WEAPON.IMPACT_SIZE);
    mesh.userData.raycastIgnore = true;
    this.scene.add(mesh);
    this.impacts.push({ mesh, remaining: GameConfig.WEAPON.IMPACT_DURATION });
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
    for (let index = this.impacts.length - 1; index >= 0; index -= 1) {
      const impact = this.impacts[index];
      if (!impact) continue;
      impact.remaining -= delta;
      (impact.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        impact.remaining / GameConfig.WEAPON.IMPACT_DURATION
      );
      if (impact.remaining > 0) continue;
      this.scene.remove(impact.mesh);
      impact.mesh.geometry.dispose();
      (impact.mesh.material as THREE.Material).dispose();
      this.impacts.splice(index, 1);
    }

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
    this.impacts.forEach(({ mesh }) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.impacts.length = 0;
    this.tracers.forEach((tracer) => this.disposeTracer(tracer));
    this.tracers.length = 0;
  }
}
