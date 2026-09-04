import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { EventBus } from '@/core/EventBus';
import type {
  EnemyDiedEvent,
  WorldCoverClaimRequestEvent,
  WorldCoverPointsRequestEvent,
  WorldCoverReleaseEvent,
  WorldSpawnPointsRequestEvent,
} from '@/core/GameEvents';
import { BuildingTemplates, type BuildingPieceConfig, type BuildingTemplateName } from '@/world/BuildingTemplates';
import { ColliderManager } from '@/world/ColliderManager';

export class MapBuilder {
  private readonly eventBus = EventBus.getInstance();
  private readonly buildingMeshes: THREE.Mesh[] = [];
  private readonly colliderIds: string[] = [];
  private readonly spawnPoints = GameConfig.WORLD.PICKUP_SPAWN_POINTS.map((point) => new THREE.Vector3(...point));
  private readonly coverPoints: { id: string; position: THREE.Vector3 }[] = [];
  private readonly coverClaims = new Map<string, string>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliderManager: ColliderManager
  ) {
    this.buildArena();
    this.eventBus.on('world:spawnPointsRequested', this.onSpawnPointsRequested);
    this.eventBus.on('world:coverPointsRequested', this.onCoverPointsRequested);
    this.eventBus.on('world:coverClaimRequested', this.onCoverClaimRequested);
    this.eventBus.on('world:coverReleased', this.onCoverReleased);
    this.eventBus.on('enemy:died', this.onEnemyDied);
  }

  private buildArena(): void {
    let pieceIndex = 0;
    for (const building of GameConfig.WORLD.BUILDINGS) {
      const pieces = this.createTemplate(building.template, building.position, building.size, building.color);
      for (const piece of pieces) {
        this.addPiece(`building_${pieceIndex}`, piece);
        pieceIndex += 1;
      }
    }
  }

  private createTemplate(
    template: BuildingTemplateName,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
    color: number
  ): BuildingPieceConfig[] {
    if (template === 'lowWall') return BuildingTemplates.lowWall(position, size, color);
    if (template === 'pillar') return BuildingTemplates.pillar(position, size, color);
    if (template === 'room') return BuildingTemplates.room(position, size, color);
    return BuildingTemplates.wall(position, size, color);
  }

  private addPiece(id: string, config: BuildingPieceConfig): void {
    const [width, height, depth] = config.size;
    const [x, y, z] = config.position;
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: GameConfig.WORLD.BUILDING_ROUGHNESS,
      metalness: GameConfig.WORLD.BUILDING_METALNESS,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.buildingMeshes.push(mesh);

    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const halfDepth = depth / 2;
    this.colliderManager.add(id, {
      min: new THREE.Vector3(x - halfWidth, y - halfHeight, z - halfDepth),
      max: new THREE.Vector3(x + halfWidth, y + halfHeight, z + halfDepth),
    });
    this.colliderIds.push(id);
    this.addCoverPoints(id, x, z, halfWidth, halfDepth);
  }

  private addCoverPoints(id: string, x: number, z: number, halfWidth: number, halfDepth: number): void {
    const offset = GameConfig.WORLD.COVER_OFFSET;
    this.coverPoints.push(
      { id: `${id}_west`, position: new THREE.Vector3(x - halfWidth - offset, 0, z) },
      { id: `${id}_east`, position: new THREE.Vector3(x + halfWidth + offset, 0, z) },
      { id: `${id}_north`, position: new THREE.Vector3(x, 0, z - halfDepth - offset) },
      { id: `${id}_south`, position: new THREE.Vector3(x, 0, z + halfDepth + offset) },
    );
  }

  private onSpawnPointsRequested = (...args: unknown[]): void => {
    const request = args[0] as WorldSpawnPointsRequestEvent | undefined;
    if (request) request.points = this.spawnPoints.map((point) => point.clone());
  };

  private onCoverPointsRequested = (...args: unknown[]): void => {
    const request = args[0] as WorldCoverPointsRequestEvent | undefined;
    if (request) request.points = this.coverPoints.map((point) => ({ id: point.id, position: point.position.clone() }));
  };

  private onCoverClaimRequested = (...args: unknown[]): void => {
    const request = args[0] as WorldCoverClaimRequestEvent | undefined;
    if (!request) return;
    const owner = this.coverClaims.get(request.coverId);
    if (!owner || owner === request.enemyId) {
      this.coverClaims.set(request.coverId, request.enemyId);
      request.claimed = true;
    }
  };

  private onCoverReleased = (...args: unknown[]): void => {
    const event = args[0] as WorldCoverReleaseEvent | undefined;
    if (event && this.coverClaims.get(event.coverId) === event.enemyId) this.coverClaims.delete(event.coverId);
  };

  private onEnemyDied = (...args: unknown[]): void => {
    const event = args[0] as EnemyDiedEvent | undefined;
    if (!event) return;
    for (const [coverId, enemyId] of this.coverClaims) {
      if (enemyId === event.enemyId) this.coverClaims.delete(coverId);
    }
  };

  dispose(): void {
    this.eventBus.off('world:spawnPointsRequested', this.onSpawnPointsRequested);
    this.eventBus.off('world:coverPointsRequested', this.onCoverPointsRequested);
    this.eventBus.off('world:coverClaimRequested', this.onCoverClaimRequested);
    this.eventBus.off('world:coverReleased', this.onCoverReleased);
    this.eventBus.off('enemy:died', this.onEnemyDied);
    this.buildingMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.colliderIds.forEach((id) => this.colliderManager.remove(id));
    this.buildingMeshes.length = 0;
    this.colliderIds.length = 0;
    this.coverClaims.clear();
  }
}
