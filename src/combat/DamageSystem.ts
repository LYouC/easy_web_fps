import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type {
  EnemyAttackResolvedEvent,
  EnemyDamagedEvent,
  EnemyDiedEvent,
  EnemyHitZone,
  EnemySpawnedEvent,
  ScoreChangedEvent,
  ShotHitEvent,
} from '@/core/GameEvents';

interface EnemyHealthRecord extends EnemySpawnedEvent {
  hp: number;
}

export class DamageSystem {
  private readonly eventBus = EventBus.getInstance();
  private readonly enemies = new Map<string, EnemyHealthRecord>();
  private score = 0;

  constructor() {
    this.eventBus.on('enemy:spawned', this.onEnemySpawned);
    this.eventBus.on('combat:shotHit', this.onShotHit);
    this.eventBus.on('combat:enemyAttackResolved', this.onEnemyAttackResolved);
  }

  private onEnemySpawned = (...args: unknown[]): void => {
    const event = args[0] as EnemySpawnedEvent | undefined;
    if (!event) return;
    this.enemies.set(event.enemyId, { ...event, hp: event.maxHp });
  };

  private onShotHit = (...args: unknown[]): void => {
    const hit = args[0] as ShotHitEvent | undefined;
    if (!hit) return;
    const enemyId = this.findEnemyId(hit.object);
    if (!enemyId) return;
    const record = this.enemies.get(enemyId);
    if (!record || record.hp <= 0) return;

    const hitZone = this.findHitZone(hit.object);
    const damage = hit.damage * this.getDamageMultiplier(hitZone);
    record.hp = Math.max(0, record.hp - damage);
    const damaged: EnemyDamagedEvent = {
      enemyId,
      damage,
      hp: record.hp,
      maxHp: record.maxHp,
      hitPoint: hit.point.clone(),
      hitZone,
    };
    this.eventBus.emit('enemy:damaged', damaged);

    if (record.hp > 0) return;
    const died: EnemyDiedEvent = {
      enemyId,
      type: record.type,
      points: record.points,
      position: this.findEnemyRoot(hit.object).getWorldPosition(new THREE.Vector3()),
    };
    this.score += record.points;
    const score: ScoreChangedEvent = { score: this.score, added: record.points };
    this.eventBus.emit('enemy:died', died);
    this.eventBus.emit('score:changed', score);
    this.enemies.delete(enemyId);
  };

  private onEnemyAttackResolved = (...args: unknown[]): void => {
    const attack = args[0] as EnemyAttackResolvedEvent | undefined;
    if (!attack) return;
    if (attack.blocked) {
      this.eventBus.emit('combat:enemyAttackBlocked', attack);
      this.eventBus.emit('enemy:attackVisual', attack);
      return;
    }
    if (Math.random() > attack.accuracy) {
      attack.impactPoint = attack.target.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * GameConfig.ENEMY.ATTACK_MISS_OFFSET,
        (Math.random() - 0.5) * GameConfig.ENEMY.ATTACK_MISS_OFFSET,
        (Math.random() - 0.5) * GameConfig.ENEMY.ATTACK_MISS_OFFSET
      ));
      this.eventBus.emit('combat:enemyAttackMissed', attack);
      this.eventBus.emit('enemy:attackVisual', attack);
      return;
    }
    this.eventBus.emit('enemy:attackVisual', attack);
    this.eventBus.emit('player:damageRequested', attack.damage);
  };

  private findEnemyId(object: THREE.Object3D): string | null {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (typeof current.userData.enemyId === 'string') return current.userData.enemyId;
      current = current.parent;
    }
    return null;
  }

  private findHitZone(object: THREE.Object3D): EnemyHitZone {
    let current: THREE.Object3D | null = object;
    while (current) {
      const hitZone = current.userData.enemyHitZone;
      if (hitZone === 'head' || hitZone === 'body' || hitZone === 'armor') return hitZone;
      current = current.parent;
    }
    return 'body';
  }

  private getDamageMultiplier(hitZone: EnemyHitZone): number {
    if (hitZone === 'head') return GameConfig.ENEMY.HEAD_DAMAGE_MULTIPLIER;
    if (hitZone === 'armor') return GameConfig.ENEMY.ARMOR_DAMAGE_MULTIPLIER;
    return GameConfig.ENEMY.BODY_DAMAGE_MULTIPLIER;
  }

  private findEnemyRoot(object: THREE.Object3D): THREE.Object3D {
    let root = object;
    let current = object.parent;
    while (current && typeof current.userData.enemyId === 'string') {
      root = current;
      current = current.parent;
    }
    return root;
  }

  dispose(): void {
    this.eventBus.off('enemy:spawned', this.onEnemySpawned);
    this.eventBus.off('combat:shotHit', this.onShotHit);
    this.eventBus.off('combat:enemyAttackResolved', this.onEnemyAttackResolved);
    this.enemies.clear();
  }
}
