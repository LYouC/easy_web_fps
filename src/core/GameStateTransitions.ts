export type GameState = 'menu' | 'playing' | 'paused' | 'dead';

const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  menu: ['playing'],
  playing: ['paused', 'dead', 'menu'],
  paused: ['playing', 'dead', 'menu'],
  dead: ['playing', 'menu'],
};

export function canTransitionGameState(from: GameState, to: GameState): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}
