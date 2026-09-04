import { Engine } from '@/core/Engine';
import { MainArena } from '@/scene/scenes/MainArena';

const engine = new Engine();
const inputManager = engine.getInputManager();
const arena = new MainArena(inputManager);

engine.getSceneManager().switchTo(arena);

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const pauseScreen = document.getElementById('pause-screen');

let gameStarted = false;

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
  console.log('[Game] P2 — Shooting active');
}

function resumeGame(): void {
  if (!gameStarted) return;
  requestPointerLock();
}

startBtn?.addEventListener('click', startGame);
pauseScreen?.addEventListener('click', resumeGame);

document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement) {
    if (gameStarted && pauseScreen) {
      pauseScreen.style.display = 'flex';
    }
  } else {
    if (pauseScreen) {
      pauseScreen.style.display = 'none';
    }
  }
});

console.log('[Game] Ready. Click PLAY to start.');
