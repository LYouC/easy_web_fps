import { EventBus } from '@/core/EventBus';
import type { GameState, GameStateChangedEvent, GameStateChangeRequestEvent } from '@/core/GameEvents';
import { canTransitionGameState } from '@/core/GameStateTransitions';

export class GameStateManager {
  private readonly eventBus = EventBus.getInstance();
  private state: GameState = 'menu';

  constructor() {
    this.eventBus.on('game:stateChangeRequested', this.onStateChangeRequested);
  }

  getState(): GameState {
    return this.state;
  }

  private onStateChangeRequested = (...args: unknown[]): void => {
    const request = args[0] as GameStateChangeRequestEvent | undefined;
    if (!request || !canTransitionGameState(this.state, request.target) || request.target === this.state) return;
    const previous = this.state;
    this.state = request.target;
    const changed: GameStateChangedEvent = { previous, current: this.state, reason: request.reason };
    this.eventBus.emit('game:stateChanged', changed);
  };

  dispose(): void {
    this.eventBus.off('game:stateChangeRequested', this.onStateChangeRequested);
  }
}
