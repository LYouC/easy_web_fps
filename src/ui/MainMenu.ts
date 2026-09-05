import { DifficultyProfiles } from '@/config/DifficultyConfig';
import { EventBus } from '@/core/EventBus';
import type { Difficulty, GameStartRequestedEvent, GameStateChangedEvent } from '@/core/GameEvents';

export class MainMenu {
  private readonly eventBus = EventBus.getInstance();
  private readonly root = document.createElement('div');
  private readonly startButton: HTMLButtonElement;
  private readonly difficultyButtons: HTMLButtonElement[];
  private selectedDifficulty: Difficulty = 'normal';

  constructor() {
    this.root.className = 'game-overlay main-menu-overlay visible';
    this.root.innerHTML = `
      <div class="modal-panel main-menu-panel">
        <span class="modal-kicker">FIELD OPERATIONS / LIVE RANGE</span>
        <h1>BLACKSITE</h1>
        <p class="menu-tagline">SURVIVE THE TRAINING GRID</p>
        <div class="controls-grid">
          <span><b>WASD</b> MOVE</span><span><b>SHIFT</b> SPRINT</span>
          <span><b>SPACE</b> JUMP</span><span><b>LMB</b> FIRE</span>
          <span><b>RMB</b> AIM</span><span><b>1 / 2</b> RIFLE / KNIFE</span>
          <span><b>Q</b> QUICK SWAP</span><span><b>R</b> RELOAD</span><span><b>ESC</b> PAUSE</span>
        </div>
        <div class="difficulty-heading">SELECT THREAT LEVEL</div>
        <div class="difficulty-options">
          ${Object.values(DifficultyProfiles).map((profile) => `
            <button class="difficulty-button${profile.id === 'normal' ? ' selected' : ''}" data-difficulty="${profile.id}">
              <strong>${profile.label}</strong><small>${profile.description}</small>
            </button>
          `).join('')}
        </div>
        <button class="menu-button primary start-button">BEGIN OPERATION</button>
        <small class="pointer-note">Pointer control activates after launch</small>
      </div>
    `;
    document.body.appendChild(this.root);
    const startButton = this.root.querySelector<HTMLButtonElement>('.start-button');
    if (!startButton) throw new Error('Main menu start button missing');
    this.startButton = startButton;
    this.difficultyButtons = Array.from(this.root.querySelectorAll<HTMLButtonElement>('.difficulty-button'));
    this.startButton.addEventListener('click', this.onStart);
    this.difficultyButtons.forEach((button) => button.addEventListener('click', this.onDifficultySelected));
    this.eventBus.on('game:stateChanged', this.onStateChanged);
  }

  private onDifficultySelected = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const difficulty = button.dataset.difficulty;
    if (difficulty !== 'easy' && difficulty !== 'normal' && difficulty !== 'hard') return;
    this.selectedDifficulty = difficulty;
    this.difficultyButtons.forEach((candidate) => candidate.classList.toggle('selected', candidate === button));
  };

  private onStart = (): void => {
    const request: GameStartRequestedEvent = { difficulty: this.selectedDifficulty };
    this.eventBus.emit('game:startRequested', request);
  };

  private onStateChanged = (...args: unknown[]): void => {
    const event = args[0] as GameStateChangedEvent | undefined;
    if (event) this.root.classList.toggle('visible', event.current === 'menu');
  };

  dispose(): void {
    this.startButton.removeEventListener('click', this.onStart);
    this.difficultyButtons.forEach((button) => button.removeEventListener('click', this.onDifficultySelected));
    this.eventBus.off('game:stateChanged', this.onStateChanged);
    this.root.remove();
  }
}
