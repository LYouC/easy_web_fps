import * as THREE from 'three';
import type { SceneBase } from '@/scene/SceneBase';
import { InputManager } from '@/core/InputManager';
import { FPSCamera } from '@/player/FPSCamera';
import { Movement } from '@/player/Movement';
import { Player } from '@/player/Player';
import { ColliderManager } from '@/world/ColliderManager';
import { Debug } from '@/core/Debug';
import { GameConfig } from '@/config/GameConfig';
import { Rifle } from '@/weapons/Rifle';
import { WeaponView } from '@/weapons/WeaponView';
import { RaycastShooter } from '@/combat/RaycastShooter';
import { HUD } from '@/ui/HUD';
import { AudioManager } from '@/audio/AudioManager';
import { DamageSystem } from '@/combat/DamageSystem';
import { CoverSystem } from '@/combat/CoverSystem';
import { WaveManager } from '@/enemies/WaveManager';
import { EventBus } from '@/core/EventBus';
import type { PlayerTransformEvent } from '@/core/GameEvents';
import { MapBuilder } from '@/world/MapBuilder';
import { PickupSpawner } from '@/pickups/PickupSpawner';

export class MainArena implements SceneBase {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private inputManager: InputManager;
  private fpsCamera: FPSCamera;
  private movement: Movement;
  private player: Player;
  private colliderManager: ColliderManager;
  private debug: Debug;
  private rifle: Rifle;
  private weaponView: WeaponView;
  private raycastShooter: RaycastShooter;
  private hud: HUD;
  private audioManager: AudioManager;
  private damageSystem: DamageSystem;
  private coverSystem: CoverSystem;
  private waveManager: WaveManager;
  private mapBuilder: MapBuilder;
  private pickupSpawner: PickupSpawner;
  private readonly eventBus: EventBus;

  constructor(inputManager: InputManager) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, GameConfig.PLAYER.EYE_HEIGHT, 0);
    this.scene.add(this.camera);

    this.inputManager = inputManager;
    this.eventBus = EventBus.getInstance();
    this.colliderManager = new ColliderManager();

    this.setupLighting();
    this.setupGround();
    this.mapBuilder = new MapBuilder(this.scene, this.colliderManager);

    this.fpsCamera = new FPSCamera(this.camera, this.inputManager);
    this.movement = new Movement(this.camera, this.inputManager, this.fpsCamera, this.colliderManager);
    this.player = new Player();
    this.debug = new Debug(this.scene, this.colliderManager, this.inputManager);
    this.hud = new HUD();
    this.raycastShooter = new RaycastShooter(this.scene);
    this.weaponView = new WeaponView(this.camera);
    this.audioManager = new AudioManager();
    this.damageSystem = new DamageSystem();
    this.coverSystem = new CoverSystem();
    this.waveManager = new WaveManager(this.scene);
    this.rifle = new Rifle(this.camera, this.inputManager);
    this.pickupSpawner = new PickupSpawner(this.scene);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffeedd, 1.0);
    directional.position.set(50, 100, 50);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 300;
    directional.shadow.camera.left = -100;
    directional.shadow.camera.right = 100;
    directional.shadow.camera.top = 100;
    directional.shadow.camera.bottom = -100;
    this.scene.add(directional);

    const hemisphere = new THREE.HemisphereLight(0x88aacc, 0x443322, 0.3);
    this.scene.add(hemisphere);
  }

  private setupGround(): void {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(200, 40, 0x444444, 0x333333);
    grid.position.y = 0.01;
    grid.userData.raycastIgnore = true;
    this.scene.add(grid);
  }

  getThreeScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getPlayer(): Player {
    return this.player;
  }

  getColliderManager(): ColliderManager {
    return this.colliderManager;
  }

  load(): void {
    console.log('[MainArena] Scene loaded');
  }

  unload(): void {
    this.pickupSpawner.dispose();
    this.rifle.dispose();
    this.waveManager.dispose();
    this.coverSystem.dispose();
    this.damageSystem.dispose();
    this.player.dispose();
    this.mapBuilder.dispose();
    this.colliderManager.dispose();
    this.weaponView.dispose();
    this.raycastShooter.dispose();
    this.hud.dispose();
    this.audioManager.dispose();
    this.debug.dispose();
    console.log('[MainArena] Scene unloaded');
  }

  update(delta: number): void {
    this.fpsCamera.update();
    const combatActive = this.inputManager.isPointerLocked() && this.player.isAlive();
    if (combatActive) {
      this.movement.update(delta);
      this.rifle.update(delta);
    }
    this.weaponView.update(delta);
    this.raycastShooter.update(delta);
    const transform: PlayerTransformEvent = {
      position: this.camera.getWorldPosition(new THREE.Vector3()),
    };
    this.eventBus.emit('player:transformChanged', transform);
    this.waveManager.update(delta, combatActive);
    this.pickupSpawner.update(delta, combatActive);
    this.debug.update();
  }
}
