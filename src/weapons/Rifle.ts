import type * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import type { InputManager } from '@/core/InputManager';
import { WeaponBase } from '@/weapons/WeaponBase';

export class Rifle extends WeaponBase {
  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager) {
    super(camera, inputManager, {
      damage: GameConfig.WEAPON.RIFLE_DAMAGE,
      fireInterval: GameConfig.WEAPON.RIFLE_FIRE_RATE,
      magazineSize: GameConfig.WEAPON.RIFLE_MAG_SIZE,
      reserveAmmo: GameConfig.WEAPON.RIFLE_RESERVE_AMMO,
      maxReserveAmmo: GameConfig.WEAPON.RIFLE_MAX_RESERVE_AMMO,
      reloadTime: GameConfig.WEAPON.RIFLE_RELOAD_TIME,
      range: GameConfig.WEAPON.RIFLE_RANGE,
      recoil: GameConfig.WEAPON.RIFLE_RECOIL,
    });
  }
}
