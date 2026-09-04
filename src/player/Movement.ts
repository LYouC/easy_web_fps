import * as THREE from 'three';
import { InputManager } from '@/core/InputManager';
import { FPSCamera } from '@/player/FPSCamera';
import { ColliderManager } from '@/world/ColliderManager';
import { GameConfig } from '@/config/GameConfig';

export class Movement {
  private camera: THREE.PerspectiveCamera;
  private inputManager: InputManager;
  private fpsCamera: FPSCamera;
  private colliderManager: ColliderManager;
  private velocity: THREE.Vector3;
  private onGround: boolean;

  constructor(
    camera: THREE.PerspectiveCamera,
    inputManager: InputManager,
    fpsCamera: FPSCamera,
    colliderManager: ColliderManager
  ) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.fpsCamera = fpsCamera;
    this.colliderManager = colliderManager;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.onGround = true;
  }

  update(delta: number): void {
    if (!this.inputManager.isPointerLocked()) return;

    const isRunning = this.inputManager.isKeyDown('ShiftLeft') || this.inputManager.isKeyDown('ShiftRight');
    const speed = isRunning ? GameConfig.PLAYER.RUN_SPEED : GameConfig.PLAYER.WALK_SPEED;

    const forward = this.fpsCamera.getForward();
    const right = this.fpsCamera.getRight();

    const moveDir = new THREE.Vector3(0, 0, 0);

    if (this.inputManager.isKeyDown('KeyW')) moveDir.add(forward);
    if (this.inputManager.isKeyDown('KeyS')) moveDir.sub(forward);
    if (this.inputManager.isKeyDown('KeyD')) moveDir.add(right);
    if (this.inputManager.isKeyDown('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    if (this.onGround && this.inputManager.isKeyDown('Space')) {
      this.velocity.y = GameConfig.PLAYER.JUMP_FORCE;
      this.onGround = false;
    }

    if (!this.onGround) {
      this.velocity.y -= GameConfig.PLAYER.GRAVITY * delta;
    } else {
      this.velocity.y = 0;
    }

    const newPos = this.camera.position.clone();
    newPos.x += this.velocity.x * delta;
    newPos.z += this.velocity.z * delta;
    newPos.y += this.velocity.y * delta;

    const resolved = this.colliderManager.resolveCollision(
      newPos,
      GameConfig.PLAYER.HEIGHT,
      GameConfig.PLAYER.EYE_HEIGHT
    );
    this.camera.position.copy(resolved.position);

    if (resolved.onGround) {
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
      }
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }

  isOnGround(): boolean {
    return this.onGround;
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }
}
