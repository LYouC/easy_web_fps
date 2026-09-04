import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type {
  EnemyAttackRequestEvent,
  EnemyDamagedEvent,
  WorldAreaClearRequestEvent,
  WorldCoverClaimRequestEvent,
  WorldCoverPoint,
  WorldCoverPointsRequestEvent,
  WorldCoverReleaseEvent,
  WorldRaycastRequestEvent,
} from '@/core/GameEvents';
import { EnemyBase } from '@/enemies/EnemyBase';
import { EnemyTactics } from '@/enemies/EnemyTactics';

export class EnemyAI {
  private readonly eventBus = EventBus.getInstance();
  private readonly lastKnownPlayerPosition = new THREE.Vector3();
  private attackCooldown = 0;
  private aimRemaining = 0;
  private attackEligible = false;
  private readonly steeringSign: number;
  private strafeSign: number;
  private strafeSwitchRemaining: number;
  private strafeSequence = 0;
  private sightMemoryRemaining = 0;
  private suppressionRemaining = 0;
  private attacksSinceCover = 0;
  private coverPoint: WorldCoverPoint | null = null;
  private coverReevaluateRemaining: number;
  private coverTravelRemaining = 0;
  private coverHoldRemaining = 0;
  private coverEvaluationSequence = 0;

  constructor(
    private readonly enemy: EnemyBase,
    private readonly getNearbyEnemies: () => readonly EnemyBase[]
  ) {
    this.steeringSign = this.hashId(enemy.getId()) % 2 === 0 ? 1 : -1;
    this.strafeSign = this.steeringSign;
    this.strafeSwitchRemaining = this.nextStrafeInterval();
    this.coverReevaluateRemaining = this.nextCoverInterval();
    this.eventBus.on('enemy:damaged', this.onEnemyDamaged);
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    if (this.enemy.isDead() || this.enemy.getState() === 'spawning') return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.coverReevaluateRemaining = Math.max(0, this.coverReevaluateRemaining - delta);
    this.suppressionRemaining = Math.max(0, this.suppressionRemaining - delta);
    this.sightMemoryRemaining = Math.max(0, this.sightMemoryRemaining - delta);
    this.updateStrafeTimer(delta);

    const toPlayer = playerPosition.clone().sub(this.enemy.getPosition());
    const distance = toPlayer.length();
    const canSeePlayer = distance <= GameConfig.ENEMY.VISION_RANGE && this.hasLineOfSight(playerPosition);
    if (canSeePlayer) {
      this.lastKnownPlayerPosition.copy(playerPosition);
      this.sightMemoryRemaining = GameConfig.ENEMY.LAST_SEEN_MEMORY;
    }
    this.enemy.faceDirection(new THREE.Vector3(toPlayer.x, 0, toPlayer.z));

    if (canSeePlayer && distance <= this.enemy.getDefinition().attackRange) {
      this.updateRangedCombat(delta, playerPosition, toPlayer, distance);
      return;
    }

    this.attackEligible = false;
    this.aimRemaining = 0;
    if (this.coverPoint) {
      this.moveToCover(delta, playerPosition);
      return;
    }

    if (canSeePlayer) {
      if (this.shouldSeekCover() && this.coverReevaluateRemaining === 0) this.selectCover(playerPosition);
      if (this.coverPoint) {
        this.moveToCover(delta, playerPosition);
        return;
      }
      this.enemy.setState('chase');
      this.moveTowards(delta, toPlayer, this.enemy.getDefinition().radius + GameConfig.ENEMY.ARRIVAL_MARGIN);
      return;
    }

    if (this.sightMemoryRemaining > 0) {
      const toLastKnown = this.lastKnownPlayerPosition.clone().sub(this.enemy.getPosition());
      toLastKnown.y = 0;
      if (toLastKnown.length() <= GameConfig.ENEMY.LAST_SEEN_ARRIVAL_DISTANCE) {
        this.sightMemoryRemaining = 0;
      } else {
        this.enemy.setState('chase');
        this.enemy.faceDirection(toLastKnown);
        this.moveTowards(delta, toLastKnown, GameConfig.ENEMY.LAST_SEEN_ARRIVAL_DISTANCE);
        return;
      }
    }

    this.releaseCover();
    this.enemy.setState('idle');
  }

