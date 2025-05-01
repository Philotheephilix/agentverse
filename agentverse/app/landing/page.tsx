"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useRef, useState, useEffect, type JSX } from "react";
import * as THREE from "three";
import RegisterPage from "../register/page";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { client, walletClient } from "@/lib/Client";
import { AgentRegistryContractABI, AgentRegistryContractAddress } from "@/lib/constant";
import { Agent } from "http";
import router from "next/router";
const isMobile = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const BoxWithEdges = ({
  position,
}: {
  position: THREE.Vector3;
}): JSX.Element => {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshPhysicalMaterial
          color="#5900f3"
          roughness={0.1}
          metalness={0.8}
          transparent={true}
          opacity={0.9}
          transmission={0.5}
          clearcoat={1}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(0.5, 0.5, 0.5)]} />
        <lineBasicMaterial color="#5900f3" linewidth={2} />
      </lineSegments>
    </group>
  );
};

type LetterShape = (0 | 1)[][];

const BoxLetter = ({
  letter,
  position,
}: {
  letter: string;
  position: THREE.Vector3;
}): JSX.Element => {
  const group = useRef<THREE.Group>(null);

  const getLetterShape = (letter: string): LetterShape => {
    const shapes: Record<string, LetterShape> = {
      A: [
        [0, 1, 0],
        [1, 0, 1],
        [1, 1, 1],
        [1, 0, 1],
        [1, 0, 1],
      ],
      G: [
        [0, 1, 1],
        [1, 0, 0],
        [1, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
      ],
      E: [
        [1, 1, 1],
        [1, 0, 0],
        [1, 1, 0],
        [1, 0, 0],
        [1, 1, 1],
      ],
      N: [
        [1, 0, 0, 0, 1],
        [1, 1, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 1, 1],
        [1, 0, 0, 0, 1],
      ],
      T: [
        [1, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
        [0, 1, 0],
      ],
      V: [
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1],
        [1, 0, 1],
        [0, 1, 0],
      ],
      R: [
        [1, 1, 0],
        [1, 0, 1],
        [1, 1, 0],
        [1, 0, 1],
        [1, 0, 1],
      ],
      S: [
        [0, 1, 1],
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 1, 0],
      ],
    };
    return shapes[letter] || shapes["N"]; // Default to 'N' if letter is not found
  };

  const letterShape = getLetterShape(letter);

  return (
    <group ref={group} position={position}>
      {letterShape.map((row, i) =>
        row.map((cell, j) => {
          if (cell) {
            let xOffset =
              j * 0.5 -
              (letter === "T"
                ? 1
                : letter === "E"
                ? 0.5
                : letter === "X" || letter === "N"
                ? 1
                : 0.75);

            if (letter === "N") {
              if (j === 0) {
                xOffset = -0.5;
              } else if (j === 1) {
                xOffset = 0;
              } else if (j === 2) {
                xOffset = 0.25;
              } else if (j === 3) {
                xOffset = 0.5;
              } else if (j === 4) {
                xOffset = 1;
              }
            }

            if (
              letter === "A" ||
              letter === "G" ||
              letter === "E" ||
              letter === "T" ||
              letter === "V" ||
              letter === "R" ||
              letter === "S"
            ) {
              xOffset = j * 0.5 - 0.5;
            }

            return (
              <BoxWithEdges
                key={`${i}-${j}`}
                position={new THREE.Vector3(xOffset, (4 - i) * 0.5 - 1, 0)}
              />
            );
          }
          return null;
        })
      )}
    </group>
  );
};

