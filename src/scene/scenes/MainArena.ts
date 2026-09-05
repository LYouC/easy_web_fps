import * as THREE from 'three';
import type { SceneBase } from '@/scene/SceneBase';
import { InputManager } from '@/core/InputManager';
import { FPSCamera } from '@/player/FPSCamera';
import { Movement } from '@/player/Movement';
import { Player } from '@/player/Player';
import { PlayerModel } from '@/player/PlayerModel';
import { ColliderManager } from '@/world/ColliderManager';
import { Debug } from '@/core/Debug';
import { GameConfig } from '@/config/GameConfig';
import { WeaponView } from '@/weapons/WeaponView';
import { WeaponLoadout } from '@/weapons/WeaponLoadout';
import { KnifeView } from '@/weapons/KnifeView';
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
import type { DifficultyProfile } from '@/config/DifficultyConfig';
import type { GameStateChangedEvent } from '@/core/GameEvents';
import { FactoryEnvironment } from '@/world/FactoryEnvironment';
import { ScenicBackdrop } from '@/world/ScenicBackdrop';
import { PerimeterFence } from '@/world/PerimeterFence';
import { AimController } from '@/weapons/AimController';
import { HitEffectSystem } from '@/combat/HitEffectSystem';

export class MainArena implements SceneBase {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private inputManager: InputManager;
  private fpsCamera: FPSCamera;
  private movement: Movement;
  private player: Player;
  private playerModel: PlayerModel;
  private colliderManager: ColliderManager;
  private debug: Debug;
  private weaponLoadout: WeaponLoadout;
  private weaponView: WeaponView;
  private knifeView: KnifeView;
  private raycastShooter: RaycastShooter;
  private hud: HUD;
  private audioManager: AudioManager;
  private damageSystem: DamageSystem;
  private coverSystem: CoverSystem;
  private waveManager: WaveManager;
  private mapBuilder: MapBuilder;
  private factoryEnvironment: FactoryEnvironment;
  private scenicBackdrop: ScenicBackdrop;
  private perimeterFence: PerimeterFence;
  private pickupSpawner: PickupSpawner;
  private aimController: AimController;
  private hitEffectSystem: HitEffectSystem;
  private readonly eventBus: EventBus;
  private readonly environmentObjects: THREE.Object3D[] = [];
  private combatActive = false;

  constructor(inputManager: InputManager, difficulty: DifficultyProfile) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(GameConfig.VISUAL.BACKGROUND_COLOR);
    this.scene.fog = new THREE.Fog(GameConfig.VISUAL.FOG_COLOR, GameConfig.VISUAL.FOG_NEAR, GameConfig.VISUAL.FOG_FAR);

    this.camera = new THREE.PerspectiveCamera(
      GameConfig.VISUAL.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      GameConfig.VISUAL.CAMERA_NEAR,
      GameConfig.VISUAL.CAMERA_FAR
    );
    this.camera.position.set(0, GameConfig.PLAYER.EYE_HEIGHT, 0);
    this.scene.add(this.camera);

    this.inputManager = inputManager;
    this.eventBus = EventBus.getInstance();
    this.eventBus.on('game:stateChanged', this.onGameStateChanged);
    this.colliderManager = new ColliderManager();

    this.setupLighting();
    this.setupGround();
    this.mapBuilder = new MapBuilder(this.scene, this.colliderManager);
    this.factoryEnvironment = new FactoryEnvironment(this.scene, this.colliderManager);
    this.scenicBackdrop = new ScenicBackdrop(this.scene);
    this.perimeterFence = new PerimeterFence(this.scene, this.colliderManager);

    this.fpsCamera = new FPSCamera(this.camera, this.inputManager);
    this.movement = new Movement(this.camera, this.inputManager, this.fpsCamera, this.colliderManager);
    this.player = new Player();
    this.playerModel = new PlayerModel(this.scene);
    this.debug = new Debug(this.scene, this.colliderManager, this.inputManager);
    this.hud = new HUD();
    this.raycastShooter = new RaycastShooter(this.scene);
    this.hitEffectSystem = new HitEffectSystem(this.scene);
    this.weaponView = new WeaponView(this.camera);
    this.knifeView = new KnifeView(this.camera);
    this.aimController = new AimController(this.camera, this.inputManager);
    this.audioManager = new AudioManager();
    this.damageSystem = new DamageSystem();
    this.coverSystem = new CoverSystem();
    this.waveManager = new WaveManager(this.scene, difficulty);
    this.weaponLoadout = new WeaponLoadout(this.camera, this.inputManager);
    this.pickupSpawner = new PickupSpawner(this.scene, difficulty);
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(GameConfig.VISUAL.AMBIENT_COLOR, GameConfig.VISUAL.AMBIENT_INTENSITY);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(GameConfig.VISUAL.SUN_COLOR, GameConfig.VISUAL.SUN_INTENSITY);
    directional.position.set(...GameConfig.VISUAL.SUN_POSITION);
    directional.castShadow = true;
    directional.shadow.mapSize.set(GameConfig.VISUAL.SHADOW_MAP_SIZE, GameConfig.VISUAL.SHADOW_MAP_SIZE);
    directional.shadow.camera.near = GameConfig.VISUAL.SHADOW_CAMERA_NEAR;
    directional.shadow.camera.far = GameConfig.VISUAL.SHADOW_CAMERA_FAR;
    directional.shadow.camera.left = -GameConfig.VISUAL.SHADOW_CAMERA_EXTENT;
    directional.shadow.camera.right = GameConfig.VISUAL.SHADOW_CAMERA_EXTENT;
    directional.shadow.camera.top = GameConfig.VISUAL.SHADOW_CAMERA_EXTENT;
    directional.shadow.camera.bottom = -GameConfig.VISUAL.SHADOW_CAMERA_EXTENT;
    directional.shadow.bias = GameConfig.VISUAL.SHADOW_BIAS;
    this.scene.add(directional);

