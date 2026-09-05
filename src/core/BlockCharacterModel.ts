import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { GameConfig } from '@/config/GameConfig';

export type CharacterStyle = 'player' | 'normal' | 'heavy' | 'elite';

export class BlockCharacterModel {
  readonly group = new THREE.Group();
  readonly legs: THREE.Group[] = [];
  readonly firstPersonHidden: THREE.Object3D[] = [];
  readonly materials: THREE.MeshStandardMaterial[] = [];

  constructor(style: CharacterStyle) {
    const palette = GameConfig.CHARACTER.PALETTES[style];
    const heavy = style === 'heavy';
    const elite = style === 'elite';
    const width = heavy ? 1.16 : elite ? 0.9 : 1;
    this.group.name = `${style}_block_character`;

    const torso = new RoundedBoxGeometry(0.76 * width, 0.68, 0.43, 2, 0.045);
    const vertices = torso.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      vertices.setX(i, vertices.getX(i) * (1 - (vertices.getY(i) / 0.68 + 0.5) * 0.19));
    }
    torso.computeVertexNormals();
    this.part(torso, palette.uniform, [0, 1.13, 0]);
    this.box([0.61 * width, 0.17, 0.4], palette.dark, [0, 0.74, 0]);
    this.box([0.66 * width, 0.075, 0.45], palette.dark, [0, 0.86, 0]);
    this.box([0.1, 0.075, 0.027], palette.accent, [0, 0.86, 0.24]);
    const armorZone = heavy ? 'armor' : 'body';
    this.box([0.53 * width, heavy ? 0.46 : 0.36, heavy ? 0.14 : 0.065], palette.vest, [0, 1.2, 0.25], armorZone);
    for (const sign of [-1, 1]) {
      this.box([0.075, 0.47, 0.05], palette.dark, [sign * 0.24 * width, 1.19, 0.249]);
      this.box([0.17, 0.15, 0.09], palette.accent, [sign * 0.13, 1.02, 0.31]);
      this.box([0.11, 0.025, 0.016], palette.dark, [sign * 0.13, 1.06, 0.362]);
      const leg = new THREE.Group();
      leg.name = sign < 0 ? 'left_hip' : 'right_hip';
      leg.position.set(sign * 0.19, 0.7, 0);
      this.group.add(leg);
      this.legs.push(leg);
      this.box([0.29, 0.48, 0.32], palette.uniform, [0, -0.25, 0], 'body', leg);
      this.box([0.21, 0.15, 0.055], palette.vest, [0, -0.31, 0.175], armorZone, leg);
      this.box([0.3, 0.18, 0.43], palette.dark, [0, -0.61, 0.045], 'body', leg);
      this.box([0.3, 0.035, 0.43], palette.vest, [0, -0.68, 0.045], 'body', leg);

      const arm = new THREE.Group();
      arm.position.set(sign * 0.46 * width, 1.34, 0);
      this.group.add(arm);
      this.firstPersonHidden.push(arm);
      this.box([heavy ? 0.31 : 0.25, 0.22, 0.34], palette.vest, [0, 0, 0], armorZone, arm);
      const sleeve = this.box([0.21, 0.31, 0.23], palette.uniform, [0, -0.17, 0.06], 'body', arm);
      sleeve.rotation.x = -0.28;
      const elbow = new THREE.Vector3(0, -0.28, 0.12);
      const grip = style === 'player'
        ? new THREE.Vector3(sign * -0.085, -0.32, 0.39)
        : new THREE.Vector3((sign > 0 ? 0.29 : 0.16) - sign * 0.46 * width, -0.24, sign > 0 ? 0.27 : 0.56);
      const center = elbow.clone().lerp(grip, 0.5);
      const forearm = this.box([0.19, elbow.distanceTo(grip), 0.2], palette.uniform, [center.x, center.y, center.z], 'body', arm);
      forearm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), grip.clone().sub(elbow).normalize());
      const hand = this.part(new THREE.TorusGeometry(0.085, 0.037, 8, 16, Math.PI * 1.55), palette.skin,
        [grip.x, grip.y, grip.z], 'body', arm);
      hand.rotation.z = -Math.PI * 0.275;
    }
    this.box([heavy ? 0.57 : 0.42, heavy ? 0.55 : 0.38, 0.19], palette.dark, [0, 1.17, -0.29]);
    this.box([0.26, 0.035, 0.025], palette.accent, [0, 1.31, -0.397]);

    const head = new THREE.Group();
    head.name = 'head';
    this.group.add(head);
    this.firstPersonHidden.push(head);
    this.part(new THREE.CylinderGeometry(0.115, 0.115, 0.12, 16), palette.skin, [0, 1.49, 0], 'head', head);
    this.part(new THREE.CylinderGeometry(0.265, 0.265, 0.43, 24), palette.skin, [0, 1.745, 0], 'head', head);
    this.part(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 16), palette.skin, [0, 1.984, 0], 'head', head);
    for (const sign of [-1, 1]) {
      this.part(new THREE.SphereGeometry(0.026, 10, 8), palette.dark, [sign * 0.09, 1.78, 0.251], 'head', head);
      const brow = this.box([0.065, 0.018, 0.013], palette.dark, [sign * 0.09, 1.845, 0.252], 'head', head);
      brow.rotation.z = sign * (elite ? 0.18 : -0.12);
    }
    const smile = this.part(new THREE.TorusGeometry(0.064, 0.009, 6, 16, Math.PI * 0.7), palette.dark, [0, 1.708, 0.259], 'head', head);
    smile.rotation.z = Math.PI * 1.15;
    if (elite) {
      const beret = this.part(new THREE.SphereGeometry(0.3, 16, 10), palette.accent, [0.025, 1.97, -0.005], 'head', head);
      beret.scale.set(1.04, 0.35, 0.95);
      beret.rotation.z = -0.18;
      this.box([0.11, 0.075, 0.025], palette.dark, [-0.12, 1.96, 0.253], 'head', head);
      this.box([0.065, 0.04, 0.016], palette.accent, [-0.12, 1.96, 0.272], 'head', head);
      this.box([0.19, 0.14, 0.06], palette.dark, [0, 1.585, 0.232], 'head', head);
      this.box([0.035, 0.34, 0.035], palette.dark, [-0.24, 1.51, -0.34]);
    } else {
      const helmet = this.part(new THREE.SphereGeometry(0.292, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), palette.uniform, [0, 1.875, 0], 'head', head);
      helmet.scale.y = heavy ? 0.7 : 0.56;
      this.box([0.58, 0.05, 0.59], palette.vest, [0, 1.885, 0.035], 'head', head);
      this.box([0.1, 0.055, 0.028], palette.accent, [0, 1.955, 0.275], 'head', head);
      if (heavy) {
        this.box([0.49, 0.15, 0.07], palette.dark, [0, 1.78, 0.268], 'head', head);
        this.box([0.38, 0.047, 0.025], 0xa9e8df, [0, 1.796, 0.312], 'head', head);
        this.box([0.36, 0.12, 0.11], palette.vest, [0, 1.61, 0.242], 'head', head);
        for (const x of [-0.09, 0, 0.09]) this.box([0.027, 0.06, 0.014], palette.dark, [x, 1.61, 0.304], 'head', head);
      }
    }
    this.box([0.11, 0.045, 0.022], palette.accent, [-0.12, 1.33, heavy ? 0.33 : 0.29]);
  }

  private box(size: [number, number, number], color: number, position: [number, number, number], zone = 'body', parent = this.group): THREE.Mesh {
    return this.part(new RoundedBoxGeometry(...size, 2, Math.min(...size) * 0.15), color, position, zone, parent);
  }

  private part(geometry: THREE.BufferGeometry, color: number, position: [number, number, number], zone = 'body', parent = this.group): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({ color, roughness: GameConfig.CHARACTER.ROUGHNESS, metalness: 0, transparent: true });
    this.materials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.enemyHitZone = zone;
    parent.add(mesh);
    return mesh;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.materials.forEach((material) => material.dispose());
  }
}
