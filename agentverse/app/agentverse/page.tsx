"use client"

import type React from "react"

import { useState } from "react"
import GameWrapper from "../components/game-wrapper"
import AgentSidebar from "../components/agent-sidebar"
import type { AgentData } from "../types/agent-types"
import PixelButton from "../components/pixel-button"
import PixelInput from "../components/pixel-input"
import { useRouter } from "next/navigation"
import Image from "next/image"

// Sample agent data
const agents: AgentData[] = [
  {
    id: "0.0.5928272",
    name: "FOOD DELIVERY",
    description: "Handles food delivery and inquiries",
    longDescription:
      "An experienced food delivery agent who can provide information about upcoming events, handle ticket purchases, and assist with seating arrangements. Known for quick service and extensive knowledge of local entertainment.",
    position: { x: 200, y: 150 },
    active: true,
    stats: {
      intelligence: 85,
      charisma: 90,
      efficiency: 75,
    },
    avatar: "/hagent.png",
  },
  {
    id: "0.0.5928281",
    name: "TICKET AGENT",
    description: "Handles event ticket sales and inquiries",
    longDescription:
      "An experienced ticket agent who can provide information about upcoming events, handle ticket purchases, and assist with seating arrangements. Known for quick service and extensive knowledge of local entertainment.",
    position: { x: 400, y: 300 },
    active: true,
    stats: {
      intelligence: 80,
      charisma: 85,
      efficiency: 95,
    },
    avatar: "/ticket.png",
  },
  {
    id: "0.0.5921988",
    name: "HOTEL BOOKING",
    description: "Handles hotel bookings and inquiries",
    longDescription:
      "A dedicated hotel booking agent who specializes in problem-solving and conflict resolution. Can handle complaints, process refunds, and provide general assistance with a focus on customer satisfaction.",
    position: { x: 600, y: 250 },
    active: true,
    stats: {
      intelligence: 90,
      charisma: 80,
      efficiency: 85,
    },
    avatar: "/formal.png",
  },
]

