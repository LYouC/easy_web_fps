import { DifficultyProfiles } from '@/config/DifficultyConfig';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { GameRestartRequestedEvent, GameRunStartedEvent, GameStateChangedEvent, ScoreChangedEvent, WaveStartedEvent } from '@/core/GameEvents';

export class DeathScreen {
  private readonly eventBus = EventBus.getInstance();
  private readonly root = document.createElement('div');
  private readonly scoreElement: HTMLElement;
  private readonly waveElement: HTMLElement;
  private readonly difficultyElement: HTMLElement;
  private readonly restartButton: HTMLButtonElement;
  private score = 0;
  private wave = 0;
  private difficulty = DifficultyProfiles.normal;

  constructor() {
    this.root.className = 'game-overlay death-screen-overlay';
    this.root.innerHTML = `
      <div class="modal-panel compact-panel danger-panel">
        <span class="modal-kicker">SYSTEM FAILURE</span>
        <h2>ELIMINATED</h2>
        <p class="modal-description">Your combat run has ended</p>
        <div class="death-stats">
          <div><span>FINAL SCORE</span><strong class="death-score">000000</strong></div>
          <div><span>WAVE REACHED</span><strong class="death-wave">00</strong></div>
          <div class="wide-stat"><span>THREAT LEVEL</span><strong class="death-difficulty">NORMAL</strong></div>
        </div>
        <button class="menu-button primary restart-button">RESTART RUN</button>
      </div>
    `;
    document.body.appendChild(this.root);
    const score = this.root.querySelector<HTMLElement>('.death-score');
    const wave = this.root.querySelector<HTMLElement>('.death-wave');
    const difficulty = this.root.querySelector<HTMLElement>('.death-difficulty');
    const restart = this.root.querySelector<HTMLButtonElement>('.restart-button');
    if (!score || !wave || !difficulty || !restart) throw new Error('Death screen elements missing');
    this.scoreElement = score;
    this.waveElement = wave;
    this.difficultyElement = difficulty;
    this.restartButton = restart;
    this.restartButton.addEventListener('click', this.onRestart);
    this.eventBus.on('game:runStarted', this.onRunStarted);
    this.eventBus.on('game:stateChanged', this.onStateChanged);
    this.eventBus.on('score:changed', this.onScoreChanged);
    this.eventBus.on('wave:started', this.onWaveStarted);
  }

  private onRestart = (): void => {
    const event: GameRestartRequestedEvent = { source: 'death-screen' };
    this.eventBus.emit('game:restartRequested', event);
  };

  private onRunStarted = (...args: unknown[]): void => {
    const event = args[0] as GameRunStartedEvent | undefined;
    if (!event) return;
    this.score = 0;
    this.wave = 0;
    this.difficulty = DifficultyProfiles[event.difficulty];
  };

  private onScoreChanged = (...args: unknown[]): void => {
    const event = args[0] as ScoreChangedEvent | undefined;
    if (event) this.score = event.score;
  };

  private onWaveStarted = (...args: unknown[]): void => {
    const event = args[0] as WaveStartedEvent | undefined;
    if (event) this.wave = event.wave;
  };

  private onStateChanged = (...args: unknown[]): void => {
    const event = args[0] as GameStateChangedEvent | undefined;
    if (!event) return;
    const visible = event.current === 'dead';
    this.root.classList.toggle('visible', visible);
    if (!visible) return;
    this.scoreElement.textContent = this.score.toString().padStart(GameConfig.HUD.SCORE_DIGITS, '0');
    this.waveElement.textContent = this.wave.toString().padStart(GameConfig.HUD.VALUE_DIGITS, '0');
    this.difficultyElement.textContent = this.difficulty.label;
  };

  dispose(): void {
    this.restartButton.removeEventListener('click', this.onRestart);
    this.eventBus.off('game:runStarted', this.onRunStarted);
    this.eventBus.off('game:stateChanged', this.onStateChanged);
    this.eventBus.off('score:changed', this.onScoreChanged);
    this.eventBus.off('wave:started', this.onWaveStarted);
    this.root.remove();
  }
}
