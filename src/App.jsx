import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { randFloat, randInt } from 'three/src/math/MathUtils'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { atomRadius, sphere, material, boxMaterial, ferrumProperties, numAtoms, boxGeometry } from './constants/constants';


extend({ OrbitControls });

const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls class.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls

  const {
    camera,
    gl: { domElement }
  } = useThree();
  camera.position.x = 20
  camera.position.y = 20
  camera.position.z = 20

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
const secondDerivativeMorse = (epsilon, alpha, r, rAlpha) => {
  return epsilon * (4 * Math.pow(alpha, 2) * Math.exp(-2 * alpha * (r - rAlpha)) - 2 * Math.pow(alpha, 2) * Math.exp(-alpha * (r - rAlpha)));
}

const MorsePotential = (epsilon, atoms, alpha, rAlpha, elapsed) => {
  atoms.forEach((a, idx) => {
    let acc = 0;
    for (let i = 0; i < numAtoms; i++) {
      if (i === idx) continue;
      const [x1, y1, z1] = a.position;
      const [x2, y2, z2] = atoms[i].position;
      const r = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
      acc += secondDerivativeMorse(epsilon, alpha, r * 10 ** -10, rAlpha);
    }
    const [xPrev, yPrev, zPrev] = a.previousPosition;
    const [x, y, z] = a.position;
    const newPosition = [
      2 * x - xPrev + acc * elapsed ** 2, 
      2 * y - yPrev + acc * elapsed ** 2, 
      2 * z - zPrev + acc * elapsed ** 2
    ];
    a.previousPosition = structuredClone(a.position);
    a.position = structuredClone(newPosition);
  })
}

function Atom({ radius, border, position, idx }) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {

      const [x,y,z] = atoms[idx].previousPosition;
      const [newX, newY, newZ] = atoms[idx].position;
      if (idx === 0) {
        console.log([newX, newY, newZ]);
      }
  
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
      material={material}
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

  setInterval
  useFrame((state, elapsed) => {
    if (shouldCalculate)
    MorsePotential(ferrumProperties.epsilon, atoms, ferrumProperties.alpha, ferrumProperties.r, elapsed);
  });

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
      <pointLight position={[10, 10, 10]} />
      <Box position={[0, 0, 0]} size={boxGeometry} />
      <AtomsHolder shouldCalculate={shouldCalculate}/>
    </Canvas>
  )
}

export default App
