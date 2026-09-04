import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { EnemyDiedEvent, EnemyType, PlayerTransformEvent, WaveCompletedEvent, WaveStartedEvent, WorldAreaClearRequestEvent } from '@/core/GameEvents';
import { EnemyAI } from '@/enemies/EnemyAI';
import { EnemyBase } from '@/enemies/EnemyBase';
import { getEnemyDefinition } from '@/enemies/EnemyTypes';

interface EnemyController {
  enemy: EnemyBase;
  ai: EnemyAI;
}

export class WaveManager {
  private readonly eventBus = EventBus.getInstance();
  private readonly enemies: EnemyController[] = [];
  private readonly aliveIds = new Set<string>();
  private currentWave = 0;
  private enemySequence = 0;
  private breakRemaining = 0;
  private awaitingFirstWave = true;
  private readonly playerPosition = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene) {
    this.eventBus.on('enemy:died', this.onEnemyDied);
    this.eventBus.on('player:transformChanged', this.onPlayerTransformChanged);
  }

  update(delta: number, combatActive: boolean): void {
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const controller = this.enemies[index];
      if (!controller) continue;
      controller.enemy.update(delta, this.playerPosition);
      if (combatActive) controller.ai.update(delta, this.playerPosition);
      if (!controller.enemy.isReadyToRemove()) continue;
      controller.enemy.dispose();
      this.enemies.splice(index, 1);
    }

    if (!combatActive) return;
    if (this.awaitingFirstWave) {
      this.awaitingFirstWave = false;
      this.startNextWave();
      return;
    }
    if (this.breakRemaining <= 0) return;
    this.breakRemaining = Math.max(0, this.breakRemaining - delta);
    if (this.breakRemaining === 0) this.startNextWave();
  }

  private onPlayerTransformChanged = (...args: unknown[]): void => {
    const event = args[0] as PlayerTransformEvent | undefined;
    if (event) this.playerPosition.copy(event.position);
  };

  private onEnemyDied = (...args: unknown[]): void => {
    const event = args[0] as EnemyDiedEvent | undefined;
    if (!event || !this.aliveIds.delete(event.enemyId) || this.aliveIds.size > 0) return;
    this.breakRemaining = GameConfig.WAVE.BREAK_DURATION;
    const completed: WaveCompletedEvent = {
      wave: this.currentWave,
      nextWave: this.currentWave + 1,
      delay: this.breakRemaining,
    };
    this.eventBus.emit('wave:completed', completed);
  };

  private startNextWave(): void {
    this.currentWave += 1;
    const enemyCount = GameConfig.WAVE.BASE_ENEMY_COUNT
      + (this.currentWave - 1) * GameConfig.WAVE.ENEMY_COUNT_INCREMENT;
    for (let index = 0; index < enemyCount; index += 1) this.spawnEnemy(this.selectType(index), index, enemyCount);
    const started: WaveStartedEvent = { wave: this.currentWave, enemyCount };
    this.eventBus.emit('wave:started', started);
  }

  private selectType(index: number): EnemyType {
    const slot = index + 1;
    if (this.currentWave >= GameConfig.WAVE.ELITE_START_WAVE && slot % GameConfig.WAVE.ELITE_INTERVAL === 0) {
      return 'elite';
    }
    if (this.currentWave >= GameConfig.WAVE.HEAVY_START_WAVE && slot % GameConfig.WAVE.HEAVY_INTERVAL === 0) {
      return 'heavy';
    }
    return 'normal';
  }

  private spawnEnemy(type: EnemyType, index: number, enemyCount: number): void {
    const id = `w${this.currentWave}_enemy_${this.enemySequence}`;
    this.enemySequence += 1;
    const position = this.findSpawnPosition(index, enemyCount);
    const enemy = new EnemyBase(this.scene, id, getEnemyDefinition(type), position);
    const ai = new EnemyAI(enemy, () => this.enemies.map((entry) => entry.enemy));
    this.enemies.push({ enemy, ai });
    this.aliveIds.add(id);
  }

  private findSpawnPosition(index: number, enemyCount: number): THREE.Vector3 {
    const player = this.playerPosition;
    for (let attempt = 0; attempt < GameConfig.WAVE.SPAWN_ATTEMPTS; attempt += 1) {
      const baseAngle = (index / enemyCount) * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * (Math.PI * 2 / enemyCount);
      const radius = GameConfig.WAVE.SPAWN_RADIUS
        + (Math.random() - 0.5) * GameConfig.WAVE.SPAWN_RADIUS_VARIANCE * 2;
      const position = new THREE.Vector3(
        player.x + Math.cos(angle) * radius,
        0,
        player.z + Math.sin(angle) * radius
      );
      if (position.distanceTo(new THREE.Vector3(player.x, 0, player.z)) < GameConfig.WAVE.MIN_SPAWN_DISTANCE) continue;
      if (this.isSpawnClear(position)) return position;
    }
    const angle = (index / enemyCount) * Math.PI * 2;
    return new THREE.Vector3(
      player.x + Math.cos(angle) * GameConfig.WAVE.SPAWN_RADIUS,
      0,
      player.z + Math.sin(angle) * GameConfig.WAVE.SPAWN_RADIUS
    );
  }

  private isSpawnClear(position: THREE.Vector3): boolean {
    const request: WorldAreaClearRequestEvent = {
      position,
      radius: GameConfig.WAVE.SPAWN_CLEARANCE,
      height: GameConfig.ENEMY.HEIGHT * GameConfig.ENEMY.HEAVY_SCALE,
      clear: true,
    };
    this.eventBus.emit('world:areaClearRequested', request);
    return request.clear
      && this.enemies.every(({ enemy }) => enemy.getPosition().distanceTo(position) >= GameConfig.ENEMY.SEPARATION_DISTANCE);
  }

  dispose(): void {
    this.eventBus.off('enemy:died', this.onEnemyDied);
    this.eventBus.off('player:transformChanged', this.onPlayerTransformChanged);
    this.enemies.forEach(({ enemy }) => enemy.dispose());
    this.enemies.length = 0;
    this.aliveIds.clear();
  }
}
