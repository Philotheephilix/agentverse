"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import { useRef, useState, useEffect, type JSX } from "react"
import * as THREE from "three"
import RegisterPage from '../register/page'

const isMobile = (): boolean => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const BoxWithEdges = ({ position }: { position: THREE.Vector3 }): JSX.Element => {
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
  )
}

type LetterShape = (0 | 1)[][]

const BoxLetter = ({ letter, position }: { letter: string; position: THREE.Vector3 }): JSX.Element => {
  const group = useRef<THREE.Group>(null)

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
    }
    return shapes[letter] || shapes["N"] // Default to 'N' if letter is not found
  }

  const letterShape = getLetterShape(letter)

  return (
    <group ref={group} position={position}>
      {letterShape.map((row, i) =>
        row.map((cell, j) => {
          if (cell) {
            let xOffset =
              j * 0.5 - (letter === "T" ? 1 : letter === "E" ? 0.5 : letter === "X" || letter === "N" ? 1 : 0.75)

            if (letter === "N") {
              if (j === 0) {
                xOffset = -0.5
              } else if (j === 1) {
                xOffset = 0
              } else if (j === 2) {
                xOffset = 0.25
              } else if (j === 3) {
                xOffset = 0.5
              } else if (j === 4) {
                xOffset = 1
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
              xOffset = j * 0.5 - 0.5
            }

            return <BoxWithEdges key={`${i}-${j}`} position={new THREE.Vector3(xOffset, (4 - i) * 0.5 - 1, 0)} />
          }
          return null
        }),
      )}
    </group>
  )
}

const Scene = (): JSX.Element => {
  const orbitControlsRef = useRef<any>(null)
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false)

  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

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
        files={
          isMobileDevice
            ? "./skybox.jpg"
            : "./skybox.jpg"
        }
        background
      />
    </>
  )
}

// Replace the ArcadeButton component with this pixelated version
const ArcadeButton = ({ onClick }: { onClick: () => void }): JSX.Element => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Create blinking animation effect
    let interval: NodeJS.Timeout
    if (isHovered) {
      interval = setInterval(() => {
        setIsAnimating((prev) => !prev)
      }, 200)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isHovered])

  return (
    <div className="pixel-button-container">
      {/* Scanlines overlay */}
      <div className="scanlines"></div>

      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false)
          setIsPressed(false)
          setIsAnimating(false)
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
        <div className={`pixel-arrow ${isHovered ? "pixel-arrow-animated" : ""}`}>
          <div className="pixel"></div>
          <div className="pixel"></div>
          <div className="pixel"></div>
        </div>
      </button>
    </div>
  )
}

// Replace the Component function's button container div with this
export default function Component(): JSX.Element {
  const [showRegister, setShowRegister] = useState(false)

  const handleStart = (): void => {
    setShowRegister(true)
  }

  return (
    <div className="w-full h-screen bg-gray-900 relative">
      
        <>
          <Canvas camera={{ position: [12, 0, -20], fov: 50 }}>
            <Scene />
          </Canvas>
        {showRegister ? (
          <div className="fixed inset-0 flex items-center justify-center">
            <RegisterPage />
          </div>
        ) : 
        <div className="absolute bottom-16 left-0 right-0 flex justify-center items-center">
            <ArcadeButton onClick={handleStart} />
          </div>}
          {/* Arcade Button Container */}
         
        </>

      {/* Add this at the end of the component to include the CSS */}
      <style jsx global>{`
        @font-face {
          font-family: 'Press Start 2P';
          font-style: normal;
          font-weight: 400;
          src: url(https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8T-267oIAQAu6jDQyK3nVivNm4I81.woff2) format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
        }
        
        .pixel-button-container {
          position: relative;
          display: inline-block;
        }
        
        .scanlines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
        }
        
        .pixel-button {
          font-family: 'Press Start 2P', monospace;
          font-size: 16px;
          padding: 12px 24px;
          background-color: #0053aa;
          color: #ffffff;
          border: none;
          position: relative;
          cursor: pointer;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          image-rendering: pixelated;
        }
        
        .pixel-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 4px solid transparent;
          border-image: url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='8' fill='%230053aa'/%3E%3Crect x='0' y='0' width='4' height='4' fill='%230088ff'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23003366'/%3E%3C/svg%3E") 2;
          border-image-repeat: stretch;
          box-sizing: border-box;
        }
        
        .pixel-button::after {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          background-color: transparent;
          border: 4px solid #000;
          z-index: -1;
        }
        
        .pixel-button-pressed {
          transform: translate(2px, 2px);
          background-color: #003366;
        }
        
        .pixel-button-blink {
          background-color: #0088ff;
        }
        
        .pixel-text {
          position: relative;
          z-index: 2;
          text-shadow: 2px 2px 0px #000000;
        }
        
        .pixel-arrow {
          display: flex;
          margin-left: 4px;
        }
        
        .pixel-arrow .pixel {
          width: 6px;
          height: 6px;
          background-color: #ffffff;
          margin: 0 1px;
        }
        
        .pixel-arrow-animated .pixel:nth-child(1) {
          animation: blink 0.5s infinite;
          animation-delay: 0s;
        }
        
        .pixel-arrow-animated .pixel:nth-child(2) {
          animation: blink 0.5s infinite;
          animation-delay: 0.1s;
        }
        
        .pixel-arrow-animated .pixel:nth-child(3) {
          animation: blink 0.5s infinite;
          animation-delay: 0.2s;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
