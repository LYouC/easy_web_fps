import * as THREE from 'three';
import { BlockCharacterModel } from '@/core/BlockCharacterModel';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { PlayerTransformEvent } from '@/core/GameEvents';

export class PlayerModel {
  private readonly model = new BlockCharacterModel('player');
  private readonly eventBus = EventBus.getInstance();
  private readonly lastPosition = new THREE.Vector3();
  private readonly forward = new THREE.Vector3(0, 0, -1);
  private phase = 0;
  private movement = 0;
  private initialized = false;

  constructor(scene: THREE.Scene) {
    this.model.group.userData.raycastIgnore = true;
    this.model.group.scale.setScalar(GameConfig.CHARACTER.PLAYER_SCALE);
    this.model.group.rotation.y = Math.PI;
    this.model.group.position.z = GameConfig.CHARACTER.PLAYER_BACK_OFFSET;
    this.model.group.children.forEach((part) => {
      part.position.z += this.model.legs.includes(part as THREE.Group)
        ? GameConfig.CHARACTER.PLAYER_LEG_FORWARD_OFFSET
        : -GameConfig.CHARACTER.PLAYER_TORSO_BACK_OFFSET;
    });
    this.model.firstPersonHidden.forEach((part) => {
      part.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const material = object.material as THREE.MeshStandardMaterial;
        // Keep the complete silhouette in shadow maps without drawing inside the camera.
        material.colorWrite = false;
        material.depthWrite = false;
      });
    });
    scene.add(this.model.group);
    this.eventBus.on('player:transformChanged', this.onTransform);
  }

  private onTransform = (...args: unknown[]): void => {
    const event = args[0] as PlayerTransformEvent | undefined;
    if (!event) return;
    this.movement = this.initialized ? Math.hypot(event.position.x - this.lastPosition.x, event.position.z - this.lastPosition.z) : 0;
    this.lastPosition.copy(event.position);
    this.initialized = true;
    if (Math.hypot(event.forward.x, event.forward.z) > 0.001) {
      this.forward.set(event.forward.x, 0, event.forward.z).normalize();
    }
    this.model.group.position.copy(event.position).addScaledVector(this.forward, -GameConfig.CHARACTER.PLAYER_BACK_OFFSET);
    this.model.group.position.y -= GameConfig.PLAYER.EYE_HEIGHT;
    this.model.group.rotation.y = Math.atan2(this.forward.x, this.forward.z);
  };

  update(delta: number): void {
    this.phase += this.movement * GameConfig.CHARACTER.WALK_DISTANCE_SCALE;
    this.model.legs.forEach((leg, index) => {
      const target = this.movement > 0 ? Math.sin(this.phase) * GameConfig.CHARACTER.WALK_ANGLE * (index === 0 ? 1 : -1) : 0;
      leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, target, GameConfig.CHARACTER.RESET_SPEED, delta);
    });
    this.movement = 0;
  }

  dispose(): void {
    this.eventBus.off('player:transformChanged', this.onTransform);
    this.model.dispose();
  }
}
