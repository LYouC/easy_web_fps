import { getDifficultyProfile } from '@/config/DifficultyConfig';
import { Engine } from '@/core/Engine';
import { EventBus } from '@/core/EventBus';
import type { Difficulty, GameRestartRequestedEvent, GameResumeRequestedEvent, GameRunStartedEvent, GameStartRequestedEvent, GameStateChangeRequestEvent } from '@/core/GameEvents';
import { GameStateManager } from '@/core/GameStateManager';
import { MainArena } from '@/scene/scenes/MainArena';
import { DeathScreen } from '@/ui/DeathScreen';
import { MainMenu } from '@/ui/MainMenu';
import { PauseMenu } from '@/ui/PauseMenu';

const eventBus = EventBus.getInstance();
const stateManager = new GameStateManager();
const engine = new Engine();
const mainMenu = new MainMenu();
const pauseMenu = new PauseMenu();
const deathScreen = new DeathScreen();
let difficulty: Difficulty = 'normal';
let runPrepared = false;

function requestState(target: GameStateChangeRequestEvent['target'], reason: GameStateChangeRequestEvent['reason']): void {
  const request: GameStateChangeRequestEvent = { target, reason };
  eventBus.emit('game:stateChangeRequested', request);
}

function requestPointerLock(): void {
  try {
    const request = engine.getRenderer().domElement.requestPointerLock();
    void request?.catch(() => undefined);
  } catch {
    return;
  }
}

function prepareRun(nextDifficulty: Difficulty): void {
  difficulty = nextDifficulty;
  engine.getSceneManager().clear();
  const arena = new MainArena(engine.getInputManager(), getDifficultyProfile(difficulty));
  engine.getSceneManager().switchTo(arena);
  const started: GameRunStartedEvent = { difficulty };
  eventBus.emit('game:runStarted', started);
  runPrepared = true;
}

function onStartRequested(...args: unknown[]): void {
  const event = args[0] as GameStartRequestedEvent | undefined;
  if (!event || stateManager.getState() !== 'menu') return;
  if (!runPrepared || event.difficulty !== difficulty) prepareRun(event.difficulty);
  requestPointerLock();
}

function onResumeRequested(...args: unknown[]): void {
  const event = args[0] as GameResumeRequestedEvent | undefined;
  if (!event || stateManager.getState() !== 'paused') return;
  requestPointerLock();
}

function onRestartRequested(...args: unknown[]): void {
  const event = args[0] as GameRestartRequestedEvent | undefined;
  if (!event) return;
  const state = stateManager.getState();
  if (state !== 'paused' && state !== 'dead') return;
  if (!runPrepared) prepareRun(difficulty);
  requestPointerLock();
}

function onPlayerDied(): void {
  if (stateManager.getState() !== 'playing') return;
  runPrepared = false;
  requestState('dead', 'player-died');
  if (document.pointerLockElement) void document.exitPointerLock();
}

function onPointerLockChange(): void {
  const lockedToGame = document.pointerLockElement === engine.getRenderer().domElement;
  const state = stateManager.getState();
  if (lockedToGame && (runPrepared || state === 'paused' || state === 'dead')) {
    runPrepared = false;
    requestState('playing', state === 'menu' ? 'start' : 'pointer-lock-acquired');
    return;
  }
  if (!lockedToGame && state === 'playing') requestState('paused', 'pointer-lock-lost');
}

function dispose(): void {
  document.removeEventListener('pointerlockchange', onPointerLockChange);
  window.removeEventListener('beforeunload', dispose);
  eventBus.off('game:startRequested', onStartRequested);
  eventBus.off('game:resumeRequested', onResumeRequested);
  eventBus.off('game:restartRequested', onRestartRequested);
  eventBus.off('player:died', onPlayerDied);
  mainMenu.dispose();
  pauseMenu.dispose();
  deathScreen.dispose();
  engine.dispose();
  stateManager.dispose();
}

eventBus.on('game:startRequested', onStartRequested);
eventBus.on('game:resumeRequested', onResumeRequested);
eventBus.on('game:restartRequested', onRestartRequested);
eventBus.on('player:died', onPlayerDied);
document.addEventListener('pointerlockchange', onPointerLockChange);
window.addEventListener('beforeunload', dispose);
engine.start();

console.log('[Game] P7 combat presentation ready. Select a threat level and begin.');
