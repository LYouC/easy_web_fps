import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { GameStateChangedEvent, WeaponAimChangedEvent, WeaponChangedEvent } from '@/core/GameEvents';
import { InputManager } from '@/core/InputManager';

export class AimController {
  private readonly eventBus = EventBus.getInstance();
  private aiming = false;
  private active = false;
  private rifleEquipped = true;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly inputManager: InputManager
  ) {
    this.eventBus.on('game:stateChanged', this.onGameStateChanged);
    this.eventBus.on('weapon:changed', this.onWeaponChanged);
  }

  update(delta: number): void {
    const nextAiming = this.active && this.rifleEquipped
      && this.inputManager.isPointerLocked()
      && this.inputManager.isMouseButtonDown(2);
    this.setAiming(nextAiming);
    const targetFov = this.aiming ? GameConfig.WEAPON.ADS_FOV : GameConfig.VISUAL.CAMERA_FOV;
    const nextFov = THREE.MathUtils.damp(this.camera.fov, targetFov, GameConfig.WEAPON.ADS_TRANSITION_SPEED, delta);
    if (Math.abs(nextFov - this.camera.fov) > 0.001) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private setAiming(aiming: boolean): void {
    if (this.aiming === aiming) return;
    this.aiming = aiming;
    const event: WeaponAimChangedEvent = { aiming };
    this.eventBus.emit('weapon:aimChanged', event);
  }

  private onGameStateChanged = (...args: unknown[]): void => {
    const event = args[0] as GameStateChangedEvent | undefined;
    if (!event) return;
    this.active = event.current === 'playing';
    if (!this.active) {
      this.setAiming(false);
      this.camera.fov = GameConfig.VISUAL.CAMERA_FOV;
      this.camera.updateProjectionMatrix();
    }
  };

  private onWeaponChanged = (...args: unknown[]): void => {
    const event = args[0] as WeaponChangedEvent | undefined;
    if (!event) return;
    this.rifleEquipped = event.weapon === 'rifle';
    if (!this.rifleEquipped) this.setAiming(false);
  };

  dispose(): void {
    this.eventBus.off('game:stateChanged', this.onGameStateChanged);
    this.eventBus.off('weapon:changed', this.onWeaponChanged);
    this.setAiming(false);
    this.camera.fov = GameConfig.VISUAL.CAMERA_FOV;
    this.camera.updateProjectionMatrix();
  }
}
