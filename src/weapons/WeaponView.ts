import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { PlayerShootEvent, WeaponAimChangedEvent } from '@/core/GameEvents';
import { RifleModel } from '@/weapons/RifleModel';
import { ShellEjectionSystem } from '@/weapons/ShellEjectionSystem';
import { WeaponAnimator } from '@/weapons/WeaponAnimator';

export class WeaponView {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly group: THREE.Group;
  private readonly muzzleFlash: THREE.Group;
  private readonly muzzleLight: THREE.PointLight;
  private readonly eventBus: EventBus;
  private readonly animator: WeaponAnimator;
  private readonly shellEjectionSystem: ShellEjectionSystem;
  private aiming = false;
  private flashRemaining = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.eventBus = EventBus.getInstance();

    const model = RifleModel.build();
    this.group = model.group;
    this.group.position.set(...GameConfig.WEAPON.HIP_POSITION);
    this.animator = new WeaponAnimator(model.magazine, model.bolt);

    this.muzzleFlash = this.buildMuzzleFlash();
    this.muzzleFlash.position.set(...GameConfig.WEAPON.VIEW_MUZZLE_POSITION);
    this.group.add(this.muzzleFlash);

    this.muzzleLight = new THREE.PointLight(0xffb342, 0, 2.5, 2);
    this.muzzleLight.position.copy(this.muzzleFlash.position);
    this.group.add(this.muzzleLight);
    this.camera.add(this.group);

    this.shellEjectionSystem = new ShellEjectionSystem(camera, this.group, model.ejectionPosition);
    this.eventBus.on('player:shoot', this.onShoot);
    this.eventBus.on('weapon:reloadStarted', this.onReloadStarted);
    this.eventBus.on('weapon:reloadCompleted', this.onReloadCompleted);
    this.eventBus.on('weapon:aimChanged', this.onAimChanged);
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
    this.animator.shoot(shot?.recoil ?? 1);
    this.shellEjectionSystem.eject();
    this.flashRemaining = GameConfig.WEAPON.MUZZLE_FLASH_DURATION;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI;
    this.muzzleLight.intensity = 4;
  };

  private onReloadStarted = (...args: unknown[]): void => {
    const duration = typeof args[0] === 'number' ? args[0] : GameConfig.WEAPON.RIFLE_RELOAD_TIME;
    this.animator.startReload(duration);
  };

  private onReloadCompleted = (): void => {
    this.animator.completeReload();
  };

  private onAimChanged = (...args: unknown[]): void => {
    const event = args[0] as WeaponAimChangedEvent | undefined;
    if (event) this.aiming = event.aiming;
  };

  update(delta: number): void {
    this.flashRemaining = Math.max(0, this.flashRemaining - delta);
    if (this.flashRemaining === 0) {
      this.muzzleFlash.visible = false;
      this.muzzleLight.intensity = 0;
    }

    const pose = this.animator.update(delta, this.aiming);
    this.group.position.copy(pose.position);
    this.group.rotation.copy(pose.rotation);
    this.shellEjectionSystem.update(delta);
  }

  dispose(): void {
    this.eventBus.off('player:shoot', this.onShoot);
    this.eventBus.off('weapon:reloadStarted', this.onReloadStarted);
    this.eventBus.off('weapon:reloadCompleted', this.onReloadCompleted);
    this.eventBus.off('weapon:aimChanged', this.onAimChanged);
    this.shellEjectionSystem.dispose();
    this.camera.remove(this.group);

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }
}
