import * as THREE from 'three'
import { randInt } from 'three/src/math/MathUtils'


export const gridSize = 5;
export const numAtoms = gridSize ** 3;
export const iniDist = 1 * 10**-16;
export const iniPad = iniDist;
export const iniSpd = 1 * 10**-18;

export const boxSize = gridSize * iniDist + 2 * iniPad;

export const atom2Vert = (a) => {
  return a / boxSize - 0.5;
}

export const vert2Atom = (v) => {
  return (v + 0.5) * boxSize;
}

export const boxGeometry = [1, 1, 1];

export const atomRadius = atom2Vert(boxSize) / 50;

export const cameraPos = boxGeometry.map(v => v);

export const sphere = new THREE.SphereGeometry(atomRadius, 14, 14);

export const box = new THREE.BoxGeometry(atomRadius, atomRadius, atomRadius);

export const material = [...Array(numAtoms).keys()].map(i => (
  new THREE.MeshStandardMaterial({
    color: `rgb(${randInt(0, 255)}, ${randInt(0, 255)}, ${randInt(0, 255)})`,
  })
));

export const whiteMaterial = [...Array(numAtoms).keys()].map(i => (
  new THREE.MeshStandardMaterial({
    color: 'white',
  })
));

export const boxMaterial = new THREE.MeshPhysicalMaterial({
  reflectivity: 0,
  transmission: 1.0,
  roughness: 0,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0,
  color: new THREE.Color(0xffffff),
  ior: 1,
  thickness: 0,
});

const C = 2 * 66.88 * Math.pow(10, -21) * Math.pow(1.3885, 2);
const TAU_MULTIPLIER =  0.01;
export const ferrumProperties = {
  m: 92.735 * Math.pow(10, -27),
  epsilon: 66.88 * Math.pow(10, -21),
  r: 2.845 * Math.pow(10, -10),
  alpha: 1.3885,
  TAU: 2 * Math.PI * Math.sqrt(92.735 * Math.pow(10, -27) / C) * TAU_MULTIPLIER,
};