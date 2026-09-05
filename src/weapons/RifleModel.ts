import * as THREE from 'three';
import { GameConfig } from '@/config/GameConfig';

export interface RifleModelParts {
  group: THREE.Group;
  magazine: THREE.Group;
  bolt: THREE.Mesh;
  ejectionPosition: THREE.Vector3;
}

export class RifleModel {
  static build(): RifleModelParts {
    const group = new THREE.Group();
    const magazine = new THREE.Group();

    const blackMetal = new THREE.MeshStandardMaterial({ color: 0x26343d, roughness: 0.3, metalness: 0.7 });
    const gunMetal = new THREE.MeshStandardMaterial({ color: 0x5c7480, roughness: 0.27, metalness: 0.78 });
    const edgeMetal = new THREE.MeshStandardMaterial({ color: 0xa9bbc2, roughness: 0.22, metalness: 0.85 });
    const armor = new THREE.MeshStandardMaterial({ color: 0x3a515b, roughness: 0.4, metalness: 0.58 });
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x12191d, roughness: 0.72, metalness: 0.12 });
    const energyMaterial = new THREE.MeshStandardMaterial({
      color: 0x159eaa,
      emissive: 0x07545c,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.36,
    });
    const lensMaterial = new THREE.MeshBasicMaterial({
      color: 0x45c9c8,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const addBox = (
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material,
      rotation: [number, number, number] = [0, 0, 0],
      parent: THREE.Object3D = group,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    };

    addBox([0.17, 0.13, 0.43], [0, 0, -0.22], gunMetal);
    addBox([0.155, 0.035, 0.46], [0, 0.078, -0.23], edgeMetal);
    addBox([0.19, 0.075, 0.26], [0, -0.01, -0.49], armor);
    addBox([0.205, 0.018, 0.22], [0, 0.035, -0.5], edgeMetal);

    for (const side of [-1, 1]) {
      addBox([0.025, 0.1, 0.32], [side * 0.092, 0.005, -0.25], armor, [0, 0, side * 0.12]);
      addBox([0.014, 0.034, 0.25], [side * 0.108, 0.018, -0.5], energyMaterial);
      addBox([0.012, 0.018, 0.1], [side * 0.101, -0.04, -0.36], edgeMetal, [0, 0, side * 0.22]);
    }

    const ejectionPort = addBox([0.01, 0.047, 0.105], [0.091, 0.025, -0.23], blackMetal);
    ejectionPort.rotation.z = -0.08;
    const bolt = addBox([0.012, 0.028, 0.076], [0.098, 0.032, -0.23], edgeMetal);

    addBox([0.13, 0.11, 0.24], [0, 0, 0.115], armor, [-0.08, 0, 0]);
    addBox([0.145, 0.115, 0.028], [0, -0.008, 0.25], gripMaterial, [-0.08, 0, 0]);
    addBox([0.07, 0.035, 0.26], [0, 0.048, 0.105], gunMetal, [-0.08, 0, 0]);
    addBox([0.055, 0.018, 0.19], [0, 0.071, 0.08], energyMaterial, [-0.08, 0, 0]);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.023, 0.34, 16), blackMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.035, -0.66);
    group.add(barrel);

    const barrelShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.25, 8), gunMetal);
    barrelShroud.rotation.x = Math.PI / 2;
    barrelShroud.position.set(0, 0.035, -0.55);
    group.add(barrelShroud);

    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.07, 10), edgeMetal);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.035, -0.81);
    group.add(muzzleBrake);

    for (let index = 0; index < 4; index += 1) {
      const heatFin = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 5, 8), edgeMetal);
      heatFin.rotation.x = Math.PI / 2;
      heatFin.position.set(0, 0.035, -0.47 - index * 0.055);
      group.add(heatFin);
    }

    addBox([0.07, 0.21, 0.115], [0, -0.18, -0.2], blackMetal, [-0.14, 0, 0], magazine);
    addBox([0.078, 0.025, 0.12], [0, -0.294, -0.217], edgeMetal, [-0.14, 0, 0], magazine);
    addBox([0.074, 0.022, 0.118], [0, -0.14, -0.192], energyMaterial, [-0.14, 0, 0], magazine);
    for (let index = 0; index < 3; index += 1) {
      addBox([0.074, 0.009, 0.121], [0, -0.19 - index * 0.035, -0.205], gunMetal, [-0.14, 0, 0], magazine);
    }
    group.add(magazine);

    addBox([0.055, 0.13, 0.065], [0, -0.13, -0.04], gripMaterial, [0.27, 0, 0]);
    addBox([0.06, 0.028, 0.07], [0, -0.2, -0.005], gunMetal, [0.27, 0, 0]);
    addBox([0.012, 0.038, 0.09], [0, -0.072, -0.1], edgeMetal);

    const scope = new THREE.Group();
    scope.position.set(0, GameConfig.WEAPON.OPTIC_CENTER_Y, GameConfig.WEAPON.OPTIC_CENTER_Z);
    for (const depth of [-0.045, 0.045]) {
      addBox([0.09, 0.011, 0.016], [0, 0.037, depth], gunMetal, [0, 0, 0], scope);
      addBox([0.09, 0.011, 0.016], [0, -0.037, depth], gunMetal, [0, 0, 0], scope);
      addBox([0.011, 0.064, 0.016], [-0.04, 0, depth], gunMetal, [0, 0, 0], scope);
      addBox([0.011, 0.064, 0.016], [0.04, 0, depth], gunMetal, [0, 0, 0], scope);
    }
    addBox([0.012, 0.075, 0.11], [-0.052, 0, 0], armor, [0, 0, -0.08], scope);
    addBox([0.012, 0.075, 0.11], [0.052, 0, 0], armor, [0, 0, 0.08], scope);
    addBox([0.058, 0.009, 0.09], [0, 0.043, 0], energyMaterial, [0, 0, 0], scope);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.067, 0.052), lensMaterial);
    lens.position.z = -0.046;
    scope.add(lens);
    addBox([0.064, 0.018, 0.12], [0, -0.052, 0], edgeMetal, [0, 0, 0], scope);
    group.add(scope);

    for (let index = 0; index < 7; index += 1) {
      addBox([0.045, 0.014, 0.02], [0, 0.1, -0.05 - index * 0.065], edgeMetal);
    }

    group.traverse((object) => {
      object.userData.raycastIgnore = true;
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.renderOrder = 10;
      }
    });

    return {
      group,
      magazine,
      bolt,
      ejectionPosition: new THREE.Vector3(...GameConfig.WEAPON.VIEW_EJECTION_POSITION),
    };
  }
}
