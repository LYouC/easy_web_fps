import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { EnemyAttackResolvedEvent, EnemyDamagedEvent, EnemyDiedEvent, EnemyHitZone, EnemySpawnedEvent, EnemyState } from '@/core/GameEvents';
import type { EnemyDefinition } from '@/enemies/EnemyTypes';

interface TimedEffect {
  object: THREE.Object3D;
  remaining: number;
  duration: number;
}

export class EnemyBase {
  private readonly scene: THREE.Scene;
  private readonly eventBus: EventBus;
  private readonly group = new THREE.Group();
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly effects: TimedEffect[] = [];
  private readonly healthFill: THREE.Mesh;
  private hp: number;
  private state: EnemyState = 'spawning';
  private spawnRemaining: number = GameConfig.ENEMY.SPAWN_DURATION;
  private deathRemaining: number = GameConfig.ENEMY.DEATH_DURATION;
  private hitFlashRemaining = 0;

  constructor(
    scene: THREE.Scene,
    private readonly id: string,
    private readonly definition: EnemyDefinition,
    position: THREE.Vector3
  ) {
    this.scene = scene;
    this.eventBus = EventBus.getInstance();
    this.hp = definition.maxHp;
    this.group.name = `enemy_${id}`;
    this.group.position.copy(position);
    this.group.scale.setScalar(GameConfig.ENEMY.SPAWN_MIN_SCALE);
    this.group.userData.enemyId = id;
    this.group.userData.enemyType = definition.type;

    const body = this.createPart(
      new THREE.BoxGeometry(GameConfig.ENEMY.BODY_WIDTH, GameConfig.ENEMY.BODY_HEIGHT, GameConfig.ENEMY.BODY_DEPTH),
      definition.color,
      'body'
    );
    body.position.y = GameConfig.ENEMY.BODY_Y;
    this.group.add(body);

    const headGeometry = definition.type === 'elite'
      ? new THREE.OctahedronGeometry(GameConfig.ENEMY.HEAD_RADIUS)
      : new THREE.SphereGeometry(GameConfig.ENEMY.HEAD_RADIUS, GameConfig.ENEMY.BODY_SPHERE_SEGMENTS, GameConfig.ENEMY.BODY_SPHERE_RINGS);
    const head = this.createPart(headGeometry, definition.color, 'head');
    head.position.y = GameConfig.ENEMY.HEAD_Y;
    this.group.add(head);

    if (definition.type === 'heavy') this.addHeavyArmor();
    if (definition.type === 'elite') this.addEliteCrest();

    this.healthFill = this.createHealthBar();
    this.scene.add(this.group);
    this.eventBus.on('enemy:damaged', this.onDamaged);
    this.eventBus.on('enemy:died', this.onDied);
    this.eventBus.on('enemy:attackVisual', this.onAttackResolved);

    const spawned: EnemySpawnedEvent = {
      enemyId: id,
      type: definition.type,
      maxHp: definition.maxHp,
      points: definition.points,
    };
    this.eventBus.emit('enemy:spawned', spawned);
  }

