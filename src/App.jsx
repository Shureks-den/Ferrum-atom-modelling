import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { randFloat, randInt } from 'three/src/math/MathUtils'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three'


extend({ OrbitControls });

const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls class.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls

  const {
    camera,
    gl: { domElement }
  } = useThree();
  camera.position.x = 30
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

const sphere = new THREE.SphereGeometry(0.1, 28, 28);
const material = new THREE.MeshStandardMaterial({
  color: 'blue',
});

function Atom({atomRadius, border, position}) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => {
    // console.log(delta)
    const variation = delta / 100 * randFloat(-10, 10);
    const {x,y,z} = ref.current.position;
   
    ref.current.position.x += checkBorder(x, variation, border);
    ref.current.position.y += checkBorder(y, variation, border);;
    ref.current.position.z += checkBorder(z, variation, border);;
  });
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      position={position}
      ref={ref}
      scale={1}
      onPointerOver={(event) => hover(true)}
      
      onPointerOut={(event) => hover(false)}
      geometry={sphere}
      material={material}
      >

    </mesh>
  )
}

const bottleMaterial = new THREE.MeshPhysicalMaterial({
  reflectivity: 0,
  transmission: 1.0,
  roughness: 0,
  metalness: 0,
  clearcoat: 1,
  clearcoatRoughness: 0,
  color: new THREE.Color(0xffffff),
  ior: 1,
  thickness: 0,
})

function Box(props) {
  const ref = useRef()
  // Subscribe this component to the render-loop, rotate the mesh every frame
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      material={bottleMaterial}
      scale={1}
      >

      <boxGeometry args={props.size} />
    </mesh>
  )
}

function App() {
  const boxGeometry = [20, 20, 20];
  const atomRadius = 0.1;

  const atoms = [...Array(1000).keys()].map(i => {
    i.position = [randFloat(-9, 9), randFloat(-9, 9), randFloat(-9,9)];
    i.atomRadius = 0.1;
  });

  return (
    <Canvas style={{height: '100%', width: '100', background: 'white'}} >
      <PerformanceMonitor flipflops={3} onFallback={() => setDpr(1)}>
      <CameraControls />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Box position={[0,0,0]} size={boxGeometry} />
      {atoms.map((i, idx) => {
        return(
          <Atom 
            key={idx} 
            position={i.position} 
            border={10} 
            radius={atomRadius}
          />
        )
      })}
      </PerformanceMonitor>
    </Canvas>
  )
}

export default App
