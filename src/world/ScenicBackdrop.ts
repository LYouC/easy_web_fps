import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';

export class ScenicBackdrop {
  private readonly root = new THREE.Group();

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = 'stylized_scenic_backdrop';
    this.root.userData.raycastIgnore = true;
    this.scene.add(this.root);
    this.addHills();
    this.addTrees();
    this.addClouds();
    this.addServiceRailway();
    this.addWater();
  }

  private addHills(): void {
    GameConfig.SCENERY.HILLS.forEach((hill) => {
      const material = this.createLitMaterial(hill.color, GameConfig.SCENERY.HILL_METALNESS);
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, GameConfig.SCENERY.HILL_DETAIL), material);
      mesh.position.set(hill.position[0], hill.position[1], hill.position[2]);
      mesh.scale.set(hill.scale[0], hill.scale[1], hill.scale[2]);
      mesh.receiveShadow = true;
      this.root.add(mesh);
    });
  }

  private addTrees(): void {
    GameConfig.SCENERY.TREES.forEach((tree) => {
      const group = new THREE.Group();
      group.position.set(tree.position[0], tree.position[1], tree.position[2]);
      group.scale.setScalar(tree.scale);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(
          GameConfig.SCENERY.TREE_TRUNK_RADIUS,
          GameConfig.SCENERY.TREE_TRUNK_RADIUS * GameConfig.SCENERY.TREE_TRUNK_BASE_SCALE,
          GameConfig.SCENERY.TREE_TRUNK_HEIGHT,
          GameConfig.SCENERY.TREE_TRUNK_SEGMENTS
        ),
        this.createLitMaterial(GameConfig.SCENERY.TREE_TRUNK_COLOR, GameConfig.SCENERY.TREE_TRUNK_METALNESS)
      );
      trunk.position.y = GameConfig.SCENERY.TREE_TRUNK_HEIGHT / 2;
      trunk.castShadow = true;
      group.add(trunk);
      GameConfig.SCENERY.TREE_CANOPY_OFFSETS.forEach((offset) => {
        const canopy = new THREE.Mesh(
          new THREE.IcosahedronGeometry(GameConfig.SCENERY.TREE_CANOPY_RADIUS, GameConfig.SCENERY.TREE_CANOPY_DETAIL),
          this.createLitMaterial(tree.color, GameConfig.SCENERY.FOLIAGE_METALNESS)
        );
        canopy.position.set(offset[0], offset[1], offset[2]);
        canopy.scale.setScalar(offset[3]);
        canopy.castShadow = true;
        group.add(canopy);
      });
      this.root.add(group);
    });
  }

  private addClouds(): void {
    GameConfig.SCENERY.CLOUDS.forEach((cloud) => {
      const group = new THREE.Group();
      group.position.set(cloud.position[0], cloud.position[1], cloud.position[2]);
      group.scale.setScalar(cloud.scale);
      GameConfig.SCENERY.CLOUD_LOBES.forEach((lobe) => {
        const material = new THREE.MeshBasicMaterial({
          color: GameConfig.SCENERY.CLOUD_COLOR,
          transparent: true,
          opacity: GameConfig.SCENERY.CLOUD_OPACITY,
          depthWrite: false,
          toneMapped: false,
        });
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1, GameConfig.SCENERY.CLOUD_SEGMENTS, GameConfig.SCENERY.CLOUD_RINGS),
          material
        );
        mesh.position.set(lobe[0], lobe[1], lobe[2]);
        mesh.scale.setScalar(lobe[3]);
        group.add(mesh);
      });
      this.root.add(group);
    });
  }

  private addServiceRailway(): void {
    const railGroup = new THREE.Group();
    railGroup.position.x = GameConfig.SCENERY.RAIL_X;
    const ballast = this.addBox(
      railGroup,
      GameConfig.SCENERY.BALLAST_SIZE,
      GameConfig.SCENERY.BALLAST_COLOR,
      -GameConfig.SCENERY.BALLAST_SIZE[1] / 2
    );
    ballast.receiveShadow = true;
    for (const side of [-1, 1]) {
      const rail = this.addBox(
        railGroup,
        [GameConfig.SCENERY.RAIL_WIDTH, GameConfig.SCENERY.RAIL_HEIGHT, GameConfig.SCENERY.RAIL_LENGTH],
        GameConfig.SCENERY.RAIL_COLOR,
        GameConfig.SCENERY.RAIL_HEIGHT / 2
      );
      rail.position.x = side * GameConfig.SCENERY.RAIL_GAUGE / 2;
    }
    for (let index = 0; index < GameConfig.SCENERY.SLEEPER_COUNT; index += 1) {
      const sleeper = this.addBox(
        railGroup,
        GameConfig.SCENERY.SLEEPER_SIZE,
        GameConfig.SCENERY.SLEEPER_COLOR,
        GameConfig.SCENERY.SLEEPER_SIZE[1] / 2
      );
      sleeper.position.z = -GameConfig.SCENERY.RAIL_LENGTH / 2
        + GameConfig.SCENERY.RAIL_LENGTH * index / (GameConfig.SCENERY.SLEEPER_COUNT - 1);
    }
    this.root.add(railGroup);
    this.addRailcar();
    this.addCatenary();
  }

  private addRailcar(): void {
    const [width, height, length] = GameConfig.SCENERY.RAILCAR_SIZE;
    const group = new THREE.Group();
    group.position.set(...GameConfig.SCENERY.RAILCAR_POSITION);
    this.addBox(group, [width, height, length], GameConfig.SCENERY.RAILCAR_BODY_COLOR);
    const roof = this.addBox(
      group,
      [
        width * GameConfig.SCENERY.RAILCAR_ROOF_SCALE,
        GameConfig.SCENERY.RAILCAR_ROOF_HEIGHT,
        length * GameConfig.SCENERY.RAILCAR_ROOF_SCALE,
      ],
      GameConfig.SCENERY.RAILCAR_ROOF_COLOR,
      height / 2 + GameConfig.SCENERY.RAILCAR_ROOF_HEIGHT / 2
    );
    roof.castShadow = true;
    const stripe = this.addBox(
      group,
      [width * GameConfig.SCENERY.RAILCAR_STRIPE_WIDTH_SCALE, GameConfig.SCENERY.RAILCAR_STRIPE_HEIGHT, length],
      GameConfig.SCENERY.RAILCAR_STRIPE_COLOR
    );
    stripe.position.y = height * GameConfig.SCENERY.RAILCAR_STRIPE_Y_RATIO;
    for (let index = 0; index < GameConfig.SCENERY.RAILCAR_WINDOW_COUNT; index += 1) {
      const z = -length / 2 + length * (index + 0.5) / GameConfig.SCENERY.RAILCAR_WINDOW_COUNT;
      for (const side of [-1, 1]) {
        const window = this.addBox(group, GameConfig.SCENERY.RAILCAR_WINDOW_SIZE, GameConfig.SCENERY.RAILCAR_WINDOW_COLOR);
        window.position.set(side * (width / 2 + GameConfig.SCENERY.RAILCAR_WINDOW_SIZE[0] / 2), GameConfig.SCENERY.RAILCAR_WINDOW_Y, z);
      }
    }
    GameConfig.SCENERY.RAILCAR_WHEEL_Z_OFFSETS.forEach((z) => {
      for (const side of [-1, 1]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(
            GameConfig.SCENERY.RAILCAR_WHEEL_RADIUS,
            GameConfig.SCENERY.RAILCAR_WHEEL_RADIUS,
            GameConfig.SCENERY.RAILCAR_WHEEL_WIDTH,
            GameConfig.SCENERY.RAILCAR_WHEEL_SEGMENTS
          ),
          this.createLitMaterial(GameConfig.SCENERY.RAILCAR_WHEEL_COLOR, GameConfig.SCENERY.INFRASTRUCTURE_METALNESS)
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(
          side * width / 2,
          -height / 2 + GameConfig.SCENERY.RAILCAR_WHEEL_RADIUS,
          z
        );
        group.add(wheel);
      }
    });
    this.root.add(group);
  }

  private addWater(): void {
    const material = new THREE.MeshStandardMaterial({
      color: GameConfig.SCENERY.WATER_COLOR,
      roughness: GameConfig.SCENERY.WATER_ROUGHNESS,
      metalness: GameConfig.SCENERY.WATER_METALNESS,
      transparent: true,
      opacity: GameConfig.SCENERY.WATER_OPACITY,
      flatShading: GameConfig.SCENERY.FLAT_SHADING,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...GameConfig.SCENERY.WATER_SIZE), material);
    mesh.position.set(...GameConfig.SCENERY.WATER_POSITION);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    this.root.add(mesh);
  }

  private addCatenary(): void {
    const height = GameConfig.SCENERY.CATENARY_POLE_HEIGHT;
    GameConfig.SCENERY.CATENARY_Z_POSITIONS.forEach((z) => {
      const pole = this.addBox(
        this.root,
        [GameConfig.SCENERY.CATENARY_POLE_SIZE, height, GameConfig.SCENERY.CATENARY_POLE_SIZE],
        GameConfig.SCENERY.CATENARY_COLOR,
        height / 2
      );
      pole.position.x = GameConfig.SCENERY.CATENARY_X;
      pole.position.z = z;
      const arm = this.addBox(
        this.root,
        [GameConfig.SCENERY.CATENARY_ARM_LENGTH, GameConfig.SCENERY.CATENARY_POLE_SIZE, GameConfig.SCENERY.CATENARY_POLE_SIZE],
        GameConfig.SCENERY.CATENARY_COLOR
      );
      arm.position.set(
        GameConfig.SCENERY.CATENARY_X + GameConfig.SCENERY.CATENARY_ARM_LENGTH / 2,
        height,
        z
      );
    });
    const start = new THREE.Vector3(
      GameConfig.SCENERY.RAIL_X,
      height - GameConfig.SCENERY.CATENARY_POLE_SIZE,
      GameConfig.SCENERY.CATENARY_Z_POSITIONS[0]
    );
    const end = new THREE.Vector3(
      GameConfig.SCENERY.RAIL_X,
      height - GameConfig.SCENERY.CATENARY_POLE_SIZE,
      GameConfig.SCENERY.CATENARY_Z_POSITIONS[GameConfig.SCENERY.CATENARY_Z_POSITIONS.length - 1]
    );
    this.addCylinderBetween(start, end, GameConfig.SCENERY.CATENARY_WIRE_RADIUS, GameConfig.SCENERY.CATENARY_COLOR);
  }

  private addCylinderBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, color: number): void {
    const direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), GameConfig.SCENERY.TREE_TRUNK_SEGMENTS),
      this.createLitMaterial(color, GameConfig.SCENERY.INFRASTRUCTURE_METALNESS)
    );
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    this.root.add(mesh);
  }

  private addBox(
    group: THREE.Group,
    size: readonly [number, number, number],
    color: number,
    y: number = 0
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      this.createLitMaterial(color, GameConfig.SCENERY.INFRASTRUCTURE_METALNESS)
    );
    mesh.position.y = y;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private createLitMaterial(color: number, metalness: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: GameConfig.SCENERY.MATERIAL_ROUGHNESS,
      metalness,
      flatShading: GameConfig.SCENERY.FLAT_SHADING,
    });
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.root.clear();
  }
}
