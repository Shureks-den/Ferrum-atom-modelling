import { createRoot } from 'react-dom/client'
import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { randFloat } from 'three/src/math/MathUtils'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
  atomRadius, atom2Vert, vert2Atom, sphere, material, boxMaterial, ferrumProperties,
  numAtoms, boxGeometry, cameraPos, boxSize, GRID_SIZE, INI_DIST, INI_PAD, INI_SPD
} from './constants/constants';


extend({ OrbitControls });

const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls class.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls

  const {
    camera,
    gl: { domElement }
  } = useThree();
  camera.position.x = cameraPos[0];
  camera.position.y = cameraPos[1];
  camera.position.z = cameraPos[2];

  // Ref to the controls, so that we can update them on every frame using useFrame
  const controls = useRef();
  useFrame(state => controls.current.update());
  return (
    <orbitControls
      ref={controls}
      args={[camera, domElement]}
      enableZoom={true}
      minPolarAngle={0}
    />
  );
};


function checkBorder(coord, variation, border) {
  if (coord + variation <= -border && variation < 0) {
    return Math.abs(variation);
  } else if (coord + variation >= border && variation > 0) {
    return -1 * variation;
  }
  return variation;
}

const atoms = [];
for (let i = 0; i < GRID_SIZE; i++) {
  for (let j = 0; j < GRID_SIZE; j++) {
    for (let k = 0; k < GRID_SIZE; k++) {
      atoms.push({
        position: [i * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD, j * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD, k * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD],
        previousPosition: [i * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD, j * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD, k * GRID_SIZE / (GRID_SIZE - 1) * INI_DIST + INI_PAD],
      })
    }
  }
}

for (let i = 0; i < GRID_SIZE ** 3; i++) {
  const xDelta = (1 - 2 * randFloat(0, 0.5)) * INI_SPD;
  const yDelta = (1 - 2 * randFloat(0, 0.5)) * INI_SPD;
  const zDelta = (1 - 2 * randFloat(0, 0.5)) * INI_SPD;

  atoms[i].previousPosition[0] += i % 2 === 0 ? xDelta : - xDelta;
  atoms[i].previousPosition[1] += i % 2 === 0 ? yDelta : - yDelta;
  atoms[i].previousPosition[2] += i % 2 === 0 ? zDelta : - zDelta;

}

const Morse = (epsilon, alpha, r, rAlpha) => {
  return epsilon * (Math.exp(-2 * alpha * (r - rAlpha)) - 2 * Math.exp(-alpha * (r - rAlpha)))
}

const firstDerivativeMorse = (epsilon, alpha, r, rLength, rAlpha) => {
  return r /
  (rLength + 10 ** -100) * epsilon * (-2 * alpha * Math.exp(-2 * alpha * (r - rAlpha)) + 2 * alpha * Math.exp(-alpha * (r - rAlpha)));
}

const secondDerivativeMorse = (epsilon, alpha, r, rLength, rAlpha) => {
  return r /
    (rLength + 10 ** -100) * epsilon * (4 * Math.pow(alpha, 2) * Math.exp(-2 * alpha * (r - rAlpha)) - 2 * Math.pow(alpha, 2) * Math.exp(-alpha * (r - rAlpha)));
}

const MorsePotential = (epsilon, atoms, alpha, rAlpha, elapsed) => {
  atoms.forEach((a, idx) => {
    let accX = 0;
    let accY = 0;
    let accZ = 0;
    for (let i = 0; i < numAtoms; i++) {
      if (i === idx) continue;
      const [x1, y1, z1] = a.position;
      const [x2, y2, z2] = atoms[i].position;
      const r = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
      accX += secondDerivativeMorse(epsilon, alpha, (x1 - x2), r, rAlpha);
      accY += secondDerivativeMorse(epsilon, alpha, (y1 - y2), r, rAlpha);
      accZ += secondDerivativeMorse(epsilon, alpha, (z1 - z2), r, rAlpha);
    }
    const [xPrev, yPrev, zPrev] = a.previousPosition;
    const [x, y, z] = a.position;
    const newPosition = [
      2 * x - xPrev + accX * elapsed ** 2,
      2 * y - yPrev + accY * elapsed ** 2,
      2 * z - zPrev + accZ * elapsed ** 2
    ];
    a.acc = [accX, accY, accZ];
    a.previousPosition = structuredClone(a.position);
    a.position = structuredClone(newPosition);
  })
}

