import type { SceneBase } from './SceneBase';

export class SceneManager {
  private currentScene: SceneBase | null = null;

  switchTo(scene: SceneBase): void {
    this.currentScene?.unload();
    this.currentScene = scene;
    this.currentScene.load();
  }

  clear(): void {
    this.currentScene?.unload();
    this.currentScene = null;
  }

  update(delta: number): void {
    this.currentScene?.update(delta);
  }

  getCurrentScene(): SceneBase | null {
    return this.currentScene;
  }
}
