import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { randFloat } from 'three/src/math/MathUtils'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { atomRadius, sphere, material, boxMaterial, ferrumProperties, numAtoms, boxGeometry, cameraPos } from './constants/constants';


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
[...Array(numAtoms).keys()].map(i => {
  atoms.push({
    position: [randFloat(-0.9, 0.9), randFloat(-0.9, 0.9), randFloat(-0.9, 0.9)],
    previousPosition: [0, 0, 0],
  })
});

const Morse = (epsilon, alpha, r, rAlpha) => {
  return epsilon * (Math.exp(-2 * alpha * (r - rAlpha)) - 2 * Math.exp(-alpha * (r - rAlpha)))
}

const firstDerivativeMorse = (epsilon, alpha, r, rAlpha) => {
  return Math.sign(r) * epsilon * (-2 * alpha * Math.exp(-2 * alpha * (r - rAlpha)) + 2 * alpha * Math.exp(-alpha * (r - rAlpha)));
}

const secondDerivativeMorse = (epsilon, alpha, r, rAlpha) => {
  return Math.sign(r) * epsilon * (4 * Math.pow(alpha, 2) * Math.exp(-2 * alpha * (r - rAlpha)) - 2 * Math.pow(alpha, 2) * Math.exp(-alpha * (r - rAlpha)));
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
      // const r = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
      accX += secondDerivativeMorse(epsilon, alpha, (Math.abs(x2 - x1)) * 10 ** -10, rAlpha);
      accY += secondDerivativeMorse(epsilon, alpha, (Math.abs(y2 - y1)) * 10 ** -10, rAlpha);
      accZ += secondDerivativeMorse(epsilon, alpha, (Math.abs(z2 - z1)) * 10 ** -10, rAlpha);
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
      // const r = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
      tX += firstDerivativeMorse(epsilon, alpha, (Math.abs(x2 - x1)) * 10 ** -10, rAlpha);
      tY += firstDerivativeMorse(epsilon, alpha, (Math.abs(y2 - y1)) * 10 ** -10, rAlpha);
      tZ += firstDerivativeMorse(epsilon, alpha, (Math.abs(z2 - z1)) * 10 ** -10, rAlpha);
    }

    const [x1, y1, z1] = a.position;
    const r = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2) + Math.pow(z1, 2));
    const coef = boxGeometry[0] ** 3 * 2.78  * 10 ** -10 * 10**-6 * 10**-6 * 10**-6
    a.tension = [tX, tY, tZ].map(e => 0.5 / coef * e * x1 * y1 * z1 / r);
  })
}

function Atom({ radius, border, position, idx }) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {

      const [x,y,z] = atoms[idx].previousPosition;
      const [newX, newY, newZ] = atoms[idx].position;
      if (newX > border || newX < -border) {
        atoms[idx].previousPosition[0] = newX;
        atoms[idx].position[0] = x;
      }
      if (newY > border || newY < -border) {
        atoms[idx].previousPosition[1] = newY;
        atoms[idx].position[1] = y;
      }
      if (newZ > border || newZ < -border) {
        atoms[idx].previousPosition[2] = newZ;
        atoms[idx].position[2] = z;
      }
      ref.current.position.x = atoms[idx].position[0];
      ref.current.position.y = atoms[idx].position[1];
      ref.current.position.z = atoms[idx].position[2];
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

function AtomsHolder({shouldCalculate}) {
  const boxBorder = boxGeometry[0] / 2;

  useFrame((state, elapsed) => {
    if (shouldCalculate)
    MorsePotential(ferrumProperties.epsilon, atoms, ferrumProperties.alpha, ferrumProperties.r, elapsed * 10000000);
    MorseTension(ferrumProperties.epsilon, atoms, ferrumProperties.alpha, ferrumProperties.r, elapsed * 10000000);
  });

  setInterval(() => {
    const k = 42;
    console.log(`Position ${k + 1}`, atoms[k].position.map(e => e * 10 ** -10));
    console.log(`Speed ${k + 1}`, atoms[k].position.map((e, idx) => (e - atoms[42].previousPosition[idx]) * 10 ** -10));
    console.log(`Acceleration ${k + 1}`, atoms[k].acc);
    console.log(`Tension ${k + 1}`,  atoms[k].tension);
  }, 1000);

  return (
    <>
    {
      atoms.map((i, idx) => {
        return (
          <Atom
            key={idx}
            idx={idx}
            position={i.position}
            border={boxBorder}
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
    <Canvas style={{ height: '50%', width: '50%', background: 'white', margin: 'auto', top: '25%' }}>
      <PerformanceMonitor />
      <CameraControls />
      <ambientLight />
      <Box position={[0, 0, 0]} size={boxGeometry} />
      <AtomsHolder shouldCalculate={shouldCalculate}/>
    </Canvas>
  )
}

export default App