  private updateRangedCombat(
    delta: number,
    playerPosition: THREE.Vector3,
    toPlayer: THREE.Vector3,
    distance: number
  ): void {
    if (!this.attackEligible) {
      this.attackEligible = true;
      this.aimRemaining = this.enemy.getDefinition().reactionTime;
    }
    this.aimRemaining = Math.max(0, this.aimRemaining - delta);
    if (this.aimRemaining > 0) {
      this.enemy.setState('aim');
      return;
    }
    if (this.attackCooldown === 0) {
      this.releaseCover();
      this.enemy.setState('attack');
      this.attack(playerPosition);
      return;
    }
    if (
      this.attackCooldown > GameConfig.ENEMY.COVER_COOLDOWN_WINDOW
      && this.shouldSeekCover()
      && !this.coverPoint
      && this.coverReevaluateRemaining === 0
    ) {
      this.selectCover(playerPosition);
    }
    if (this.coverPoint) {
      this.moveToCover(delta, playerPosition);
      return;
    }
    this.enemy.setState('chase');
    this.combatManeuver(delta, toPlayer, distance);
  }

  private combatManeuver(delta: number, toPlayer: THREE.Vector3, distance: number): void {
    const attackRange = this.enemy.getDefinition().attackRange;
    const maneuver = EnemyTactics.chooseRangeManeuver(
      distance,
      attackRange,
      GameConfig.ENEMY.PREFERRED_RANGE_MIN_FACTOR,
      GameConfig.ENEMY.PREFERRED_RANGE_MAX_FACTOR
    );
    if (maneuver === 'retreat') {
      this.moveInDirection(delta, toPlayer.clone().negate(), GameConfig.ENEMY.RETREAT_SPEED_SCALE);
      return;
    }
    if (maneuver === 'advance') {
      this.moveInDirection(delta, toPlayer, GameConfig.ENEMY.STRAFE_SPEED_SCALE);
      return;
    }
    const lateral = new THREE.Vector3(toPlayer.z * this.strafeSign, 0, -toPlayer.x * this.strafeSign);
    const moved = this.moveInDirection(delta, lateral, GameConfig.ENEMY.STRAFE_SPEED_SCALE);
    if (!moved) {
      this.strafeSign *= -1;
      this.strafeSwitchRemaining = this.nextStrafeInterval();
    }
  }

