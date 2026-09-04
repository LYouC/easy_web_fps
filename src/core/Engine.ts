import * as THREE from 'three';
import { EventBus } from '@/core/EventBus';
import { InputManager } from '@/core/InputManager';
import { SceneManager } from '@/scene/SceneManager';

export class Engine {
  private renderer: THREE.WebGLRenderer;
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  private eventBus: EventBus;
  private animationFrameId: number = 0;
  private running: boolean = false;
  private lastTime: number = 0;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    document.body.appendChild(this.renderer.domElement);

    this.sceneManager = new SceneManager();
    this.inputManager = new InputManager();
    this.eventBus = EventBus.getInstance();

    window.addEventListener('resize', this.onResize);
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  getInputManager(): InputManager {
    return this.inputManager;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.sceneManager.update(delta);

    const scene = this.sceneManager.getCurrentScene();
    if (scene) {
      this.renderer.render(
        (scene as unknown as { getThreeScene: () => THREE.Scene }).getThreeScene(),
        (scene as unknown as { getCamera: () => THREE.Camera }).getCamera()
      );
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);

    const scene = this.sceneManager.getCurrentScene();
    if (scene) {
      const camera = (scene as unknown as { getCamera: () => THREE.PerspectiveCamera }).getCamera();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  };

  isRunning(): boolean {
    return this.running;
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.inputManager.dispose();
    this.eventBus.clear();
    this.renderer.dispose();
    document.body.removeChild(this.renderer.domElement);
  }
}
