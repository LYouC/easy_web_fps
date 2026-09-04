import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { PickupBase } from '@/pickups/PickupBase';

export class AmmoPickup extends PickupBase {
  constructor(
    scene: THREE.Scene,
    id: string,
    position: THREE.Vector3,
    source: 'map' | 'enemy',
    amount: number
  ) {
    super(scene, id, position, amount, source);
    this.createVisual();
  }

  private createVisual(): void {
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.PICKUP.BODY_COLOR,
      emissive: GameConfig.PICKUP.BODY_COLOR,
      emissiveIntensity: GameConfig.PICKUP.EMISSIVE_INTENSITY,
      roughness: GameConfig.PICKUP.ROUGHNESS,
      metalness: GameConfig.PICKUP.METALNESS,
    });
    const lidMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.PICKUP.LID_COLOR,
      emissive: GameConfig.PICKUP.LID_COLOR,
      emissiveIntensity: GameConfig.PICKUP.EMISSIVE_INTENSITY,
      roughness: GameConfig.PICKUP.ROUGHNESS,
      metalness: GameConfig.PICKUP.METALNESS,
    });
    const strapMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.PICKUP.STRAP_COLOR,
      emissive: GameConfig.PICKUP.STRAP_COLOR,
      emissiveIntensity: GameConfig.PICKUP.EMISSIVE_INTENSITY,
      roughness: GameConfig.PICKUP.ROUGHNESS,
      metalness: GameConfig.PICKUP.METALNESS,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(GameConfig.PICKUP.BOX_WIDTH, GameConfig.PICKUP.BOX_HEIGHT, GameConfig.PICKUP.BOX_DEPTH),
      bodyMaterial
    );
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(GameConfig.PICKUP.BOX_WIDTH, GameConfig.PICKUP.LID_HEIGHT, GameConfig.PICKUP.BOX_DEPTH),
      lidMaterial
    );
    lid.position.y = GameConfig.PICKUP.LID_Y;
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(GameConfig.PICKUP.STRAP_WIDTH, GameConfig.PICKUP.BOX_HEIGHT + GameConfig.PICKUP.LID_HEIGHT, GameConfig.PICKUP.BOX_DEPTH * GameConfig.PICKUP.STRAP_DEPTH_SCALE),
      strapMaterial
    );
    strap.position.y = GameConfig.PICKUP.LID_Y * GameConfig.PICKUP.STRAP_Y_SCALE;
    for (const mesh of [body, lid, strap]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.raycastIgnore = true;
      this.group.add(mesh);
    }
  }
}
