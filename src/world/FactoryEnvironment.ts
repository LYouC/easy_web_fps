import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';
import { ColliderManager } from '@/world/ColliderManager';

type FactoryStructure = typeof GameConfig.FACTORY.STRUCTURES[number];

export class FactoryEnvironment {
  private readonly root = new THREE.Group();
  private readonly colliderIds: string[] = [];
  private readonly textures: THREE.Texture[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliderManager: ColliderManager
  ) {
    this.root.name = 'factory_environment';
    this.scene.add(this.root);
    GameConfig.FACTORY.STRUCTURES.forEach((structure) => this.addStructure(structure));
    GameConfig.FACTORY.PIPES.forEach((pipe) => this.addPipe(pipe.start, pipe.end, pipe.radius));
    GameConfig.FACTORY.MARKINGS.forEach((marking) => this.addMarking(marking));
    GameConfig.FACTORY.LIGHTS.forEach((light) => this.addWorkLight(light));
    GameConfig.FACTORY.SIGNS.forEach((sign) => this.addSign(sign));
    GameConfig.FACTORY.PROPS.forEach((prop) => this.addProp(prop));
  }

  private addStructure(structure: FactoryStructure): void {
    const group = new THREE.Group();
    group.name = structure.id;
    group.position.set(structure.position[0], structure.position[1], structure.position[2]);
    if (!structure.collider) group.userData.raycastIgnore = true;
    if (structure.kind === 'tank') this.buildTank(group, structure.size, structure.color);
    else if (structure.kind === 'stack') this.buildStack(group, structure.size, structure.color);
    else if (structure.kind === 'container') this.buildContainer(group, structure.size, structure.color);
    else if (structure.kind === 'machine') this.buildMachine(group, structure.size, structure.color);
    else if (structure.kind === 'crate') this.buildCrate(group, structure.size, structure.color);
    else this.addBox(group, structure.size, structure.color);
    this.root.add(group);
    if (structure.collider) this.addCollider(structure.id, structure.position, structure.size);
  }

