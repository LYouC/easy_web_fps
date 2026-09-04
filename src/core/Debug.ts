import * as THREE from 'three';
import { ColliderManager, type ColliderEntry } from '@/world/ColliderManager';
import { EventBus } from '@/core/EventBus';
import { InputManager } from '@/core/InputManager';
import { GameConfig } from '@/config/GameConfig';

export class Debug {
  private scene: THREE.Scene;
  private colliderManager: ColliderManager;
  private eventBus: EventBus;
  private visible: boolean;
  private wireframes: Map<string, THREE.LineSegments> = new Map();
  private group: THREE.Group;

  constructor(scene: THREE.Scene, colliderManager: ColliderManager, _inputManager: InputManager) {
    this.scene = scene;
    this.colliderManager = colliderManager;
    this.eventBus = EventBus.getInstance();
    this.visible = GameConfig.DEBUG.COLLIDER_VISIBLE_DEFAULT;
    this.group = new THREE.Group();
    this.group.name = '__debug_colliders__';
    this.group.userData.raycastIgnore = true;
    this.group.visible = this.visible;
    this.scene.add(this.group);

    document.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === GameConfig.DEBUG.COLLIDER_VIS_KEY) {
      e.preventDefault();
      this.visible = !this.visible;
      this.group.visible = this.visible;
      this.eventBus.emit('debug:colliderVisToggled', this.visible);
    }
  };

  update(): void {
    const colliders = this.colliderManager.getAll();
    const currentIds = new Set(colliders.map((c) => c.id));

    for (const [id] of this.wireframes) {
      if (!currentIds.has(id)) {
        const mesh = this.wireframes.get(id)!;
        this.group.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.wireframes.delete(id);
      }
    }

    for (const entry of colliders) {
      if (!this.wireframes.has(entry.id)) {
        const wireframe = this.createWireframe(entry);
        this.group.add(wireframe);
        this.wireframes.set(entry.id, wireframe);
      }
    }
  }

  private createWireframe(entry: ColliderEntry): THREE.LineSegments {
    const { min, max } = entry.box;
    const geometry = new THREE.BoxGeometry(
      max.x - min.x,
      max.y - min.y,
      max.z - min.z
    );
    const edges = new THREE.EdgesGeometry(geometry);
    const color = entry.isGround ? 0x00ff00 : 0xff4444;
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const wireframe = new THREE.LineSegments(edges, material);

    wireframe.position.set(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2
    );

    geometry.dispose();
    return wireframe;
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    document.removeEventListener('keydown', this.onKeyDown);
    for (const [, mesh] of this.wireframes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.wireframes.clear();
    this.scene.remove(this.group);
  }
}