const MorseTension = (epsilon, atoms, alpha, rAlpha, elapsed) => {
  atoms.forEach((a, idx) => {
    let tX = 0;
    let tY = 0;
    let tZ = 0;
    for (let i = 0; i < numAtoms; i++) {
      if (i === idx) continue;
      const [x1, y1, z1] = a.position;
      const [x2, y2, z2] = atoms[i].position;
      const r = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
      tX += firstDerivativeMorse(epsilon, alpha, x1-x2, r, rAlpha);
      tY += firstDerivativeMorse(epsilon, alpha, y1-y2, r, rAlpha);
      tZ += firstDerivativeMorse(epsilon, alpha, z1-z2, r, rAlpha);
    }

    const [x1, y1, z1] = a.position;
    const r = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2) + Math.pow(z1, 2));
    const coef = boxSize ** 3 * 10 ** -12;
    a.tension = [tX, tY, tZ].map(e => 0.5 / coef * e * x1 * y1 * z1 / r);
  })
}

function Atom({ radius, border, position, idx }) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {
    const [x, y, z] = atoms[idx].previousPosition;
    const [newX, newY, newZ] = atoms[idx].position;
    if (newX > border || newX < 0) {
      atoms[idx].previousPosition[0] = newX;
      atoms[idx].position[0] = x;
    }
    if (newY > border || newY < 0) {
      atoms[idx].previousPosition[1] = newY;
      atoms[idx].position[1] = y;
    }
    if (newZ > border || newZ < 0) {
      atoms[idx].previousPosition[2] = newZ;
      atoms[idx].position[2] = z;
    }
    ref.current.position.x = atom2Vert(atoms[idx].position[0]);
    ref.current.position.y = atom2Vert(atoms[idx].position[1]);
    ref.current.position.z = atom2Vert(atoms[idx].position[2]);
  });
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      position={position}
      ref={ref}
      scale={1}
      geometry={sphere}
      material={material[idx]}
    />
  )
}

function Box(props) {
  const ref = useRef()
  // Subscribe this component to the render-loop, rotate the mesh every frame
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      material={boxMaterial}
      scale={1}
    >
      <boxGeometry args={props.size} />
    </mesh>
  )
}

function AtomsHolder({ shouldCalculate }) {

  const [simTime, setSimTime] = useState(0);
  const [realTime, setRealTime] = useState(0);
  const [itr, setItr] = useState(0);
  useFrame((state, elapsed) => {
    if (shouldCalculate) {
      MorsePotential(ferrumProperties.epsilon, atoms, ferrumProperties.alpha, ferrumProperties.r, ferrumProperties.TAU);
      MorseTension(ferrumProperties.epsilon, atoms, ferrumProperties.alpha, ferrumProperties.r, elapsed);
    }
    
    setSimTime(simTime + ferrumProperties.TAU);
    setRealTime(realTime + elapsed);
    
  });

  useEffect(() => {
    if (realTime / 5> itr) {
      setItr(itr + 1);
      const k = 42;
      console.log('Simulation Time =', simTime);
      console.log('Real Time =', realTime);
      console.log(`Position ${k + 1}`, atoms[k].position.map(e => e));
      console.log(`Speed ${k + 1}`, atoms[k].position.map((e, idx) => (e - atoms[42].previousPosition[idx])));
      console.log(`Acceleration ${k + 1}`, atoms[k].acc);
      console.log(`Tension ${k + 1}`, atoms[k].tension);
      console.log('alpha = ', randFloat(4.9 / 3.1, 5.1 / 2.9))
      console.log('\n\n');
    }
  }, [realTime]);

  return (
    <>
      {
        atoms.map((i, idx) => {
          return (
            <Atom
              key={idx}
              idx={idx}
              position={i.position}
              border={boxSize}
              radius={atomRadius}
            />
          )
        })
      }
    </>
  );
}

function App() {
  const [shouldCalculate, setshouldCalculate] = useState(true);
  const handleKey = (event) => {
    console.log(event.key, event.keyCode)
    if (event.keyCode === 13) {
      setshouldCalculate(!shouldCalculate);
    }
  }
  document.addEventListener('keypress', handleKey);
  return (
    <Canvas style={{ height: '50%', width: '50%', background: 'white', top: '25%', margin: 'auto' }}>
      <PerformanceMonitor />
      <CameraControls />
      <ambientLight />
      <Box position={[0, 0, 0]} size={boxGeometry} />
      <AtomsHolder shouldCalculate={shouldCalculate} />
    </Canvas>
  )
}

export default App