    const hemisphere = new THREE.HemisphereLight(
      GameConfig.VISUAL.HEMISPHERE_SKY_COLOR,
      GameConfig.VISUAL.HEMISPHERE_GROUND_COLOR,
      GameConfig.VISUAL.HEMISPHERE_INTENSITY
    );
    this.scene.add(hemisphere);
  }

  private setupGround(): void {
    const geometry = new THREE.PlaneGeometry(
      GameConfig.VISUAL.GROUND_SIZE,
      GameConfig.VISUAL.GROUND_SIZE,
      GameConfig.VISUAL.GROUND_SEGMENTS,
      GameConfig.VISUAL.GROUND_SEGMENTS
    );
    const positions = geometry.getAttribute('position');
    const colors: number[] = [];
    const baseColor = new THREE.Color(GameConfig.VISUAL.GROUND_COLOR);
    for (let index = 0; index < positions.count; index += 1) {
      const variation = Math.sin(positions.getX(index) * 0.19) * Math.cos(positions.getY(index) * 0.17)
        * GameConfig.VISUAL.GROUND_VARIATION;
      const color = baseColor.clone().offsetHSL(0, 0, variation);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: GameConfig.VISUAL.GROUND_ROUGHNESS,
      metalness: GameConfig.VISUAL.GROUND_METALNESS,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.environmentObjects.push(ground);

    const grid = new THREE.GridHelper(
      GameConfig.VISUAL.GROUND_SIZE,
      GameConfig.VISUAL.GRID_DIVISIONS,
      GameConfig.VISUAL.GRID_MAJOR_COLOR,
      GameConfig.VISUAL.GRID_MINOR_COLOR
    );
    grid.position.y = 0.01;
    grid.userData.raycastIgnore = true;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((gridMaterial) => {
      gridMaterial.transparent = true;
      gridMaterial.opacity = GameConfig.VISUAL.GRID_OPACITY;
    });
    this.scene.add(grid);
    this.environmentObjects.push(grid);
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
    this.eventBus.off('game:stateChanged', this.onGameStateChanged);
    this.pickupSpawner.dispose();
    this.weaponLoadout.dispose();
    this.waveManager.dispose();
    this.coverSystem.dispose();
    this.damageSystem.dispose();
    this.player.dispose();
    this.playerModel.dispose();
    this.mapBuilder.dispose();
    this.factoryEnvironment.dispose();
    this.scenicBackdrop.dispose();
    this.perimeterFence.dispose();
    this.colliderManager.dispose();
    this.weaponView.dispose();
    this.knifeView.dispose();
    this.aimController.dispose();
    this.hitEffectSystem.dispose();
    this.raycastShooter.dispose();
    this.hud.dispose();
    this.audioManager.dispose();
    this.debug.dispose();
    this.environmentObjects.forEach((object) => {
      this.scene.remove(object);
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.environmentObjects.length = 0;
    console.log('[MainArena] Scene unloaded');
  }

  update(delta: number): void {
    this.debug.update();
    if (!this.combatActive) return;
    this.fpsCamera.update();
    this.movement.update(delta);
    this.weaponLoadout.update(delta);
    this.aimController.update(delta);
    this.weaponView.update(delta);
    this.knifeView.update(delta);
    this.raycastShooter.update(delta);
    this.hitEffectSystem.update(delta);
    const transform: PlayerTransformEvent = {
      position: this.camera.getWorldPosition(new THREE.Vector3()),
      forward: this.camera.getWorldDirection(new THREE.Vector3()),
    };
    this.eventBus.emit('player:transformChanged', transform);
    this.playerModel.update(delta);
    this.waveManager.update(delta, true);
    this.pickupSpawner.update(delta, true);
  }

  private onGameStateChanged = (...args: unknown[]): void => {
    const event = args[0] as GameStateChangedEvent | undefined;
    if (event) this.combatActive = event.current === 'playing';
  };
}
