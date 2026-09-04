import { Engine } from '@/core/Engine';
import { MainArena } from '@/scene/scenes/MainArena';
import { EventBus } from '@/core/EventBus';
import { GameConfig } from '@/config/GameConfig';
import type { ScoreChangedEvent, WaveStartedEvent } from '@/core/GameEvents';

const engine = new Engine();
const inputManager = engine.getInputManager();
const arena = new MainArena(inputManager);

engine.getSceneManager().switchTo(arena);

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeBtn = document.getElementById('resume-btn');
const pauseResetBtn = document.getElementById('pause-reset-btn');
const deathScreen = document.getElementById('death-screen');
const deathResetBtn = document.getElementById('death-reset-btn');
const deathScore = document.getElementById('death-score');
const deathWave = document.getElementById('death-wave');
const eventBus = EventBus.getInstance();

let gameStarted = false;
let gameOver = false;
let currentScore = 0;
let currentWave = 0;

function requestPointerLock(): void {
  try {
    engine.getRenderer().domElement.requestPointerLock();
  } catch {
    // SecurityError: browser cooldown after ESC, will retry on next click
  }
}

function startGame(): void {
  if (gameStarted) return;
  gameStarted = true;
  if (startScreen) {
    startScreen.style.display = 'none';
  }
  engine.start();
  requestPointerLock();
  console.log('[Game] P3 — Enemies active');
}

function resumeGame(): void {
  if (!gameStarted || gameOver) return;
  requestPointerLock();
}

function resetGame(): void {
  window.location.reload();
}

function onPlayerDied(): void {
  gameOver = true;
  if (document.pointerLockElement) document.exitPointerLock();
  if (pauseScreen) pauseScreen.style.display = 'none';
  if (deathScore) deathScore.textContent = currentScore.toString().padStart(GameConfig.HUD.SCORE_DIGITS, '0');
  if (deathWave) deathWave.textContent = currentWave.toString().padStart(GameConfig.HUD.VALUE_DIGITS, '0');
  if (deathScreen) deathScreen.style.display = 'flex';
}

function onScoreChanged(...args: unknown[]): void {
  const event = args[0] as ScoreChangedEvent | undefined;
  if (event) currentScore = event.score;
}

function onWaveStarted(...args: unknown[]): void {
  const event = args[0] as WaveStartedEvent | undefined;
  if (event) currentWave = event.wave;
}

startBtn?.addEventListener('click', startGame);
resumeBtn?.addEventListener('click', resumeGame);
pauseResetBtn?.addEventListener('click', resetGame);
deathResetBtn?.addEventListener('click', resetGame);
eventBus.on('player:died', onPlayerDied);
eventBus.on('score:changed', onScoreChanged);
eventBus.on('wave:started', onWaveStarted);

document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) {
    if (gameStarted && !gameOver && pauseScreen) {
      pauseScreen.style.display = 'flex';
    }
  } else {
    if (pauseScreen) {
      pauseScreen.style.display = 'none';
    }
  }
});

console.log('[Game] Ready. Click PLAY to start.');
