import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { PlayerShootEvent, WeaponAimChangedEvent } from '@/core/GameEvents';

export class WeaponView {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly group: THREE.Group;
  private readonly muzzleFlash: THREE.Group;
  private readonly muzzleLight: THREE.PointLight;
  private readonly eventBus: EventBus;
  private readonly hipPosition = new THREE.Vector3(...GameConfig.WEAPON.HIP_POSITION);
  private readonly adsPosition = new THREE.Vector3(...GameConfig.WEAPON.ADS_POSITION);
  private readonly restPosition = new THREE.Vector3(...GameConfig.WEAPON.HIP_POSITION);
  private aiming = false;
  private recoil: number = 0;
  private flashRemaining: number = 0;
  private elapsed: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.eventBus = EventBus.getInstance();
    this.group = this.buildWeapon();
    this.group.position.copy(this.restPosition);
    this.group.userData.raycastIgnore = true;
    this.muzzleFlash = this.buildMuzzleFlash();
    this.muzzleFlash.position.set(0, 0.035, -0.78);
    this.group.add(this.muzzleFlash);

    this.muzzleLight = new THREE.PointLight(0xffb342, 0, 2.5, 2);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
    this.group.add(this.muzzleLight);
    this.camera.add(this.group);

    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('weapon:reloadStarted', this.onReloadStarted);
    this.eventBus.on('weapon:aimChanged', this.onAimChanged);
  }

  private buildWeapon(): THREE.Group {
    const group = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x20262a, roughness: 0.34, metalness: 0.78 });
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x414b50, roughness: 0.28, metalness: 0.86 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xa36922, roughness: 0.55, metalness: 0.28 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.5), gunMetal);
    receiver.position.z = -0.22;
    group.add(receiver);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.28), accent);
    stock.position.set(0, -0.005, 0.16);
    stock.rotation.x = -0.07;
    group.add(stock);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 12), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.72);
    group.add(barrel);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), darkMetal);
    handguard.position.set(0, 0.005, -0.53);
    group.add(handguard);

    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.22, 0.13), darkMetal);
    magazine.position.set(0, -0.16, -0.2);
    magazine.rotation.x = -0.18;
    group.add(magazine);

    const scopeY = 0.105;
    const scopeZ = -0.28;
    const scopeW = 0.048;
    const scopeH = 0.048;
    const scopeL = 0.22;
    const scopeT = 0.007;

    const scopeTop = new THREE.Mesh(new THREE.BoxGeometry(scopeW, scopeT, scopeL), darkMetal);
    scopeTop.position.set(0, scopeY + scopeH / 2 - scopeT / 2, scopeZ);
    group.add(scopeTop);

    const scopeBottom = new THREE.Mesh(new THREE.BoxGeometry(scopeW, scopeT, scopeL), darkMetal);
    scopeBottom.position.set(0, scopeY - scopeH / 2 + scopeT / 2, scopeZ);
    group.add(scopeBottom);

    const scopeLeft = new THREE.Mesh(new THREE.BoxGeometry(scopeT, scopeH - scopeT * 2, scopeL), darkMetal);
    scopeLeft.position.set(-scopeW / 2 + scopeT / 2, scopeY, scopeZ);
    group.add(scopeLeft);

    const scopeRight = new THREE.Mesh(new THREE.BoxGeometry(scopeT, scopeH - scopeT * 2, scopeL), darkMetal);
    scopeRight.position.set(scopeW / 2 - scopeT / 2, scopeY, scopeZ);
    group.add(scopeRight);

    const scopeFrontRing = new THREE.Mesh(
      new THREE.TorusGeometry(scopeW / 2 - scopeT / 2, scopeT, 8, 14),
      gunMetal,
    );
    scopeFrontRing.rotation.x = Math.PI / 2;
    scopeFrontRing.position.set(0, scopeY, scopeZ - scopeL / 2);
    group.add(scopeFrontRing);

    const scopeRearRing = new THREE.Mesh(
      new THREE.TorusGeometry(scopeW / 2 - scopeT / 2, scopeT, 8, 14),
      gunMetal,
    );
    scopeRearRing.rotation.x = Math.PI / 2;
    scopeRearRing.position.set(0, scopeY, scopeZ + scopeL / 2);
    group.add(scopeRearRing);

    const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.16), gunMetal);
    scopeMount.position.set(0, scopeY - scopeH / 2 - 0.008, scopeZ);
    group.add(scopeMount);

    group.traverse((object) => {
      object.userData.raycastIgnore = true;
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.renderOrder = 10;
      }
    });
    return group;
  }

  private buildMuzzleFlash(): THREE.Group {
    const flash = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), material);
    core.scale.z = 2.4;
    flash.add(core);

    const flare = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), material.clone());
    flare.rotation.z = Math.PI / 4;
    flash.add(flare);
    flash.visible = false;
    return flash;
  }

  private onShoot = (...args: unknown[]): void => {
    const shot = args[0] as PlayerShootEvent | undefined;
    this.recoil = shot?.recoil ?? 1;
    this.flashRemaining = GameConfig.WEAPON.MUZZLE_FLASH_DURATION;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    this.muzzleLight.intensity = 4;
  };

  private onReloadStarted = (): void => {
    this.recoil = 0.45;
  };

  private onAimChanged = (...args: unknown[]): void => {
    const event = args[0] as WeaponAimChangedEvent | undefined;
    if (event) this.aiming = event.aiming;
  };

  update(delta: number): void {
    this.elapsed += delta;
    this.recoil = THREE.MathUtils.damp(this.recoil, 0, GameConfig.WEAPON.RECOIL_RETURN_SPEED, delta);
    this.flashRemaining = Math.max(0, this.flashRemaining - delta);

    if (this.flashRemaining === 0) {
      this.muzzleFlash.visible = false;
      this.muzzleLight.intensity = 0;
    }

    const sway = Math.sin(this.elapsed * GameConfig.WEAPON.WEAPON_SWAY_SPEED) * GameConfig.WEAPON.WEAPON_SWAY_AMOUNT;
    const targetPosition = this.aiming ? this.adsPosition : this.hipPosition;
    this.restPosition.lerp(targetPosition, 1 - Math.exp(-GameConfig.WEAPON.ADS_TRANSITION_SPEED * delta));
    const swayScale = this.aiming ? GameConfig.WEAPON.ADS_SWAY_SCALE : 1;
    this.group.position.set(
      this.restPosition.x + sway * swayScale,
      this.restPosition.y - sway * swayScale,
      this.restPosition.z + this.recoil * GameConfig.WEAPON.RECOIL_KICK_DISTANCE
    );
    this.group.rotation.set(
      this.recoil * GameConfig.WEAPON.RECOIL_KICK_ROTATION,
      0,
      sway * 2 * swayScale
    );
  }

  dispose(): void {
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('weapon:reloadStarted', this.onReloadStarted);
    this.eventBus.off('weapon:aimChanged', this.onAimChanged);
    this.camera.remove(this.group);
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
  }
}
