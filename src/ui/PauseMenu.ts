import { EventBus } from '@/core/EventBus';
import type { GameRestartRequestedEvent, GameResumeRequestedEvent, GameStateChangedEvent } from '@/core/GameEvents';

export class PauseMenu {
  private readonly eventBus = EventBus.getInstance();
  private readonly root = document.createElement('div');
  private readonly resumeButton: HTMLButtonElement;
  private readonly restartButton: HTMLButtonElement;

  constructor() {
    this.root.className = 'game-overlay pause-menu-overlay';
    this.root.innerHTML = `
      <div class="modal-panel compact-panel">
        <span class="modal-kicker">TACTICAL HOLD</span>
        <h2>PAUSED</h2>
        <p class="modal-description">Combat simulation suspended</p>
        <div class="menu-actions">
          <button class="menu-button primary resume-button">RESUME</button>
          <button class="menu-button secondary restart-button">RESTART RUN</button>
        </div>
        <small class="pointer-note">If pointer control is cooling down, click Resume again.</small>
      </div>
    `;
    document.body.appendChild(this.root);
    const resumeButton = this.root.querySelector<HTMLButtonElement>('.resume-button');
    const restartButton = this.root.querySelector<HTMLButtonElement>('.restart-button');
    if (!resumeButton || !restartButton) throw new Error('Pause menu controls missing');
    this.resumeButton = resumeButton;
    this.restartButton = restartButton;
    this.resumeButton.addEventListener('click', this.onResume);
    this.restartButton.addEventListener('click', this.onRestart);
    this.eventBus.on('game:stateChanged', this.onStateChanged);
  }

  private onResume = (): void => {
    const event: GameResumeRequestedEvent = { source: 'pause-menu' };
    this.eventBus.emit('game:resumeRequested', event);
  };

  private onRestart = (): void => {
    const event: GameRestartRequestedEvent = { source: 'pause-menu' };
    this.eventBus.emit('game:restartRequested', event);
  };

  private onStateChanged = (...args: unknown[]): void => {
    const event = args[0] as GameStateChangedEvent | undefined;
    if (event) this.root.classList.toggle('visible', event.current === 'paused');
  };

  dispose(): void {
    this.resumeButton.removeEventListener('click', this.onResume);
    this.restartButton.removeEventListener('click', this.onRestart);
    this.eventBus.off('game:stateChanged', this.onStateChanged);
    this.root.remove();
  }
}
