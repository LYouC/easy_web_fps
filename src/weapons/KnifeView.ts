import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { MeleeHitEvent, WeaponChangedEvent } from '@/core/GameEvents';
import { DaggerModel } from '@/weapons/DaggerModel';

export class KnifeView {
  private readonly eventBus = EventBus.getInstance();
  private readonly group: THREE.Group;
  private readonly trail: THREE.Group;
  private readonly trailCoreMaterial: THREE.MeshBasicMaterial;
  private readonly trailGlowMaterial: THREE.MeshBasicMaterial;
  private readonly positionOffset = new THREE.Vector3();
  private readonly rotationOffset = new THREE.Vector3();
  private swingRemaining = 0;
  private hitKickRemaining = 0;
  private equipped = false;
  private equipProgress = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    const model = DaggerModel.build();
    this.group = model.group;
    this.trail = model.trail;
    this.trailCoreMaterial = model.trailCoreMaterial;
    this.trailGlowMaterial = model.trailGlowMaterial;
    this.group.position.set(...GameConfig.WEAPON.KNIFE_VIEW_POSITION);
    this.group.rotation.set(...GameConfig.WEAPON.KNIFE_IDLE_ROTATION);
    this.group.visible = false;
    this.camera.add(this.group);
    this.eventBus.on('weapon:changed', this.onWeaponChanged);
    this.eventBus.on('weapon:meleeSwing', this.onMelee);
    this.eventBus.on('combat:meleeHit', this.onMeleeHit);
  }

  private onWeaponChanged = (...args: unknown[]): void => {
    const event = args[0] as WeaponChangedEvent | undefined;
    if (!event) return;
    this.equipped = event.weapon === 'knife';
    if (this.equipped) this.group.visible = true;
  };

  private onMelee = (): void => {
    this.swingRemaining = GameConfig.WEAPON.KNIFE_SWING_DURATION;
  };

  private onMeleeHit = (...args: unknown[]): void => {
    const event = args[0] as MeleeHitEvent | undefined;
    if (event?.enemyHit) this.hitKickRemaining = GameConfig.WEAPON.KNIFE_HIT_KICK_DURATION;
  };

  update(delta: number): void {
    this.swingRemaining = Math.max(0, this.swingRemaining - delta);
    this.hitKickRemaining = Math.max(0, this.hitKickRemaining - delta);
    const equipStep = delta / GameConfig.WEAPON.WEAPON_SWITCH_DURATION;
    this.equipProgress = THREE.MathUtils.clamp(
      this.equipProgress + (this.equipped ? equipStep : -equipStep),
      0,
      1
    );
    const progress = 1 - this.swingRemaining / GameConfig.WEAPON.KNIFE_SWING_DURATION;
    this.positionOffset.set(0, 0, 0);
    this.rotationOffset.set(0, 0, 0);
    if (this.swingRemaining > 0) this.getSwingPose(progress, this.positionOffset, this.rotationOffset);
    const hitStrength = this.hitKickRemaining / GameConfig.WEAPON.KNIFE_HIT_KICK_DURATION;
    const hitShake = Math.sin(hitStrength * Math.PI * GameConfig.WEAPON.KNIFE_HIT_SHAKE_OSCILLATIONS)
      * GameConfig.WEAPON.KNIFE_HIT_SHAKE * hitStrength;
    const holster = 1 - this.ease(this.equipProgress);
    this.group.position.set(
      GameConfig.WEAPON.KNIFE_VIEW_POSITION[0] + this.positionOffset.x + hitShake,
      GameConfig.WEAPON.KNIFE_VIEW_POSITION[1] + this.positionOffset.y - GameConfig.WEAPON.WEAPON_HOLSTER_DROP * holster,
      GameConfig.WEAPON.KNIFE_VIEW_POSITION[2] + this.positionOffset.z
        + GameConfig.WEAPON.WEAPON_HOLSTER_PULLBACK * holster
        + GameConfig.WEAPON.KNIFE_HIT_KICK_DISTANCE * hitStrength
    );
    this.group.rotation.set(
      GameConfig.WEAPON.KNIFE_IDLE_ROTATION[0] + this.rotationOffset.x
        + GameConfig.WEAPON.WEAPON_HOLSTER_ROTATION_X * holster,
      GameConfig.WEAPON.KNIFE_IDLE_ROTATION[1] + this.rotationOffset.y,
      GameConfig.WEAPON.KNIFE_IDLE_ROTATION[2] + this.rotationOffset.z
        + GameConfig.WEAPON.WEAPON_HOLSTER_ROTATION_Z * holster
    );
    if (!this.equipped && this.equipProgress === 0) this.group.visible = false;
    this.updateTrail(progress);
  }

  private getSwingPose(progress: number, position: THREE.Vector3, rotation: THREE.Vector3): void {
    const windupPosition = GameConfig.WEAPON.KNIFE_WINDUP_POSITION;
    const strikePosition = GameConfig.WEAPON.KNIFE_STRIKE_POSITION;
    const windupRotation = GameConfig.WEAPON.KNIFE_WINDUP_ROTATION;
    const strikeRotation = GameConfig.WEAPON.KNIFE_STRIKE_ROTATION;
    if (progress < GameConfig.WEAPON.KNIFE_WINDUP_END) {
      const phase = this.ease(progress / GameConfig.WEAPON.KNIFE_WINDUP_END);
      position.set(windupPosition[0] * phase, windupPosition[1] * phase, windupPosition[2] * phase);
      rotation.set(windupRotation[0] * phase, windupRotation[1] * phase, windupRotation[2] * phase);
      return;
    }
    if (progress < GameConfig.WEAPON.KNIFE_STRIKE_END) {
      const phase = this.ease(
        (progress - GameConfig.WEAPON.KNIFE_WINDUP_END)
          / (GameConfig.WEAPON.KNIFE_STRIKE_END - GameConfig.WEAPON.KNIFE_WINDUP_END)
      );
      position.set(
        THREE.MathUtils.lerp(windupPosition[0], strikePosition[0], phase),
        THREE.MathUtils.lerp(windupPosition[1], strikePosition[1], phase),
        THREE.MathUtils.lerp(windupPosition[2], strikePosition[2], phase)
      );
      rotation.set(
        THREE.MathUtils.lerp(windupRotation[0], strikeRotation[0], phase),
        THREE.MathUtils.lerp(windupRotation[1], strikeRotation[1], phase),
        THREE.MathUtils.lerp(windupRotation[2], strikeRotation[2], phase)
      );
      return;
    }
    const phase = this.ease((progress - GameConfig.WEAPON.KNIFE_STRIKE_END) / (1 - GameConfig.WEAPON.KNIFE_STRIKE_END));
    position.set(strikePosition[0] * (1 - phase), strikePosition[1] * (1 - phase), strikePosition[2] * (1 - phase));
    rotation.set(strikeRotation[0] * (1 - phase), strikeRotation[1] * (1 - phase), strikeRotation[2] * (1 - phase));
  }

  private updateTrail(progress: number): void {
    const striking = this.swingRemaining > 0
      && progress >= GameConfig.WEAPON.KNIFE_WINDUP_END
      && progress <= GameConfig.WEAPON.KNIFE_STRIKE_END + GameConfig.WEAPON.KNIFE_TRAIL_FADE_OUT;
    this.trail.visible = this.equipped && striking;
    if (!striking) {
      this.trailCoreMaterial.opacity = 0;
      this.trailGlowMaterial.opacity = 0;
      return;
    }
    const phase = THREE.MathUtils.clamp(
      (progress - GameConfig.WEAPON.KNIFE_WINDUP_END)
        / (GameConfig.WEAPON.KNIFE_STRIKE_END - GameConfig.WEAPON.KNIFE_WINDUP_END),
      0,
      1
    );
    const intensity = Math.sin(phase * Math.PI);
    this.trailCoreMaterial.opacity = intensity * GameConfig.WEAPON.KNIFE_TRAIL_CORE_OPACITY;
    this.trailGlowMaterial.opacity = intensity * GameConfig.WEAPON.KNIFE_TRAIL_GLOW_OPACITY;
    this.trail.scale.set(
      1 + intensity * GameConfig.WEAPON.KNIFE_TRAIL_SCALE_X,
      GameConfig.WEAPON.KNIFE_TRAIL_SCALE_Y_BASE + intensity * GameConfig.WEAPON.KNIFE_TRAIL_SCALE_Y_PEAK,
      1
    );
  }

  private ease(value: number): number {
    return value * value * (3 - 2 * value);
  }

  dispose(): void {
    this.eventBus.off('weapon:changed', this.onWeaponChanged);
    this.eventBus.off('weapon:meleeSwing', this.onMelee);
    this.eventBus.off('combat:meleeHit', this.onMeleeHit);
    this.camera.remove(this.group);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
