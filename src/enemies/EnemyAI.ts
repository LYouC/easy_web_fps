import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { EnemyAttackRequestEvent, WorldAreaClearRequestEvent, WorldRaycastRequestEvent } from '@/core/GameEvents';
import { EnemyBase } from '@/enemies/EnemyBase';

export class EnemyAI {
  private readonly eventBus = EventBus.getInstance();
  private attackCooldown = 0;
  private aimRemaining = 0;
  private attackEligible = false;
  private readonly steeringSign: number;

  constructor(
    private readonly enemy: EnemyBase,
    private readonly getNearbyEnemies: () => readonly EnemyBase[]
  ) {
    this.steeringSign = this.hashId(enemy.getId()) % 2 === 0 ? 1 : -1;
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    if (this.enemy.isDead() || this.enemy.getState() === 'spawning') return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const toPlayer = playerPosition.clone().sub(this.enemy.getPosition());
    const distance = toPlayer.length();
    const canSeePlayer = distance <= GameConfig.ENEMY.VISION_RANGE && this.hasLineOfSight(playerPosition);
    this.enemy.faceDirection(new THREE.Vector3(toPlayer.x, 0, toPlayer.z));

    if (canSeePlayer && distance <= this.enemy.getDefinition().attackRange) {
      if (!this.attackEligible) {
        this.attackEligible = true;
        this.aimRemaining = this.enemy.getDefinition().reactionTime;
      }
      this.aimRemaining = Math.max(0, this.aimRemaining - delta);
      if (this.aimRemaining > 0) {
        this.enemy.setState('aim');
        return;
      }
      this.enemy.setState('attack');
      if (this.attackCooldown === 0) this.attack(playerPosition);
      return;
    }

    this.attackEligible = false;
    this.aimRemaining = 0;

    if (distance <= GameConfig.ENEMY.VISION_RANGE) {
      this.enemy.setState('chase');
      this.chase(delta, toPlayer);
      return;
    }

    this.enemy.setState('idle');
  }

  private attack(playerPosition: THREE.Vector3): void {
    const definition = this.enemy.getDefinition();
    this.attackCooldown = definition.attackInterval;
    const request: EnemyAttackRequestEvent = {
      enemyId: this.enemy.getId(),
      origin: this.enemy.getMuzzlePosition(),
      target: playerPosition.clone(),
      damage: definition.damage,
      accuracy: definition.accuracy,
    };
    this.eventBus.emit('enemy:attackRequested', request);
    this.eventBus.emit('enemy:attacked', definition.type);
  }

  private chase(delta: number, toPlayer: THREE.Vector3): void {
    const direction = new THREE.Vector3(toPlayer.x, 0, toPlayer.z);
    if (direction.lengthSq() === 0) return;
    direction.normalize();
    direction.add(this.getSeparation()).normalize();

    const distance = this.enemy.getPosition().distanceTo(new THREE.Vector3(
      this.enemy.getPosition().x + toPlayer.x,
      this.enemy.getPosition().y,
      this.enemy.getPosition().z + toPlayer.z
    ));
    if (distance <= this.enemy.getDefinition().radius + GameConfig.ENEMY.ARRIVAL_MARGIN) return;

    const step = this.enemy.getDefinition().speed * delta;
    const current = this.enemy.getPosition();
    const candidate = current.clone().addScaledVector(direction, step);
    if (this.canOccupy(candidate)) {
      current.copy(candidate);
      return;
    }

    const slideX = current.clone();
    slideX.x += direction.x * step;
    if (this.canOccupy(slideX)) {
      current.copy(slideX);
      return;
    }

    const slideZ = current.clone();
    slideZ.z += direction.z * step;
    if (this.canOccupy(slideZ)) {
      current.copy(slideZ);
      return;
    }

    const detour = new THREE.Vector3(direction.z * this.steeringSign, 0, -direction.x * this.steeringSign);
    const detourCandidate = current.clone().addScaledVector(detour, step);
    if (this.canOccupy(detourCandidate)) current.copy(detourCandidate);
  }

  private getSeparation(): THREE.Vector3 {
    const separation = new THREE.Vector3();
    const current = this.enemy.getPosition();
    for (const other of this.getNearbyEnemies()) {
      if (other === this.enemy || other.isDead()) continue;
      const away = current.clone().sub(other.getPosition());
      away.y = 0;
      const distance = away.length();
      const minimum = GameConfig.ENEMY.SEPARATION_DISTANCE
        + this.enemy.getDefinition().radius
        + other.getDefinition().radius;
      if (distance === 0 || distance >= minimum) continue;
      separation.add(away.normalize().multiplyScalar((minimum - distance) / minimum));
    }
    return separation.multiplyScalar(GameConfig.ENEMY.SEPARATION_STRENGTH);
  }

  private canOccupy(position: THREE.Vector3): boolean {
    const request: WorldAreaClearRequestEvent = {
      position,
      radius: this.enemy.getDefinition().radius,
      height: GameConfig.ENEMY.HEIGHT * this.enemy.getDefinition().scale,
      clear: true,
    };
    this.eventBus.emit('world:areaClearRequested', request);
    return request.clear;
  }

  private hasLineOfSight(playerPosition: THREE.Vector3): boolean {
    const origin = this.enemy.getMuzzlePosition();
    const direction = playerPosition.clone().sub(origin);
    const distance = direction.length();
    const request: WorldRaycastRequestEvent = { origin, direction, maxDistance: distance, result: null };
    this.eventBus.emit('world:raycastRequested', request);
    return request.result === null;
  }

  private hashId(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    return hash;
  }
}
