import { EventBus } from '@/core/EventBus';
import type { EnemyAttackRequestEvent, EnemyAttackResolvedEvent, WorldRaycastRequestEvent } from '@/core/GameEvents';

export class CoverSystem {
  private readonly eventBus = EventBus.getInstance();

  constructor() {
    this.eventBus.on('enemy:attackRequested', this.onAttackRequested);
  }

  private onAttackRequested = (...args: unknown[]): void => {
    const request = args[0] as EnemyAttackRequestEvent | undefined;
    if (!request) return;
    const direction = request.target.clone().sub(request.origin);
    const distance = direction.length();
    const raycast: WorldRaycastRequestEvent = {
      origin: request.origin.clone(),
      direction,
      maxDistance: distance,
      result: null,
    };
    this.eventBus.emit('world:raycastRequested', raycast);
    const coverHit = raycast.result;
    const resolved: EnemyAttackResolvedEvent = {
      ...request,
      blocked: coverHit !== null,
      impactPoint: coverHit?.point.clone() ?? request.target.clone(),
    };
    this.eventBus.emit('combat:enemyAttackResolved', resolved);
  };

  dispose(): void {
    this.eventBus.off('enemy:attackRequested', this.onAttackRequested);
  }
}