export default function GamePage() {
  const router = useRouter()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null)
  const [prompt, setPrompt] = useState("")
  const [isAnalysing, setIsAnalysing] = useState(false)

  // Handle agent selection from sidebar
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId)
    const agent = agents.find((a) => a.id === agentId)
    if (agent) {
      setTargetPosition(agent.position)
    }
  }

  // Handle player reaching an agent position
  const handlePlayerAtAgent = (agentId: string) => {
    setSelectedAgent(agentId)
  }

  // Handle connect button click
  const handleConnect = (agentId: string) => {
    console.log(`Connecting to agent: ${agentId}`)

    // In a real implementation, you would save the selected agent to localStorage
    // and navigate to the interact page
    localStorage.setItem("agent", JSON.stringify(agents.find((a) => a.id === agentId)))

    // Navigate to interact page
    setTimeout(() => {
      router.push("/agent-chat")
    }, 500)
  }

  // Handle analyse form submit
  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsAnalysing(true)
    const userTopicId = localStorage.getItem("userTopicId")

    try {
      // Make API call to the server with proper CORS handling
      fetch("http://localhost:3000/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, userTopicId }),
      })

      // Set up Hedera subscription to listen for topic ID
      const monitorAgentResponse = await fetch("/api/monitor-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: userTopicId }),
      })
      const data = await monitorAgentResponse.json()
      console.log(data)

      if (data.agent) {
        if (data.agent === "hotel-booking") {
          localStorage.setItem("agentTopicId", "0.0.5921988")
          setSelectedAgent("0.0.5921988")
          handleAgentSelect("0.0.5921988")
          setTargetPosition({ x: 600, y: 250 })
        } else if (data.agent === "food-delivery") {
          localStorage.setItem("agentTopicId", "0.0.5928272")
          setSelectedAgent("0.0.5928272")
          handleAgentSelect("0.0.5928272")
        } else if (data.agent === "ticket-agent") {
          localStorage.setItem("agentTopicId", "0.0.5928281")
          setSelectedAgent("0.0.5928281")
          handleAgentSelect("0.0.5928281")
        }
        setTimeout(() => {
          router.push("/agent-chat")
        }, 5000)
      }
    } catch (err) {
      console.error("Error in analysis process", err)
      setIsAnalysing(false)
    }
  }

  return (
    <div
      className="rpg-bg min-h-screen flex flex-col"
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        className="rpg-header p-4 text-center"
        style={{
          background: "linear-gradient(to right, rgba(59, 0, 153, 0.9), rgba(89, 0, 243, 0.9), rgba(59, 0, 153, 0.9))",
          borderBottom: "4px solid #8e44ff",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.5)",
          position: "relative",
          zIndex: 10,
          height: "60px",
        }}
      >
      
       
      </header>

      {/* Main game area */}
      <div className="flex-1 flex">
        {/* Agent sidebar */}
        <AgentSidebar agents={agents} selectedAgent={selectedAgent} onAgentSelect={handleAgentSelect} />

        <div className="flex-1 p-4">
          <div
            className="game-container"
            style={{
              border: "4px solid #5900f3",
              boxShadow: "0 0 0 4px #000, 0 0 20px rgba(89, 0, 243, 0.8)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <GameWrapper
              agents={agents}
              targetPosition={targetPosition}
              onPlayerAtAgent={handlePlayerAtAgent}
              onConnect={handleConnect}
            />
          </div>
        </div>
      </div>

      {/* Bottom input area with user sprite */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "90%",
          maxWidth: "800px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "15px",
          zIndex: 100,
        }}
      >
        <form
          onSubmit={handleAnalyse}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
            background: "rgba(18, 0, 36, 0.95)",
            border: "4px solid #5900f3",
            boxShadow: "0 0 0 4px #000, 0 0 20px rgba(89, 0, 243, 0.8)",
            padding: "15px",
            borderRadius: "4px",
            position: "relative",
          }}
        >
          <div style={{ flex: 1 }}>
            <PixelInput
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="ASK SOMETHING..."
              className="w-full"
            />
          </div>
          <PixelButton type="submit" text={isAnalysing ? "ANALYSING..." : "ENTER"} small={false} />

          {/* User sprite with speech bubble and name */}
          <div
            style={{
              position: "absolute",
              right: "-250px",
              bottom: "0",
              width: "200px",
              height: "200px",
            }}
          >
            {/* Speech bubble */}
            <div
              style={{
                position: "absolute",
                top: "-70px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "rgba(0, 0, 0, 0.85)",
                border: "4px solidrgb(111, 0, 255)",
                padding: "8px 12px",
                borderRadius: "4px",
                minWidth: "120px",
                textAlign: "center",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "0.6rem",
                color: "white",
                zIndex: 10,
                boxShadow: "0 0 10px rgba(72, 0, 255, 0.5)",
              }}
            >
              ASK ME ANYTHING?
              {/* Speech bubble pointer */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-15px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "15px solid #ff00ff",
                }}
              ></div>
            </div>

            {/* User sprite */}
            <Image
              src="/guy.png"
              alt="User character"
              width={150}
              height={150}
              className="pixel-perfect"
              style={{
                imageRendering: "pixelated",
                filter: "drop-shadow(0 0 10px rgba(89, 0, 243, 0.5))",
              }}
            />
          </div>
        </form>
      </div>

      {/* Scanlines overlay for retro effect */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))",
          backgroundSize: "100% 2px, 3px 100%",
          opacity: 0.15,
          zIndex: 1000,
        }}
      ></div>

      {/* Glow effect at the bottom */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "150px",
          background: "radial-gradient(ellipse at center, rgba(89, 0, 243, 0.3) 0%, rgba(89, 0, 243, 0) 70%)",
          pointerEvents: "none",
          zIndex: 5,
        }}
      ></div>
    </div>
  )
}
