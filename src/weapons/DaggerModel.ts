import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';

export interface DaggerModelParts {
  group: THREE.Group;
  trail: THREE.Group;
  trailCoreMaterial: THREE.MeshBasicMaterial;
  trailGlowMaterial: THREE.MeshBasicMaterial;
}

export class DaggerModel {
  static build(): DaggerModelParts {
    const group = new THREE.Group();
    group.userData.raycastIgnore = true;

    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.WEAPON.KNIFE_BLADE_COLOR,
      emissive: GameConfig.WEAPON.KNIFE_BLADE_COLOR,
      emissiveIntensity: GameConfig.WEAPON.KNIFE_BLADE_EMISSIVE_INTENSITY,
      roughness: GameConfig.WEAPON.KNIFE_BLADE_ROUGHNESS,
      metalness: GameConfig.WEAPON.KNIFE_BLADE_METALNESS,
    });
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.WEAPON.KNIFE_EDGE_COLOR,
      emissive: GameConfig.WEAPON.KNIFE_EDGE_COLOR,
      emissiveIntensity: GameConfig.WEAPON.KNIFE_EDGE_EMISSIVE_INTENSITY,
      roughness: GameConfig.WEAPON.KNIFE_BLADE_ROUGHNESS,
      metalness: GameConfig.WEAPON.KNIFE_BLADE_METALNESS,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.WEAPON.KNIFE_ACCENT_COLOR,
      emissive: GameConfig.WEAPON.KNIFE_ACCENT_COLOR,
      emissiveIntensity: GameConfig.WEAPON.KNIFE_EDGE_EMISSIVE_INTENSITY,
      roughness: GameConfig.WEAPON.KNIFE_ACCENT_ROUGHNESS,
      metalness: GameConfig.WEAPON.KNIFE_ACCENT_METALNESS,
    });
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.WEAPON.KNIFE_HANDLE_COLOR,
      roughness: GameConfig.WEAPON.KNIFE_HANDLE_ROUGHNESS,
      metalness: GameConfig.WEAPON.KNIFE_HANDLE_METALNESS,
    });

    const bladeShape = this.createBladeShape();
    const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
      depth: GameConfig.WEAPON.KNIFE_BLADE_THICKNESS,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: GameConfig.WEAPON.KNIFE_BLADE_BEVEL_SEGMENTS,
      bevelSize: GameConfig.WEAPON.KNIFE_BLADE_BEVEL_SIZE,
      bevelThickness: GameConfig.WEAPON.KNIFE_BLADE_BEVEL_THICKNESS,
    });
    bladeGeometry.translate(0, 0, -GameConfig.WEAPON.KNIFE_BLADE_THICKNESS * 0.5);
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    group.add(blade);

    const sharpEdge = new THREE.Mesh(new THREE.ShapeGeometry(this.createSharpEdgeShape()), edgeMaterial);
    sharpEdge.position.z = GameConfig.WEAPON.KNIFE_BLADE_THICKNESS * 0.74;
    group.add(sharpEdge);

    const fuller = new THREE.Mesh(
      new THREE.BoxGeometry(
        GameConfig.WEAPON.KNIFE_FULLER_WIDTH,
        GameConfig.WEAPON.KNIFE_FULLER_LENGTH,
        GameConfig.WEAPON.KNIFE_BLADE_THICKNESS * 0.16
      ),
      accentMaterial
    );
    fuller.position.set(
      GameConfig.WEAPON.KNIFE_FULLER_X,
      GameConfig.WEAPON.KNIFE_FULLER_Y,
      GameConfig.WEAPON.KNIFE_BLADE_THICKNESS * 0.72
    );
    group.add(fuller);

    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(
        GameConfig.WEAPON.KNIFE_GUARD_WIDTH,
        GameConfig.WEAPON.KNIFE_GUARD_HEIGHT,
        GameConfig.WEAPON.KNIFE_GUARD_DEPTH
      ),
      bladeMaterial
    );
    guard.position.y = -GameConfig.WEAPON.KNIFE_GUARD_HEIGHT * 0.5;
    group.add(guard);

    const handleGeometry = new THREE.ExtrudeGeometry(this.createHandleShape(), {
      depth: GameConfig.WEAPON.KNIFE_GRIP_RIB_DEPTH * 0.82,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: GameConfig.WEAPON.KNIFE_BLADE_BEVEL_SIZE,
      bevelThickness: GameConfig.WEAPON.KNIFE_BLADE_BEVEL_THICKNESS,
    });
    handleGeometry.translate(0, 0, -GameConfig.WEAPON.KNIFE_GRIP_RIB_DEPTH * 0.41);
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    group.add(handle);

    for (let index = 0; index < GameConfig.WEAPON.KNIFE_GRIP_BAND_COUNT; index += 1) {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(
          GameConfig.WEAPON.KNIFE_GRIP_RIB_WIDTH,
          GameConfig.WEAPON.KNIFE_GRIP_RIB_HEIGHT,
          GameConfig.WEAPON.KNIFE_GRIP_RIB_DEPTH
        ),
        accentMaterial
      );
      band.rotation.z = -0.08;
      band.position.y = -GameConfig.WEAPON.KNIFE_GRIP_BAND_START
        - index * GameConfig.WEAPON.KNIFE_GRIP_BAND_SPACING;
      group.add(band);
    }

    const pommel = new THREE.Mesh(
      new THREE.BoxGeometry(
        GameConfig.WEAPON.KNIFE_POMMEL_RADIUS * 1.5,
        GameConfig.WEAPON.KNIFE_POMMEL_RADIUS,
        GameConfig.WEAPON.KNIFE_GRIP_RIB_DEPTH
      ),
      bladeMaterial
    );
    pommel.position.y = -GameConfig.WEAPON.KNIFE_HANDLE_LENGTH - GameConfig.WEAPON.KNIFE_POMMEL_OFFSET;
    group.add(pommel);

    const choil = new THREE.Mesh(
      new THREE.TorusGeometry(
        GameConfig.WEAPON.KNIFE_CHOIL_RADIUS,
        GameConfig.WEAPON.KNIFE_CHOIL_TUBE,
        GameConfig.WEAPON.KNIFE_GRIP_BAND_SEGMENTS,
        GameConfig.WEAPON.KNIFE_HANDLE_SEGMENTS
      ),
      edgeMaterial
    );
    choil.position.set(GameConfig.WEAPON.KNIFE_BLADE_WIDTH * 0.27, -GameConfig.WEAPON.KNIFE_GUARD_HEIGHT, GameConfig.WEAPON.KNIFE_GUARD_DEPTH * 0.55);
    group.add(choil);

    const trailCoreMaterial = this.createTrailMaterial(GameConfig.WEAPON.KNIFE_TRAIL_CORE_COLOR);
    const trailGlowMaterial = this.createTrailMaterial(GameConfig.WEAPON.KNIFE_TRAIL_GLOW_COLOR);
    const trail = new THREE.Group();
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(GameConfig.WEAPON.KNIFE_TRAIL_GLOW_WIDTH, GameConfig.WEAPON.KNIFE_TRAIL_LENGTH),
      trailGlowMaterial
    );
    const core = new THREE.Mesh(
      new THREE.PlaneGeometry(GameConfig.WEAPON.KNIFE_TRAIL_CORE_WIDTH, GameConfig.WEAPON.KNIFE_TRAIL_LENGTH),
      trailCoreMaterial
    );
    trail.position.set(GameConfig.WEAPON.KNIFE_TRAIL_X, GameConfig.WEAPON.KNIFE_TRAIL_Y, GameConfig.WEAPON.KNIFE_TRAIL_Z);
    trail.visible = false;
    trail.userData.raycastIgnore = true;
    trail.add(glow, core);
    group.add(trail);

    return { group, trail, trailCoreMaterial, trailGlowMaterial };
  }

  private static createBladeShape(): THREE.Shape {
    const length = GameConfig.WEAPON.KNIFE_BLADE_LENGTH;
    const halfWidth = GameConfig.WEAPON.KNIFE_BLADE_WIDTH * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(0, length);
    shape.lineTo(halfWidth * 0.32, length * 0.88);
    shape.lineTo(halfWidth * 0.78, length * 0.78);
    shape.lineTo(halfWidth * 0.78, length * 0.68);
    shape.lineTo(halfWidth * 0.46, length * 0.65);
    shape.lineTo(halfWidth * 0.78, length * 0.61);
    shape.lineTo(halfWidth * 0.78, length * 0.52);
    shape.lineTo(halfWidth * 0.46, length * 0.49);
    shape.lineTo(halfWidth * 0.78, length * 0.45);
    shape.lineTo(halfWidth * 0.78, length * 0.36);
    shape.lineTo(halfWidth * 0.46, length * 0.33);
    shape.lineTo(halfWidth * 0.72, length * 0.28);
    shape.lineTo(halfWidth * 0.58, 0);
    shape.lineTo(-halfWidth * 0.55, 0);
    shape.lineTo(-halfWidth * 0.78, length * 0.12);
    shape.lineTo(-halfWidth * 1.05, length * 0.45);
    shape.lineTo(-halfWidth * 0.82, length * 0.75);
    shape.lineTo(-halfWidth * 0.45, length * 0.9);
    shape.closePath();
    return shape;
  }

  private static createSharpEdgeShape(): THREE.Shape {
    const length = GameConfig.WEAPON.KNIFE_BLADE_LENGTH;
    const halfWidth = GameConfig.WEAPON.KNIFE_BLADE_WIDTH * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(0, length);
    shape.lineTo(-halfWidth * 0.45, length * 0.9);
    shape.lineTo(-halfWidth * 0.82, length * 0.75);
    shape.lineTo(-halfWidth * 1.05, length * 0.45);
    shape.lineTo(-halfWidth * 0.78, length * 0.12);
    shape.lineTo(-halfWidth * 0.55, 0);
    shape.lineTo(-halfWidth * 0.34, length * 0.08);
    shape.lineTo(-halfWidth * 0.58, length * 0.45);
    shape.lineTo(-halfWidth * 0.46, length * 0.72);
    shape.lineTo(-halfWidth * 0.22, length * 0.88);
    shape.closePath();
    return shape;
  }

  private static createHandleShape(): THREE.Shape {
    const halfWidth = GameConfig.WEAPON.KNIFE_GRIP_RIB_WIDTH * 0.56;
    const length = GameConfig.WEAPON.KNIFE_HANDLE_LENGTH;
    const shape = new THREE.Shape();
    shape.moveTo(-halfWidth, -GameConfig.WEAPON.KNIFE_GUARD_HEIGHT);
    shape.lineTo(halfWidth, -GameConfig.WEAPON.KNIFE_GUARD_HEIGHT);
    shape.lineTo(halfWidth * 0.92, -length * 0.82);
    shape.lineTo(halfWidth * 0.7, -length);
    shape.lineTo(-halfWidth * 0.7, -length);
    shape.lineTo(-halfWidth * 0.92, -length * 0.82);
    shape.closePath();
    return shape;
  }

  private static createTrailMaterial(color: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
  }
}