  private attack(playerPosition: THREE.Vector3): void {
    const definition = this.enemy.getDefinition();
    this.attackCooldown = definition.attackInterval;
    this.attacksSinceCover += 1;
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

  private onEnemyDamaged = (...args: unknown[]): void => {
    const event = args[0] as EnemyDamagedEvent | undefined;
    if (!event || event.enemyId !== this.enemy.getId() || this.enemy.isDead()) return;
    this.suppressionRemaining = GameConfig.ENEMY.SUPPRESSION_DURATION;
    this.coverReevaluateRemaining = 0;
  };

  private shouldSeekCover(): boolean {
    return EnemyTactics.shouldSeekCover(
      this.suppressionRemaining,
      this.enemy.getHealthRatio(),
      GameConfig.ENEMY.LOW_HEALTH_COVER_RATIO,
      this.attacksSinceCover,
      GameConfig.ENEMY.COVER_AFTER_ATTACKS
    );
  }

  private selectCover(playerPosition: THREE.Vector3): void {
    this.coverReevaluateRemaining = this.nextCoverInterval();
    const request: WorldCoverPointsRequestEvent = { points: [] };
    this.eventBus.emit('world:coverPointsRequested', request);
    const current = this.enemy.getPosition();
    const candidates = request.points
      .filter((point) => current.distanceTo(point.position) <= GameConfig.ENEMY.COVER_SEARCH_RADIUS)
      .filter((point) => point.position.distanceTo(playerPosition) >= GameConfig.ENEMY.COVER_MIN_PLAYER_DISTANCE)
      .filter((point) => this.canOccupy(point.position))
      .filter((point) => this.isCoveredAt(point.position, playerPosition))
      .sort((left, right) => current.distanceToSquared(left.position) - current.distanceToSquared(right.position));

    for (const candidate of candidates) {
      const claim: WorldCoverClaimRequestEvent = {
        coverId: candidate.id,
        enemyId: this.enemy.getId(),
        claimed: false,
      };
      this.eventBus.emit('world:coverClaimRequested', claim);
      if (!claim.claimed) continue;
      this.coverPoint = { id: candidate.id, position: candidate.position.clone() };
      this.coverTravelRemaining = GameConfig.ENEMY.COVER_MAX_TRAVEL_TIME;
      this.coverHoldRemaining = GameConfig.ENEMY.COVER_HOLD_DURATION;
      this.attacksSinceCover = 0;
      return;
    }
  }

  private moveToCover(delta: number, playerPosition: THREE.Vector3): void {
    const cover = this.coverPoint;
    if (!cover) return;
    this.enemy.setState('chase');
    const toCover = cover.position.clone().sub(this.enemy.getPosition());
    toCover.y = 0;
    if (toCover.length() <= GameConfig.ENEMY.COVER_ARRIVAL_DISTANCE) {
      this.coverHoldRemaining = Math.max(0, this.coverHoldRemaining - delta);
      if (this.coverHoldRemaining === 0 || !this.isCoveredAt(this.enemy.getPosition(), playerPosition)) this.releaseCover();
      return;
    }
    this.coverTravelRemaining = Math.max(0, this.coverTravelRemaining - delta);
    if (this.coverTravelRemaining === 0) {
      this.releaseCover();
      return;
    }
    this.moveTowards(delta, toCover, GameConfig.ENEMY.COVER_ARRIVAL_DISTANCE);
  }

  private moveTowards(delta: number, directionToTarget: THREE.Vector3, arrivalDistance: number): boolean {
    const direction = new THREE.Vector3(directionToTarget.x, 0, directionToTarget.z);
    if (direction.length() <= arrivalDistance) return false;
    return this.moveInDirection(delta, direction, 1);
  }

  private moveInDirection(delta: number, requestedDirection: THREE.Vector3, speedScale: number): boolean {
    const direction = new THREE.Vector3(requestedDirection.x, 0, requestedDirection.z);
    if (direction.lengthSq() === 0) return false;
    direction.normalize().add(this.getSeparation()).normalize();
    const step = this.enemy.getDefinition().speed * speedScale * delta;
    const current = this.enemy.getPosition();
    const candidate = current.clone().addScaledVector(direction, step);
    if (this.canOccupy(candidate)) {
      current.copy(candidate);
      return true;
    }
    const slideX = current.clone();
    slideX.x += direction.x * step;
    if (this.canOccupy(slideX)) {
      current.copy(slideX);
      return true;
    }
    const slideZ = current.clone();
    slideZ.z += direction.z * step;
    if (this.canOccupy(slideZ)) {
      current.copy(slideZ);
      return true;
    }
    const detour = new THREE.Vector3(direction.z * this.steeringSign, 0, -direction.x * this.steeringSign);
    const detourCandidate = current.clone().addScaledVector(detour, step);
    if (!this.canOccupy(detourCandidate)) return false;
    current.copy(detourCandidate);
    return true;
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

  private isCoveredAt(position: THREE.Vector3, playerPosition: THREE.Vector3): boolean {
    const target = position.clone().add(new THREE.Vector3(0, GameConfig.ENEMY.MUZZLE_Y * this.enemy.getDefinition().scale, 0));
    const direction = target.clone().sub(playerPosition);
    const distance = direction.length();
    const request: WorldRaycastRequestEvent = { origin: playerPosition.clone(), direction, maxDistance: distance, result: null };
    this.eventBus.emit('world:raycastRequested', request);
    return request.result !== null;
  }

  private updateStrafeTimer(delta: number): void {
    this.strafeSwitchRemaining = Math.max(0, this.strafeSwitchRemaining - delta);
    if (this.strafeSwitchRemaining > 0) return;
    this.strafeSign *= -1;
    this.strafeSwitchRemaining = this.nextStrafeInterval();
  }

  private nextStrafeInterval(): number {
    this.strafeSequence += 1;
    const range = GameConfig.ENEMY.STRAFE_SWITCH_MAX - GameConfig.ENEMY.STRAFE_SWITCH_MIN;
    const hash = this.hashId(`${this.enemy.getId()}_strafe_${this.strafeSequence}`);
    return GameConfig.ENEMY.STRAFE_SWITCH_MIN + (hash % 1000) / 1000 * range;
  }

  private nextCoverInterval(): number {
    this.coverEvaluationSequence += 1;
    const range = GameConfig.ENEMY.COVER_REEVALUATE_MAX - GameConfig.ENEMY.COVER_REEVALUATE_MIN;
    const hash = this.hashId(`${this.enemy.getId()}_cover_${this.coverEvaluationSequence}`);
    return GameConfig.ENEMY.COVER_REEVALUATE_MIN + (hash % 1000) / 1000 * range;
  }

  private releaseCover(): void {
    if (!this.coverPoint) return;
    const event: WorldCoverReleaseEvent = { coverId: this.coverPoint.id, enemyId: this.enemy.getId() };
    this.eventBus.emit('world:coverReleased', event);
    this.coverPoint = null;
    this.coverTravelRemaining = 0;
    this.coverHoldRemaining = 0;
    this.coverReevaluateRemaining = this.nextCoverInterval();
  }

  private hashId(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    return hash;
  }

  dispose(): void {
    this.eventBus.off('enemy:damaged', this.onEnemyDamaged);
    this.releaseCover();
  }
}
