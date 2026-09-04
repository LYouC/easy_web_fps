export interface SceneBase {
  load(): void;
  unload(): void;
  update(delta: number): void;
}