  private createPart(geometry: THREE.BufferGeometry, color: number, hitZone: EnemyHitZone): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: GameConfig.ENEMY.MATERIAL_ROUGHNESS,
      metalness: this.definition.type === 'elite' ? GameConfig.ENEMY.ELITE_MATERIAL_METALNESS : GameConfig.ENEMY.MATERIAL_METALNESS,
      transparent: true,
    });
    this.materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.enemyId = this.id;
    mesh.userData.enemyHitZone = hitZone;
    return mesh;
  }

  private addHeavyArmor(): void {
    const armor = this.createPart(
      new THREE.BoxGeometry(GameConfig.ENEMY.HEAVY_ARMOR_WIDTH, GameConfig.ENEMY.BODY_HEIGHT * GameConfig.ENEMY.HEAVY_ARMOR_HEIGHT_SCALE, GameConfig.ENEMY.BODY_DEPTH * GameConfig.ENEMY.HEAVY_ARMOR_DEPTH_SCALE),
      this.definition.color,
      'armor'
    );
    armor.position.y = GameConfig.ENEMY.BODY_Y + GameConfig.ENEMY.BODY_HEIGHT * GameConfig.ENEMY.HEAVY_ARMOR_Y_OFFSET_SCALE;
    this.group.add(armor);
  }

  private addEliteCrest(): void {
    const crest = this.createPart(
      new THREE.ConeGeometry(GameConfig.ENEMY.ELITE_CREST_RADIUS, GameConfig.ENEMY.ELITE_CREST_HEIGHT, GameConfig.ENEMY.CONE_SEGMENTS),
      this.definition.color,
      'head'
    );
    crest.position.y = GameConfig.ENEMY.HEAD_Y + GameConfig.ENEMY.HEAD_RADIUS + GameConfig.ENEMY.ELITE_CREST_HEIGHT * GameConfig.ENEMY.ELITE_CREST_Y_OFFSET_SCALE;
    this.group.add(crest);
  }

  private createHealthBar(): THREE.Mesh {
    const background = new THREE.Mesh(
      new THREE.BoxGeometry(GameConfig.ENEMY.HEALTH_BAR_WIDTH, GameConfig.ENEMY.HEALTH_BAR_HEIGHT, GameConfig.ENEMY.HEALTH_BAR_DEPTH),
      new THREE.MeshBasicMaterial({ color: GameConfig.ENEMY.HEALTH_BAR_BACKGROUND })
    );
    background.position.y = GameConfig.ENEMY.HEALTH_BAR_Y;
    background.userData.raycastIgnore = true;
    const fill = new THREE.Mesh(
      new THREE.BoxGeometry(GameConfig.ENEMY.HEALTH_BAR_WIDTH, GameConfig.ENEMY.HEALTH_BAR_HEIGHT * GameConfig.ENEMY.HEALTH_FILL_HEIGHT_SCALE, GameConfig.ENEMY.HEALTH_BAR_DEPTH * GameConfig.ENEMY.HEALTH_FILL_DEPTH_SCALE),
      new THREE.MeshBasicMaterial({ color: this.definition.color })
    );
    fill.position.z = GameConfig.ENEMY.HEALTH_BAR_DEPTH;
    fill.userData.raycastIgnore = true;
    background.add(fill);
    this.group.add(background);
    return fill;
  }

  private onDamaged = (...args: unknown[]): void => {
    const event = args[0] as EnemyDamagedEvent | undefined;
    if (!event || event.enemyId !== this.id || this.state === 'dead') return;
    this.hp = event.hp;
    const ratio = this.hp / event.maxHp;
    this.healthFill.scale.x = ratio;
    this.healthFill.position.x = -GameConfig.ENEMY.HEALTH_BAR_WIDTH * (1 - ratio) * 0.5;
    this.hitFlashRemaining = GameConfig.ENEMY.HIT_FLASH_DURATION;
  };

  private onDied = (...args: unknown[]): void => {
    const event = args[0] as EnemyDiedEvent | undefined;
    if (!event || event.enemyId !== this.id || this.state === 'dead') return;
    this.hp = 0;
    this.state = 'dead';
    this.healthFill.parent!.visible = false;
  };

  private onAttackResolved = (...args: unknown[]): void => {
    const event = args[0] as EnemyAttackResolvedEvent | undefined;
    if (!event || event.enemyId !== this.id || this.state === 'dead') return;
    this.playAttackFeedback(event.impactPoint);
  };

  update(delta: number, cameraPosition: THREE.Vector3): void {
    if (this.state === 'spawning') {
      this.spawnRemaining = Math.max(0, this.spawnRemaining - delta);
      const progress = 1 - this.spawnRemaining / GameConfig.ENEMY.SPAWN_DURATION;
      const eased = 1 - Math.pow(1 - progress, 3);
      this.group.scale.setScalar(this.definition.scale * Math.max(GameConfig.ENEMY.SPAWN_MIN_SCALE, eased));
      if (this.spawnRemaining === 0) this.state = 'idle';
    } else if (this.state === 'dead') {
      this.deathRemaining = Math.max(0, this.deathRemaining - delta);
      const progress = this.deathRemaining / GameConfig.ENEMY.DEATH_DURATION;
      this.group.scale.set(
        this.definition.scale * (1 + (1 - progress) * GameConfig.ENEMY.DEATH_EXPANSION),
        this.definition.scale * Math.max(GameConfig.ENEMY.DEATH_MIN_HEIGHT_SCALE, progress),
        this.definition.scale * (1 + (1 - progress) * GameConfig.ENEMY.DEATH_EXPANSION)
      );
      this.materials.forEach((material) => { material.opacity = progress; });
    }

    if (this.hitFlashRemaining > 0) {
      this.hitFlashRemaining = Math.max(0, this.hitFlashRemaining - delta);
      const intensity = this.hitFlashRemaining / GameConfig.ENEMY.HIT_FLASH_DURATION;
      this.materials.forEach((material) => {
        material.emissive.setRGB(intensity, intensity * GameConfig.ENEMY.HIT_FLASH_GREEN, intensity * GameConfig.ENEMY.HIT_FLASH_BLUE);
        material.emissiveIntensity = intensity;
      });
    } else if (this.state === 'aim') {
      this.materials.forEach((material) => {
        material.emissive.copy(material.color);
        material.emissiveIntensity = GameConfig.ENEMY.AIM_EMISSIVE_INTENSITY;
      });
    } else {
      this.materials.forEach((material) => material.emissive.setHex(0x000000));
    }

    this.group.children.forEach((child) => {
      if (child.userData.raycastIgnore === true) child.lookAt(cameraPosition);
    });
    this.updateEffects(delta);
  }

  playAttackFeedback(target: THREE.Vector3): void {
    const origin = this.getMuzzlePosition();
    const direction = target.clone().sub(origin);
    const distance = direction.length();
    if (distance <= 0) return;

    const tracerMaterial = new THREE.MeshBasicMaterial({
      color: GameConfig.ENEMY.ATTACK_TRACER_COLOR,
      transparent: true,
      opacity: GameConfig.ENEMY.ATTACK_TRACER_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(GameConfig.ENEMY.ATTACK_TRACER_RADIUS, GameConfig.ENEMY.ATTACK_TRACER_RADIUS, distance, GameConfig.ENEMY.CONE_SEGMENTS),
      tracerMaterial
    );
    tracer.position.copy(origin).add(target).multiplyScalar(0.5);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    tracer.userData.raycastIgnore = true;
    this.scene.add(tracer);
    this.effects.push({ object: tracer, remaining: GameConfig.ENEMY.ATTACK_TRACER_DURATION, duration: GameConfig.ENEMY.ATTACK_TRACER_DURATION });

    const flash = new THREE.PointLight(this.definition.color, GameConfig.ENEMY.ATTACK_LIGHT_INTENSITY, GameConfig.ENEMY.ATTACK_LIGHT_RANGE);
    flash.position.copy(origin);
    flash.userData.raycastIgnore = true;
    this.scene.add(flash);
    this.effects.push({ object: flash, remaining: GameConfig.ENEMY.ATTACK_FLASH_DURATION, duration: GameConfig.ENEMY.ATTACK_FLASH_DURATION });
  }

  private updateEffects(delta: number): void {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      if (!effect) continue;
      effect.remaining -= delta;
      if (effect.object instanceof THREE.Mesh) {
        (effect.object.material as THREE.MeshBasicMaterial).opacity = Math.max(0, effect.remaining / effect.duration) * GameConfig.ENEMY.ATTACK_TRACER_OPACITY;
      } else if (effect.object instanceof THREE.PointLight) {
        effect.object.intensity = Math.max(0, effect.remaining / effect.duration) * GameConfig.ENEMY.ATTACK_LIGHT_INTENSITY;
      }
      if (effect.remaining > 0) continue;
      this.disposeEffect(effect.object);
      this.effects.splice(index, 1);
    }
  }

  private disposeEffect(object: THREE.Object3D): void {
    this.scene.remove(object);
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  }

  setState(state: EnemyState): void {
    if (this.state !== 'dead' && this.state !== 'spawning') this.state = state;
  }

  getState(): EnemyState {
    return this.state;
  }

  getId(): string {
    return this.id;
  }

  getDefinition(): EnemyDefinition {
    return this.definition;
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  getTargetPosition(): THREE.Vector3 {
    return this.group.position.clone().add(new THREE.Vector3(0, GameConfig.ENEMY.BODY_Y * this.definition.scale, 0));
  }

  getMuzzlePosition(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    return this.group.position.clone()
      .add(new THREE.Vector3(0, GameConfig.ENEMY.MUZZLE_Y * this.definition.scale, 0))
      .addScaledVector(forward, GameConfig.ENEMY.MUZZLE_FORWARD * this.definition.scale);
  }

  faceDirection(direction: THREE.Vector3): void {
    if (direction.lengthSq() === 0) return;
    this.group.rotation.y = Math.atan2(direction.x, direction.z);
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  isReadyToRemove(): boolean {
    return this.state === 'dead' && this.deathRemaining === 0;
  }

  dispose(): void {
    this.eventBus.off('enemy:damaged', this.onDamaged);
    this.eventBus.off('enemy:died', this.onDied);
    this.eventBus.off('enemy:attackVisual', this.onAttackResolved);
    this.effects.forEach((effect) => this.disposeEffect(effect.object));
    this.effects.length = 0;
    this.scene.remove(this.group);
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  }
}
