import * as THREE from 'three';
import { InputManager } from '@/core/InputManager';

export class FPSCamera {
  private camera: THREE.PerspectiveCamera;
  private inputManager: InputManager;
  private euler: THREE.Euler;
  private sensitivity: number;

  constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager) {
    this.camera = camera;
    this.inputManager = inputManager;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.sensitivity = 0.002;
  }

  update(): void {
    if (!this.inputManager.isPointerLocked()) return;

    const delta = this.inputManager.getMouseDelta();
    this.euler.setFromQuaternion(this.camera.quaternion);

    this.euler.y -= delta.x * this.sensitivity;
    this.euler.x -= delta.y * this.sensitivity;
    this.euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  getForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    return forward;
  }

  getRight(): THREE.Vector3 {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();
    return right;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
