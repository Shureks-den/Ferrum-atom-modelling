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
  camera.position.x = 2
  camera.position.y = 2
  camera.position.z = 2

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
    console.log(ferrumProperties.TAU);
    const newPosition = [
      x - xPrev + acc * ferrumProperties.TAU ** 2, 
      y - yPrev + acc * elapsed ** 2, 
      z - zPrev + acc * elapsed ** 2
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

      const { x, y, z } = ref.current.position;
      const [newX, newY, newZ] = atoms[idx].position;
  
      ref.current.position.x += checkBorder(x, newX - x, border);
      ref.current.position.y += checkBorder(y, newY - y, border);
      ref.current.position.z += checkBorder(z, newZ - z, border);
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

function AtomsHolder() {
  const boxBorder = boxGeometry[0] / 2;

  useFrame((state, elapsed) => {
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
  return (
    <Canvas style={{ height: '50%', width: '50%', background: 'white', margin: 'auto', top: '25%' }} >
      <PerformanceMonitor />
      <CameraControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[0, 0, 0]} size={boxGeometry} />
      <AtomsHolder />
    </Canvas>
  )
}

export default App
