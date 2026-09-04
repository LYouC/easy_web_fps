import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type {
  EnemyDiedEvent,
  PickupSpawnedEvent,
  PlayerTransformEvent,
  WorldAreaClearRequestEvent,
  WorldSpawnPointsRequestEvent,
} from '@/core/GameEvents';
import { AmmoPickup } from '@/pickups/AmmoPickup';
import { PickupSpawnRules } from '@/pickups/PickupSpawnRules';
import { AmmoAmountRules } from '@/pickups/AmmoAmountRules';
import type { DifficultyProfile } from '@/config/DifficultyConfig';

export class PickupSpawner {
  private readonly eventBus = EventBus.getInstance();
  private readonly pickups: AmmoPickup[] = [];
  private readonly playerPosition = new THREE.Vector3();
  private spawnElapsed = 0;
  private sequence = 0;

  constructor(private readonly scene: THREE.Scene, private readonly difficulty: DifficultyProfile) {
    this.eventBus.on('player:transformChanged', this.onPlayerTransformChanged);
    this.eventBus.on('enemy:died', this.onEnemyDied);
  }

  update(delta: number, active: boolean): void {
    if (!active) return;
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      if (!pickup) continue;
      pickup.update(delta, this.playerPosition);
      if (!pickup.isReadyToRemove()) continue;
      pickup.dispose();
      this.pickups.splice(index, 1);
    }

    this.spawnElapsed += delta;
    const spawnInterval = GameConfig.PICKUP.MAP_SPAWN_INTERVAL * this.difficulty.mapPickupIntervalMultiplier;
    if (this.spawnElapsed < spawnInterval) return;
    this.spawnElapsed %= spawnInterval;
    if (this.countMapPickups() < GameConfig.PICKUP.MAX_MAP_PICKUPS) this.spawnMapPickup();
  }

  private onPlayerTransformChanged = (...args: unknown[]): void => {
    const event = args[0] as PlayerTransformEvent | undefined;
    if (event) this.playerPosition.copy(event.position);
  };

  private onEnemyDied = (...args: unknown[]): void => {
    const event = args[0] as EnemyDiedEvent | undefined;
    if (!event || this.pickups.length >= GameConfig.PICKUP.MAX_TOTAL_PICKUPS) return;
    const dropChance = Math.min(1, GameConfig.PICKUP.ENEMY_DROP_CHANCE * this.difficulty.enemyDropChanceMultiplier);
    if (Math.random() > dropChance) return;
    const position = this.findDropPosition(event.position);
    if (position) this.spawn(position, 'enemy');
  };

  private findDropPosition(origin: THREE.Vector3): THREE.Vector3 | null {
    for (let attempt = 0; attempt < GameConfig.PICKUP.ENEMY_DROP_SCATTER_ATTEMPTS; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * GameConfig.PICKUP.ENEMY_DROP_SCATTER_RADIUS;
      const candidate = new THREE.Vector3(
        origin.x + Math.cos(angle) * radius,
        0,
        origin.z + Math.sin(angle) * radius
      );
      if (this.isLegalPosition(candidate)) return candidate;
    }
    const fallback = new THREE.Vector3(origin.x, 0, origin.z);
    return this.isLegalPosition(fallback) ? fallback : null;
  }

  private spawnMapPickup(): void {
    if (this.pickups.length >= GameConfig.PICKUP.MAX_TOTAL_PICKUPS) return;
    const request: WorldSpawnPointsRequestEvent = { points: [] };
    this.eventBus.emit('world:spawnPointsRequested', request);
    const candidates = request.points.filter((point) => this.isLegalPosition(point));
    const position = candidates[Math.floor(Math.random() * candidates.length)];
    if (position) this.spawn(position, 'map');
  }

  private spawn(position: THREE.Vector3, source: 'map' | 'enemy'): void {
    const id = `ammo_${this.sequence}`;
    this.sequence += 1;
    const amount = this.rollAmmoAmount(source);
    const pickup = new AmmoPickup(this.scene, id, position, source, amount);
    this.pickups.push(pickup);
    const event: PickupSpawnedEvent = { pickupId: id, position: position.clone(), source, amount };
    this.eventBus.emit('pickup:spawned', event);
  }

  private rollAmmoAmount(source: 'map' | 'enemy'): number {
    const minimum = source === 'map' ? GameConfig.PICKUP.MAP_AMMO_MIN : GameConfig.PICKUP.ENEMY_AMMO_MIN;
    const maximum = source === 'map' ? GameConfig.PICKUP.MAP_AMMO_MAX : GameConfig.PICKUP.ENEMY_AMMO_MAX;
    return AmmoAmountRules.roll(minimum, maximum, GameConfig.PICKUP.AMMO_STEP);
  }

  private isLegalPosition(position: THREE.Vector3): boolean {
    if (!PickupSpawnRules.isWithinMap(position.x, position.z, GameConfig.WORLD.MAP_SIZE, GameConfig.PICKUP.SPAWN_CLEARANCE)) return false;
    const existing = this.pickups.map((pickup) => pickup.getGroundPosition());
    if (!PickupSpawnRules.hasSpacing(position.x, position.z, existing, GameConfig.PICKUP.MIN_SPACING)) return false;
    const request: WorldAreaClearRequestEvent = {
      position,
      radius: GameConfig.PICKUP.SPAWN_CLEARANCE,
      height: GameConfig.PICKUP.FLOAT_HEIGHT + GameConfig.PICKUP.BOX_HEIGHT,
      clear: true,
    };
    this.eventBus.emit('world:areaClearRequested', request);
    return request.clear;
  }

  private countMapPickups(): number {
    return this.pickups.filter((pickup) => pickup.getSource() === 'map').length;
  }

  dispose(): void {
    this.eventBus.off('player:transformChanged', this.onPlayerTransformChanged);
    this.eventBus.off('enemy:died', this.onEnemyDied);
    this.pickups.forEach((pickup) => pickup.dispose());
    this.pickups.length = 0;
  }
}