const Scene = (): JSX.Element => {
  const orbitControlsRef = useRef<any>(null);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsMobileDevice(isMobile());
  }, []);

  return (
    <>
      <group position={[0, 0, 0]} rotation={[0, Math.PI / 1.5, 0]}>
        <BoxLetter letter="A" position={new THREE.Vector3(-9, 0, 0)} />
        <BoxLetter letter="G" position={new THREE.Vector3(-7, 0, 0)} />
        <BoxLetter letter="E" position={new THREE.Vector3(-5, 0, 0)} />
        <BoxLetter letter="N" position={new THREE.Vector3(-3, 0, 0)} />
        <BoxLetter letter="T" position={new THREE.Vector3(-1, 0, 0)} />
        <BoxLetter letter="V" position={new THREE.Vector3(1, 0, 0)} />
        <BoxLetter letter="E" position={new THREE.Vector3(3, 0, 0)} />
        <BoxLetter letter="R" position={new THREE.Vector3(5, 0, 0)} />
        <BoxLetter letter="S" position={new THREE.Vector3(7, 0, 0)} />
        <BoxLetter letter="E" position={new THREE.Vector3(9, 0, 0)} />
      </group>
      <OrbitControls
        ref={orbitControlsRef}
        enableZoom
        enablePan
        enableRotate
        autoRotate
        autoRotateSpeed={3}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={0.5} />

      <directionalLight position={[5, 5, 5]} intensity={0.5} color="#ffffff" />

      <Environment
        files={isMobileDevice ? "./skybox.jpg" : "./skybox.jpg"}
        background
      />
    </>
  );
};

// Replace the ArcadeButton component with this pixelated version
const ArcadeButton = ({ onClick }: { onClick: () => void }): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Create blinking animation effect
    let interval: NodeJS.Timeout;
    if (isHovered) {
      interval = setInterval(() => {
        setIsAnimating((prev) => !prev);
      }, 200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHovered]);

  return (
    <div className="pixel-button-container">
      {/* Scanlines overlay */}
      <div className="scanlines"></div>

      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setIsPressed(false);
          setIsAnimating(false);
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className={`
          pixel-button
          ${isPressed ? "pixel-button-pressed" : ""}
          ${isHovered && isAnimating ? "pixel-button-blink" : ""}
        `}
      >
        <span className="pixel-text">START</span>

        {/* Pixelated arrow */}
        <div
          className={`pixel-arrow ${isHovered ? "pixel-arrow-animated" : ""}`}
        >
          <div className="pixel"></div>
          <div className="pixel"></div>
          <div className="pixel"></div>
        </div>
      </button>
    </div>
  );
};

// Replace the Component function's button container div with this
export default function Component(): JSX.Element {
  const [showRegister, setShowRegister] = useState(false);

  const handleStart = async () => {
    try {
       // assumes wallet already connected
       const [address] = await walletClient?.getAddresses() || [];
      const agent: any = await client.readContract({
        address: AgentRegistryContractAddress,
        abi: AgentRegistryContractABI,
        functionName: 'getAgent',
        args: [address],
      }) ;
      console.log(agent);
  
      if (agent.agentAddress !== "0x0000000000000000000000000000000000000000") {
        localStorage.setItem("userTopicId", agent.topicId);
        // Agent exists, route to AgentVerse
        window.location.href = "/agentverse";
      } else {

        // Agent doesn't exist
        setShowRegister(true);
      }
    } catch (err: any) {
      // If agent doesn't exist, contract might revert — so show register
      setShowRegister(true);
      console.log(err);
    }
  };

  return (
    <div className="w-full h-screen bg-gray-900 relative overflow-hidden">
      {/* Canvas container with fixed height */}
      <div className="w-full h-full absolute inset-0">
        <Canvas camera={{ position: [12, 0, -20], fov: 50 }}>
          <Scene />
        </Canvas>
      </div>
      <div className="absolute top-10 right-10 flex justify-center pointer-events-auto">
        <ConnectButton />
      </div>

      {/* UI Elements Container - positioned correctly */}
      {showRegister ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <RegisterPage />
        </div>
      ) : (
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-auto">
          <ArcadeButton onClick={handleStart} />
          
        </div>
      )}
    </div>
  );
}
