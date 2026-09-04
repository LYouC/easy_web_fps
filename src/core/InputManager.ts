const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'Space', 'ShiftLeft', 'ShiftRight',
  'KeyR', 'KeyE', 'KeyQ',
  'Digit1', 'Digit2', 'Digit3',
  'Backquote',
]);

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private mouseButtons: Map<number, boolean> = new Map();
  private mouseDeltaX: number = 0;
  private mouseDeltaY: number = 0;
  private pointerLocked: boolean = false;

  constructor() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('contextmenu', this.onContextMenu);
  }

  isKeyDown(code: string): boolean {
    return this.keys.get(code) ?? false;
  }

  isMouseButtonDown(button: number): boolean {
    return this.mouseButtons.get(button) ?? false;
  }

  getMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.set(e.code, true);
    if (this.pointerLocked && GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.code, false);
    if (this.pointerLocked && GAME_KEYS.has(e.code)) {
      e.preventDefault();
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.mouseButtons.set(e.button, true);
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons.set(e.button, false);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseDeltaX += e.movementX;
    this.mouseDeltaY += e.movementY;
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement !== null;
  };

  private onContextMenu = (event: MouseEvent): void => {
    if (this.pointerLocked) event.preventDefault();
  };

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('contextmenu', this.onContextMenu);
  }
}
