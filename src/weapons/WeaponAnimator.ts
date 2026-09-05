import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';

export interface WeaponPose {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

export class WeaponAnimator {
  private readonly magazine: THREE.Group;
  private readonly bolt: THREE.Mesh;
  private readonly boltRestPosition: THREE.Vector3;
  private readonly hipPosition = new THREE.Vector3(...GameConfig.WEAPON.HIP_POSITION);
  private readonly adsPosition = new THREE.Vector3(...GameConfig.WEAPON.ADS_POSITION);
  private readonly restPosition = new THREE.Vector3(...GameConfig.WEAPON.HIP_POSITION);
  private readonly posePosition = new THREE.Vector3();
  private readonly poseRotation = new THREE.Euler();
  private recoil = 0;
  private elapsed = 0;
  private reloadElapsed = 0;
  private reloadDuration = 0;

  constructor(magazine: THREE.Group, bolt: THREE.Mesh) {
    this.magazine = magazine;
    this.bolt = bolt;
    this.boltRestPosition = bolt.position.clone();
  }

  shoot(recoil: number): void {
    this.recoil = recoil;
  }

  startReload(duration: number): void {
    this.reloadElapsed = 0;
    this.reloadDuration = duration;
    this.recoil = 0;
  }

  completeReload(): void {
    this.reloadElapsed = 0;
    this.reloadDuration = 0;
    this.resetMovingParts();
  }

  update(delta: number, aiming: boolean): WeaponPose {
    this.elapsed += delta;
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, GameConfig.WEAPON.RECOIL_RETURN_SPEED, delta);

    if (this.reloadDuration > 0) {
      this.reloadElapsed = Math.min(this.reloadDuration, this.reloadElapsed + delta);
    }

    const reloading = this.reloadDuration > 0;
    const targetPosition = aiming && !reloading ? this.adsPosition : this.hipPosition;
    this.restPosition.lerp(targetPosition, 1 - Math.exp(-GameConfig.WEAPON.ADS_TRANSITION_SPEED * delta));

    const sway = Math.sin(this.elapsed * GameConfig.WEAPON.WEAPON_SWAY_SPEED) * GameConfig.WEAPON.WEAPON_SWAY_AMOUNT;
    const swayScale = aiming && !reloading ? GameConfig.WEAPON.ADS_SWAY_SCALE : 1;
    const reloadProgress = reloading ? this.reloadElapsed / this.reloadDuration : 0;
    const reloadEnvelope = Math.sin(reloadProgress * Math.PI);

    this.posePosition.set(
      this.restPosition.x + sway * swayScale - reloadEnvelope * GameConfig.WEAPON.RELOAD_CENTER_SHIFT,
      this.restPosition.y - sway * swayScale + reloadEnvelope * GameConfig.WEAPON.RELOAD_RAISE_DISTANCE,
      this.restPosition.z + this.recoil * GameConfig.WEAPON.RECOIL_KICK_DISTANCE,
    );
    this.poseRotation.set(
      this.recoil * GameConfig.WEAPON.RECOIL_KICK_ROTATION + reloadEnvelope * GameConfig.WEAPON.RELOAD_TILT_X,
      reloadEnvelope * GameConfig.WEAPON.RELOAD_TILT_Y,
      sway * 2 * swayScale + reloadEnvelope * GameConfig.WEAPON.RELOAD_TILT_Z,
    );

    if (reloading) this.animateReloadParts(reloadProgress);
    return { position: this.posePosition, rotation: this.poseRotation };
  }

  private animateReloadParts(progress: number): void {
    const outStart = GameConfig.WEAPON.RELOAD_MAGAZINE_OUT_START;
    const outEnd = GameConfig.WEAPON.RELOAD_MAGAZINE_OUT_END;
    const swap = GameConfig.WEAPON.RELOAD_MAGAZINE_SWAP;
    const inEnd = GameConfig.WEAPON.RELOAD_MAGAZINE_IN_END;
    let magazineTravel = 0;

    if (progress >= outStart && progress < outEnd) {
      magazineTravel = this.smoothStep((progress - outStart) / (outEnd - outStart));
    } else if (progress >= outEnd && progress < swap) {
      magazineTravel = 1;
    } else if (progress >= swap && progress < inEnd) {
      magazineTravel = 1 - this.smoothStep((progress - swap) / (inEnd - swap));
    }

    this.magazine.position.set(
      magazineTravel * GameConfig.WEAPON.RELOAD_MAGAZINE_SIDE_SHIFT,
      -magazineTravel * GameConfig.WEAPON.RELOAD_DROP_DISTANCE,
      0,
    );
    this.magazine.rotation.z = -magazineTravel * GameConfig.WEAPON.RELOAD_MAGAZINE_TILT;

    const boltStart = GameConfig.WEAPON.RELOAD_BOLT_START;
    const boltEnd = GameConfig.WEAPON.RELOAD_BOLT_END;
    const boltProgress = THREE.MathUtils.clamp((progress - boltStart) / (boltEnd - boltStart), 0, 1);
    this.bolt.position.copy(this.boltRestPosition);
    this.bolt.position.z += Math.sin(boltProgress * Math.PI) * GameConfig.WEAPON.RELOAD_BOLT_TRAVEL;
  }

  private smoothStep(value: number): number {
    const clamped = THREE.MathUtils.clamp(value, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  private resetMovingParts(): void {
    this.magazine.position.set(0, 0, 0);
    this.magazine.rotation.set(0, 0, 0);
    this.bolt.position.copy(this.boltRestPosition);
  }
}
