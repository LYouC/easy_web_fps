import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import { InputManager } from '@/core/InputManager';
import type { AmmoChangedEvent, AmmoPickupRequestEvent, PlayerShootEvent } from '@/core/GameEvents';
import { AmmoReserve } from '@/weapons/AmmoReserve';

export interface WeaponStats {
  damage: number;
  fireInterval: number;
  magazineSize: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  reloadTime: number;
  range: number;
  recoil: number;
}

export abstract class WeaponBase {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly inputManager: InputManager;
  private readonly eventBus: EventBus;
  private readonly stats: WeaponStats;
  private magazine: number;
  private reserve: AmmoReserve;
  private fireCooldown: number = 0;
  private reloadRemaining: number = 0;
  private reloadKeyDown: boolean = false;
  private dryFireReady: boolean = true;

  protected constructor(
    camera: THREE.PerspectiveCamera,
    inputManager: InputManager,
    stats: WeaponStats
  ) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.stats = stats;
    this.magazine = stats.magazineSize;
    this.reserve = new AmmoReserve(stats.reserveAmmo, stats.maxReserveAmmo);
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('pickup:ammoCollectionRequested', this.onAmmoCollectionRequested);
    this.emitAmmoChanged();
  }

  private onAmmoCollectionRequested = (...args: unknown[]): void => {
    const request = args[0] as AmmoPickupRequestEvent | undefined;
    if (!request || request.accepted || this.reserve.isFull()) return;
    const granted = this.reserve.add(request.amount);
    if (granted <= 0) return;
    request.accepted = true;
    request.granted = granted;
    this.emitAmmoChanged();
  };

  update(delta: number): void {
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);

    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - delta);
      if (this.reloadRemaining === 0) this.finishReload();
    }

    const reloadPressed = this.inputManager.isKeyDown('KeyR');
    if (reloadPressed && !this.reloadKeyDown) this.startReload();
    this.reloadKeyDown = reloadPressed;

    if (!this.inputManager.isPointerLocked()) return;

    if (this.inputManager.isMouseButtonDown(0)) {
      this.tryFire();
    } else {
      this.dryFireReady = true;
    }
  }

  private tryFire(): void {
    if (this.reloadRemaining > 0 || this.fireCooldown > 0) return;

    if (this.magazine === 0) {
      if (this.dryFireReady) {
        this.eventBus.emit('weapon:dryFire');
        this.dryFireReady = false;
      }
      if (!this.reserve.isEmpty()) this.startReload();
      return;
    }

    this.magazine -= 1;
    this.fireCooldown = this.stats.fireInterval;
    this.dryFireReady = true;

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const muzzleOrigin = new THREE.Vector3(
      GameConfig.WEAPON.MUZZLE_OFFSET_X,
      GameConfig.WEAPON.MUZZLE_OFFSET_Y,
      GameConfig.WEAPON.MUZZLE_OFFSET_Z
    );
    this.camera.localToWorld(muzzleOrigin);
    const shot: PlayerShootEvent = {
      origin: this.camera.getWorldPosition(new THREE.Vector3()),
      muzzleOrigin,
      direction,
      damage: this.stats.damage,
      range: this.stats.range,
      recoil: this.stats.recoil,
    };
    this.eventBus.emit('player:shoot', shot);
    this.emitAmmoChanged();
  }

  private startReload(): void {
    if (this.reloadRemaining > 0 || this.magazine === this.stats.magazineSize || this.reserve.isEmpty()) return;
    this.reloadRemaining = this.stats.reloadTime;
    this.eventBus.emit('weapon:reloadStarted', this.stats.reloadTime);
    this.emitAmmoChanged();
  }

  private finishReload(): void {
    const needed = this.stats.magazineSize - this.magazine;
    const loaded = this.reserve.take(needed);
    this.magazine += loaded;
    this.eventBus.emit('weapon:reloadCompleted');
    this.emitAmmoChanged();
  }

  private emitAmmoChanged(): void {
    const state: AmmoChangedEvent = {
      magazine: this.magazine,
      reserve: this.reserve.getAmount(),
      magazineSize: this.stats.magazineSize,
      reloading: this.reloadRemaining > 0,
    };
    this.eventBus.emit('weapon:ammoChanged', state);
  }

  dispose(): void {
    this.eventBus.off('pickup:ammoCollectionRequested', this.onAmmoCollectionRequested);
  }
}
