import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';

interface ActiveShell {
  mesh: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  age: number;
}

export class ShellEjectionSystem {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly weaponGroup: THREE.Group;
  private readonly ejectionPosition: THREE.Vector3;
  private readonly root = new THREE.Group();
  private readonly geometry = new THREE.CylinderGeometry(
    GameConfig.WEAPON.SHELL_RADIUS,
    GameConfig.WEAPON.SHELL_RADIUS,
    GameConfig.WEAPON.SHELL_LENGTH,
    GameConfig.WEAPON.SHELL_RADIAL_SEGMENTS,
  );
  private readonly shells: ActiveShell[] = [];

  constructor(camera: THREE.PerspectiveCamera, weaponGroup: THREE.Group, ejectionPosition: THREE.Vector3) {
    this.camera = camera;
    this.weaponGroup = weaponGroup;
    this.ejectionPosition = ejectionPosition;
    this.root.userData.raycastIgnore = true;
    this.camera.add(this.root);
  }

  eject(): void {
    if (this.shells.length >= GameConfig.WEAPON.SHELL_MAX_ACTIVE) this.removeShell(0);

    this.camera.updateWorldMatrix(true, false);
    this.weaponGroup.updateWorldMatrix(true, false);
    const origin = this.weaponGroup.localToWorld(this.ejectionPosition.clone());
    this.camera.worldToLocal(origin);

    const material = new THREE.MeshStandardMaterial({
      color: GameConfig.WEAPON.SHELL_COLOR,
      roughness: GameConfig.WEAPON.SHELL_ROUGHNESS,
      metalness: GameConfig.WEAPON.SHELL_METALNESS,
      transparent: true,
    });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.copy(origin);
    mesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI);
    mesh.renderOrder = 11;
    mesh.userData.raycastIgnore = true;
    this.root.add(mesh);

    const variance = GameConfig.WEAPON.SHELL_SPEED_VARIANCE;
    this.shells.push({
      mesh,
      velocity: new THREE.Vector3(
        GameConfig.WEAPON.SHELL_EJECT_SPEED_X + (Math.random() - 0.5) * variance,
        GameConfig.WEAPON.SHELL_EJECT_SPEED_Y + Math.random() * variance,
        GameConfig.WEAPON.SHELL_EJECT_SPEED_Z + (Math.random() - 0.5) * variance,
      ),
      spin: new THREE.Vector3(
        (0.65 + Math.random() * 0.35) * GameConfig.WEAPON.SHELL_SPIN_SPEED,
        Math.random() * GameConfig.WEAPON.SHELL_SPIN_SPEED,
        (0.65 + Math.random() * 0.35) * GameConfig.WEAPON.SHELL_SPIN_SPEED,
      ),
      age: 0,
    });
  }

  update(delta: number): void {
    for (let index = this.shells.length - 1; index >= 0; index -= 1) {
      const shell = this.shells[index];
      if (!shell) continue;
      shell.age += delta;
      if (shell.age >= GameConfig.WEAPON.SHELL_LIFETIME) {
        this.removeShell(index);
        continue;
      }

      shell.velocity.y -= GameConfig.WEAPON.SHELL_GRAVITY * delta;
      shell.mesh.position.addScaledVector(shell.velocity, delta);
      shell.mesh.rotation.x += shell.spin.x * delta;
      shell.mesh.rotation.y += shell.spin.y * delta;
      shell.mesh.rotation.z += shell.spin.z * delta;

      if (shell.age > GameConfig.WEAPON.SHELL_FADE_START) {
        shell.mesh.material.opacity = THREE.MathUtils.clamp(
          (GameConfig.WEAPON.SHELL_LIFETIME - shell.age)
            / (GameConfig.WEAPON.SHELL_LIFETIME - GameConfig.WEAPON.SHELL_FADE_START),
          0,
          1,
        );
      }
    }
  }

  dispose(): void {
    while (this.shells.length > 0) this.removeShell(this.shells.length - 1);
    this.camera.remove(this.root);
    this.geometry.dispose();
  }

  private removeShell(index: number): void {
    const [shell] = this.shells.splice(index, 1);
    if (!shell) return;
    this.root.remove(shell.mesh);
    shell.mesh.material.dispose();
  }
}
