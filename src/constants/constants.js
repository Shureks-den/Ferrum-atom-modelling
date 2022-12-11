import * as THREE from 'three'
import { randInt } from 'three/src/math/MathUtils'

export const atomRadius = 0.5;

export const numAtoms = 100;

export const boxGeometry = [50, 50, 50];

export const cameraPos = boxGeometry.map(v => v+ 10);


export const sphere = new THREE.SphereGeometry(atomRadius, 28, 28);

export const material = [...Array(numAtoms).keys()].map(i => (
  new THREE.MeshStandardMaterial({
    color: `rgb(${randInt(0, 255)}, ${randInt(0, 255)}, ${randInt(0, 255)})`,
    // color: "blue"
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