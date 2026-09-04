import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type { AmmoPickupRequestEvent, PickupCollectedEvent } from '@/core/GameEvents';

export abstract class PickupBase {
  protected readonly group = new THREE.Group();
  private readonly eventBus = EventBus.getInstance();
  private elapsed = 0;
  private collectRemaining = 0;
  private retryRemaining = 0;
  private collected = false;
  private disposed = false;

  protected constructor(
    protected readonly scene: THREE.Scene,
    private readonly id: string,
    position: THREE.Vector3,
    private readonly amount: number,
    private readonly source: 'map' | 'enemy'
  ) {
    this.group.name = `pickup_${id}`;
    this.group.position.copy(position);
    this.group.position.y = GameConfig.PICKUP.FLOAT_HEIGHT;
    this.group.userData.raycastIgnore = true;
    this.scene.add(this.group);
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    if (this.disposed) return;
    if (this.collected) {
      this.updateCollection(delta);
      return;
    }

    this.elapsed += delta;
    this.retryRemaining = Math.max(0, this.retryRemaining - delta);
    this.group.rotation.y += GameConfig.PICKUP.ROTATION_SPEED * delta;
    this.group.position.y = GameConfig.PICKUP.FLOAT_HEIGHT
      + Math.sin(this.elapsed * GameConfig.PICKUP.FLOAT_SPEED) * GameConfig.PICKUP.FLOAT_AMPLITUDE;
    if (this.retryRemaining === 0 && this.horizontalDistanceTo(playerPosition) <= GameConfig.PICKUP.PICKUP_RADIUS) {
      this.tryCollect();
    }
  }

  private horizontalDistanceTo(position: THREE.Vector3): number {
    const dx = this.group.position.x - position.x;
    const dz = this.group.position.z - position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private tryCollect(): void {
    this.retryRemaining = GameConfig.PICKUP.COLLECTION_RETRY_INTERVAL;
    const request: AmmoPickupRequestEvent = {
      pickupId: this.id,
      amount: this.amount,
      accepted: false,
      granted: 0,
    };
    this.eventBus.emit('pickup:ammoCollectionRequested', request);
    if (!request.accepted || request.granted <= 0) return;
    this.collected = true;
    this.collectRemaining = GameConfig.PICKUP.COLLECT_DURATION;
    const event: PickupCollectedEvent = {
      pickupId: this.id,
      position: this.getGroundPosition(),
      amount: request.granted,
    };
    this.eventBus.emit('pickup:collected', event);
  }

  private updateCollection(delta: number): void {
    this.collectRemaining = Math.max(0, this.collectRemaining - delta);
    const progress = 1 - this.collectRemaining / GameConfig.PICKUP.COLLECT_DURATION;
    const scale = Math.max(0, 1 - progress);
    this.group.scale.setScalar(scale);
    this.group.position.y += GameConfig.PICKUP.COLLECT_RISE * delta;
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        material.transparent = true;
        material.opacity = scale;
      });
    });
  }

  getId(): string {
    return this.id;
  }

  getSource(): 'map' | 'enemy' {
    return this.source;
  }

  getGroundPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.group.position.x, 0, this.group.position.z);
  }

  isReadyToRemove(): boolean {
    return this.collected && this.collectRemaining === 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.group);
    this.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material.dispose();
    });
  }
}
