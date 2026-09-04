import type * as THREE from 'three';

export interface PlayerShootEvent {
  origin: THREE.Vector3;
  muzzleOrigin: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  range: number;
  recoil: number;
}

export interface AmmoChangedEvent {
  magazine: number;
  reserve: number;
  magazineSize: number;
  reloading: boolean;
}

export interface ShotHitEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  object: THREE.Object3D;
  damage: number;
}
