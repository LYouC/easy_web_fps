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

export interface AmmoPickupRequestEvent {
  pickupId: string;
  amount: number;
  accepted: boolean;
  granted: number;
}

export interface PickupSpawnedEvent {
  pickupId: string;
  position: THREE.Vector3;
  source: 'map' | 'enemy';
  amount: number;
}

export interface PickupCollectedEvent {
  pickupId: string;
  position: THREE.Vector3;
  amount: number;
}

export interface ShotHitEvent {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  object: THREE.Object3D;
  damage: number;
}

export type EnemyType = 'normal' | 'heavy' | 'elite';
export type EnemyState = 'spawning' | 'idle' | 'chase' | 'aim' | 'attack' | 'dead';
export type EnemyHitZone = 'head' | 'body' | 'armor';

export interface EnemySpawnedEvent {
  enemyId: string;
  type: EnemyType;
  maxHp: number;
  points: number;
}

export interface EnemyDamagedEvent {
  enemyId: string;
  damage: number;
  hp: number;
  maxHp: number;
  hitPoint: THREE.Vector3;
  hitZone: EnemyHitZone;
}

export interface EnemyDiedEvent {
  enemyId: string;
  type: EnemyType;
  points: number;
  position: THREE.Vector3;
}

export interface EnemyAttackRequestEvent {
  enemyId: string;
  origin: THREE.Vector3;
  target: THREE.Vector3;
  damage: number;
  accuracy: number;
}

export interface EnemyAttackResolvedEvent extends EnemyAttackRequestEvent {
  blocked: boolean;
  impactPoint: THREE.Vector3;
}

export interface PlayerHealthEvent {
  hp: number;
  maxHp: number;
  damage: number;
}

export interface PlayerTransformEvent {
  position: THREE.Vector3;
}

export interface WaveStartedEvent {
  wave: number;
  enemyCount: number;
}

export interface WaveCompletedEvent {
  wave: number;
  nextWave: number;
  delay: number;
}

export interface ScoreChangedEvent {
  score: number;
  added: number;
}

export interface WorldRaycastHit {
  hit: true;
  point: THREE.Vector3;
  id: string;
}

export interface WorldRaycastRequestEvent {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  maxDistance: number;
  result: WorldRaycastHit | null;
}

export interface WorldAreaClearRequestEvent {
  position: THREE.Vector3;
  radius: number;
  height: number;
  clear: boolean;
}

export interface WorldSpawnPointsRequestEvent {
  points: THREE.Vector3[];
}

export interface WorldCoverPoint {
  id: string;
  position: THREE.Vector3;
}

export interface WorldCoverPointsRequestEvent {
  points: WorldCoverPoint[];
}

export interface WorldCoverClaimRequestEvent {
  coverId: string;
  enemyId: string;
  claimed: boolean;
}

export interface WorldCoverReleaseEvent {
  coverId: string;
  enemyId: string;
}
