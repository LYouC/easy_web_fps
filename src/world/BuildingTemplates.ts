import { GameConfig } from '@/config/GameConfig';

export type BuildingTemplateName = 'wall' | 'lowWall' | 'pillar' | 'room';

export interface BuildingPieceConfig {
  position: readonly [number, number, number];
  size: readonly [number, number, number];
  color: number;
}

export class BuildingTemplates {
  static wall(position: readonly [number, number, number], size: readonly [number, number, number], color: number): BuildingPieceConfig[] {
    return [{ position, size, color }];
  }

  static lowWall(position: readonly [number, number, number], size: readonly [number, number, number], color: number): BuildingPieceConfig[] {
    return [{ position, size, color }];
  }

  static pillar(position: readonly [number, number, number], size: readonly [number, number, number], color: number): BuildingPieceConfig[] {
    return [{ position, size, color }];
  }

  static room(position: readonly [number, number, number], size: readonly [number, number, number], color: number): BuildingPieceConfig[] {
    const [x, y, z] = position;
    const [width, height, depth] = size;
    const thickness = Math.min(width, depth) * GameConfig.WORLD.ROOM_WALL_THICKNESS_RATIO;
    return [
      { position: [x - width / 2 + thickness / 2, y, z], size: [thickness, height, depth], color },
      { position: [x + width / 2 - thickness / 2, y, z], size: [thickness, height, depth], color },
      { position: [x, y, z - depth / 2 + thickness / 2], size: [width, height, thickness], color },
      { position: [x, y, z + depth / 2 - thickness / 2], size: [width, height, thickness], color },
    ];
  }
}