  private buildTank(group: THREE.Group, size: readonly [number, number, number], color: number): void {
    const [width, height, depth] = size;
    const radius = Math.min(width, depth) / 2;
    this.addMesh(group, new THREE.CylinderGeometry(radius, radius, height, GameConfig.FACTORY.RADIAL_SEGMENTS), color);
    const dome = this.addMesh(
      group,
      new THREE.SphereGeometry(radius, GameConfig.FACTORY.RADIAL_SEGMENTS, GameConfig.FACTORY.TANK_SPHERE_RINGS),
      color
    );
    dome.scale.y = GameConfig.FACTORY.TANK_DOME_HEIGHT_SCALE;
    dome.position.y = height / 2 - radius * GameConfig.FACTORY.TANK_DOME_HEIGHT_SCALE;
    GameConfig.FACTORY.TANK_BAND_LEVELS.forEach((level) => {
      const band = this.addMesh(
        group,
        new THREE.TorusGeometry(
          radius * GameConfig.FACTORY.TANK_RING_RADIUS_SCALE,
          GameConfig.FACTORY.BAND_TUBE_RADIUS,
          GameConfig.FACTORY.BAND_TUBE_SEGMENTS,
          GameConfig.FACTORY.RADIAL_SEGMENTS
        ),
        GameConfig.FACTORY.DARK_METAL_COLOR
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = height * level;
    });
  }

  private buildStack(group: THREE.Group, size: readonly [number, number, number], color: number): void {
    const radius = Math.min(size[0], size[2]) / 2;
    this.addMesh(
      group,
      new THREE.CylinderGeometry(radius * GameConfig.FACTORY.STACK_TOP_RADIUS_SCALE, radius, size[1], GameConfig.FACTORY.RADIAL_SEGMENTS),
      color
    );
    const rim = this.addMesh(
      group,
      new THREE.TorusGeometry(
        radius * GameConfig.FACTORY.STACK_RIM_RADIUS_SCALE,
        GameConfig.FACTORY.BAND_TUBE_RADIUS * GameConfig.FACTORY.STACK_RIM_TUBE_SCALE,
        GameConfig.FACTORY.BAND_TUBE_SEGMENTS,
        GameConfig.FACTORY.RADIAL_SEGMENTS
      ),
      GameConfig.FACTORY.HAZARD_COLOR
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = size[1] / 2 - GameConfig.FACTORY.BAND_TUBE_RADIUS * GameConfig.FACTORY.STACK_RIM_Y_OFFSET_SCALE;
  }

  private buildContainer(group: THREE.Group, size: readonly [number, number, number], color: number): void {
    this.addBox(group, size, color);
    const [width, height, depth] = size;
    for (let index = 1; index < GameConfig.FACTORY.CONTAINER_RIB_COUNT; index += 1) {
      const x = -width / 2 + width * index / GameConfig.FACTORY.CONTAINER_RIB_COUNT;
      const rib = this.addBox(
        group,
        [GameConfig.FACTORY.CONTAINER_RIB_WIDTH, height * GameConfig.FACTORY.CONTAINER_RIB_HEIGHT_RATIO, depth],
        GameConfig.FACTORY.DARK_METAL_COLOR
      );
      rib.position.x = x;
    }
    const stripe = this.addBox(
      group,
      [width, height * GameConfig.FACTORY.CONTAINER_STRIPE_HEIGHT_RATIO, depth],
      GameConfig.FACTORY.HAZARD_COLOR
    );
    stripe.position.y = height * GameConfig.FACTORY.CONTAINER_STRIPE_Y_RATIO;
  }

  private buildMachine(group: THREE.Group, size: readonly [number, number, number], color: number): void {
    const [width, height, depth] = size;
    const baseHeight = height * GameConfig.FACTORY.MACHINE_BASE_HEIGHT_RATIO;
    const base = this.addBox(group, [width, baseHeight, depth], color);
    base.position.y = -height / 2 + baseHeight / 2;
    const ventHeight = height * GameConfig.FACTORY.MACHINE_VENT_HEIGHT_RATIO;
    for (let index = 0; index < GameConfig.FACTORY.MACHINE_VENT_COUNT; index += 1) {
      const vent = this.addBox(
        group,
        [width * GameConfig.FACTORY.MACHINE_VENT_WIDTH_RATIO, ventHeight, depth * GameConfig.FACTORY.MACHINE_VENT_DEPTH_RATIO],
        index % 2 === 0 ? GameConfig.FACTORY.DARK_METAL_COLOR : color
      );
      vent.position.set(
        width * GameConfig.FACTORY.MACHINE_VENT_START_X_RATIO + index * width * GameConfig.FACTORY.MACHINE_VENT_STEP_X_RATIO,
        -height / 2 + baseHeight + ventHeight / 2,
        0
      );
    }
    const hazard = this.addBox(
      group,
      [width, height * GameConfig.FACTORY.MACHINE_HAZARD_HEIGHT_RATIO, depth * GameConfig.FACTORY.MACHINE_HAZARD_DEPTH_SCALE],
      GameConfig.FACTORY.HAZARD_COLOR
    );
    hazard.position.y = -height / 2 + baseHeight * GameConfig.FACTORY.MACHINE_HAZARD_Y_RATIO;
  }

  private buildCrate(group: THREE.Group, size: readonly [number, number, number], color: number): void {
    this.addBox(group, size, color);
    const [width, height, depth] = size;
    const horizontal = this.addBox(
      group,
      [width, height * GameConfig.FACTORY.CRATE_BAR_THICKNESS_RATIO, depth],
      GameConfig.FACTORY.DARK_METAL_COLOR
    );
    const vertical = this.addBox(
      group,
      [width * GameConfig.FACTORY.CRATE_BAR_THICKNESS_RATIO, height, depth],
      GameConfig.FACTORY.DARK_METAL_COLOR
    );
    horizontal.position.y = height * GameConfig.FACTORY.CRATE_HORIZONTAL_Y_RATIO;
    vertical.position.x = width * GameConfig.FACTORY.CRATE_VERTICAL_X_RATIO;
  }

  private addBox(group: THREE.Group, size: readonly [number, number, number], color: number): THREE.Mesh {
    return this.addMesh(group, new THREE.BoxGeometry(...size), color);
  }

  private addMesh(group: THREE.Group, geometry: THREE.BufferGeometry, color: number): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: GameConfig.FACTORY.EMISSIVE_INTENSITY,
      roughness: GameConfig.FACTORY.METAL_ROUGHNESS,
      metalness: GameConfig.FACTORY.METALNESS,
      flatShading: GameConfig.FACTORY.FLAT_SHADING,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private addCollider(
    id: string,
    position: readonly [number, number, number],
    size: readonly [number, number, number]
  ): void {
    const colliderId = `factory_${id}`;
    const [x, y, z] = position;
    const [width, height, depth] = size;
    this.colliderManager.add(colliderId, {
      min: new THREE.Vector3(x - width / 2, y - height / 2, z - depth / 2),
      max: new THREE.Vector3(x + width / 2, y + height / 2, z + depth / 2),
    });
    this.colliderIds.push(colliderId);
  }

  private addPipe(
    startTuple: readonly [number, number, number],
    endTuple: readonly [number, number, number],
    radius: number
  ): void {
    const start = new THREE.Vector3(...startTuple);
    const end = new THREE.Vector3(...endTuple);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const group = new THREE.Group();
    group.userData.raycastIgnore = true;
    const pipe = this.addMesh(
      group,
      new THREE.CylinderGeometry(radius, radius, length, GameConfig.FACTORY.RADIAL_SEGMENTS),
      GameConfig.FACTORY.PIPE_COLOR
    );
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    group.position.copy(start).add(end).multiplyScalar(0.5);
    for (const endpoint of [start, end]) {
      const joint = this.addMesh(
        this.root,
        new THREE.SphereGeometry(
          radius * GameConfig.FACTORY.PIPE_JOINT_SCALE,
          GameConfig.FACTORY.PIPE_JOINT_SEGMENTS,
          GameConfig.FACTORY.PIPE_JOINT_RINGS
        ),
        GameConfig.FACTORY.DARK_METAL_COLOR
      );
      joint.position.copy(endpoint);
      joint.userData.raycastIgnore = true;
    }
    this.root.add(group);
  }

  private addMarking(marking: typeof GameConfig.FACTORY.MARKINGS[number]): void {
    const material = new THREE.MeshBasicMaterial({
      color: marking.color,
      transparent: true,
      opacity: marking.opacity,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...marking.size), material);
    mesh.position.set(marking.position[0], GameConfig.FACTORY.MARKING_Y, marking.position[2]);
    mesh.rotation.set(-Math.PI / 2, 0, marking.rotation);
    mesh.userData.raycastIgnore = true;
    this.root.add(mesh);
  }

  private addWorkLight(light: typeof GameConfig.FACTORY.LIGHTS[number]): void {
    const group = new THREE.Group();
    group.position.set(light.position[0], light.position[1], light.position[2]);
    group.userData.raycastIgnore = true;
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: GameConfig.FACTORY.DARK_METAL_COLOR,
      emissive: GameConfig.FACTORY.FIXTURE_COLOR,
      emissiveIntensity: GameConfig.FACTORY.FIXTURE_EMISSIVE_INTENSITY,
      roughness: GameConfig.FACTORY.METAL_ROUGHNESS,
      metalness: GameConfig.FACTORY.METALNESS,
    });
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(...GameConfig.FACTORY.FIXTURE_SIZE), fixtureMaterial);
    group.add(fixture);
    const pole = this.addMesh(
      group,
      new THREE.CylinderGeometry(
        GameConfig.FACTORY.WORK_LIGHT_POLE_RADIUS,
        GameConfig.FACTORY.WORK_LIGHT_POLE_RADIUS,
        light.position[1],
        GameConfig.FACTORY.WORK_LIGHT_POLE_SEGMENTS
      ),
      GameConfig.FACTORY.DARK_METAL_COLOR
    );
    pole.position.y = -light.position[1] / 2;
    const pointLight = new THREE.PointLight(light.color, light.intensity, light.range, GameConfig.FACTORY.WORK_LIGHT_DECAY);
    pointLight.position.y = -GameConfig.FACTORY.FIXTURE_SIZE[1];
    group.add(pointLight);
    this.root.add(group);
  }

  private addSign(sign: typeof GameConfig.FACTORY.SIGNS[number]): void {
    const canvas = document.createElement('canvas');
    canvas.width = GameConfig.FACTORY.SIGN_CANVAS_SIZE[0];
    canvas.height = GameConfig.FACTORY.SIGN_CANVAS_SIZE[1];
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = GameConfig.FACTORY.SIGN_BACKGROUND;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = GameConfig.FACTORY.SIGN_BORDER;
    context.lineWidth = GameConfig.FACTORY.SIGN_BORDER_WIDTH;
    const inset = GameConfig.FACTORY.SIGN_BORDER_INSET;
    context.strokeRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
    context.fillStyle = GameConfig.FACTORY.SIGN_TEXT;
    context.font = GameConfig.FACTORY.SIGN_FONT;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(sign.label, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...sign.size), material);
    mesh.position.set(sign.position[0], sign.position[1], sign.position[2]);
    mesh.rotation.y = sign.rotationY;
    mesh.userData.raycastIgnore = true;
    this.root.add(mesh);
  }

  private addProp(prop: typeof GameConfig.FACTORY.PROPS[number]): void {
    const group = new THREE.Group();
    group.name = `factory_prop_${prop.kind}`;
    group.position.set(prop.position[0], prop.position[1], prop.position[2]);
    group.rotation.y = prop.rotation;
    group.userData.raycastIgnore = true;
    if (prop.kind === 'barrel') this.buildBarrel(group, prop.color);
    else if (prop.kind === 'pallet') this.buildPallet(group, prop.color);
    else if (prop.kind === 'cone') this.buildCone(group, prop.color);
    else if (prop.kind === 'reel') this.buildReel(group, prop.color);
    else this.buildCabinet(group, prop.color);
    this.root.add(group);
  }

  private buildBarrel(group: THREE.Group, color: number): void {
    this.addMesh(
      group,
      new THREE.CylinderGeometry(
        GameConfig.FACTORY.PROP_BARREL_RADIUS,
        GameConfig.FACTORY.PROP_BARREL_RADIUS,
        GameConfig.FACTORY.PROP_BARREL_HEIGHT,
        GameConfig.FACTORY.RADIAL_SEGMENTS
      ),
      color
    );
    for (const y of [-0.38, 0.38]) {
      const band = this.addMesh(
        group,
        new THREE.TorusGeometry(GameConfig.FACTORY.PROP_BARREL_RADIUS, 0.035, 5, GameConfig.FACTORY.RADIAL_SEGMENTS),
        GameConfig.FACTORY.DARK_METAL_COLOR
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
    }
  }

  private buildPallet(group: THREE.Group, color: number): void {
    const [width, height, depth] = GameConfig.FACTORY.PROP_PALLET_SIZE;
    for (let index = 0; index < GameConfig.FACTORY.PROP_PALLET_SLAT_COUNT; index += 1) {
      const slat = this.addBox(
        group,
        [width / GameConfig.FACTORY.PROP_PALLET_SLAT_COUNT * 0.72, height, depth],
        color
      );
      slat.position.x = -width / 2 + width * (index + 0.5) / GameConfig.FACTORY.PROP_PALLET_SLAT_COUNT;
    }
    for (const z of [-depth * 0.34, depth * 0.34]) {
      const runner = this.addBox(group, [width, height * 0.65, 0.16], GameConfig.FACTORY.DARK_METAL_COLOR);
      runner.position.set(0, -height * 0.72, z);
    }
  }

  private buildCone(group: THREE.Group, color: number): void {
    const cone = this.addMesh(
      group,
      new THREE.ConeGeometry(GameConfig.FACTORY.PROP_CONE_RADIUS, GameConfig.FACTORY.PROP_CONE_HEIGHT, 8),
      color
    );
    const band = this.addMesh(
      group,
      new THREE.CylinderGeometry(GameConfig.FACTORY.PROP_CONE_RADIUS * 0.65, GameConfig.FACTORY.PROP_CONE_RADIUS * 0.78, 0.13, 8),
      0xf3e6bd
    );
    band.position.y = 0.04;
    cone.position.y = 0;
  }

  private buildReel(group: THREE.Group, color: number): void {
    const axle = this.addMesh(
      group,
      new THREE.CylinderGeometry(0.28, 0.28, GameConfig.FACTORY.PROP_REEL_WIDTH, 12),
      GameConfig.FACTORY.PROP_WOOD_COLOR
    );
    axle.rotation.z = Math.PI / 2;
    for (const x of [-GameConfig.FACTORY.PROP_REEL_WIDTH / 2, GameConfig.FACTORY.PROP_REEL_WIDTH / 2]) {
      const flange = this.addMesh(
        group,
        new THREE.CylinderGeometry(GameConfig.FACTORY.PROP_REEL_RADIUS, GameConfig.FACTORY.PROP_REEL_RADIUS, 0.12, 12),
        color
      );
      flange.rotation.z = Math.PI / 2;
      flange.position.x = x;
    }
  }

  private buildCabinet(group: THREE.Group, color: number): void {
    const [width, height, depth] = GameConfig.FACTORY.PROP_CABINET_SIZE;
    this.addBox(group, [width, height, depth], color);
    const panel = this.addBox(group, [width * 0.72, height * 0.58, 0.025], GameConfig.FACTORY.DARK_METAL_COLOR);
    panel.position.z = depth / 2 + 0.015;
    const lamp = this.addMesh(group, new THREE.SphereGeometry(0.055, 8, 5), GameConfig.FACTORY.HAZARD_COLOR);
    lamp.position.set(width * 0.27, height * 0.32, depth / 2 + 0.045);
  }

  dispose(): void {
    this.colliderIds.forEach((id) => this.colliderManager.remove(id));
    this.colliderIds.length = 0;
    this.scene.remove(this.root);
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    this.textures.forEach((texture) => texture.dispose());
    this.textures.length = 0;
    this.root.clear();
  }
}
