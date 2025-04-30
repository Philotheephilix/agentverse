"use client"

import { useState } from "react"
import GameWrapper from "../components/game-wrapper"
import AgentSidebar from "../components/agent-sidebar"
import type { AgentData } from "../types/agent-types"
import PixelButton from "../components/pixel-button"
import { useRouter } from "next/navigation"

// Sample agent data
const agents: AgentData[] = [
  {
    id: "agent1",
    name: "HOTEL RECEPTIONIST",
    description: "Manages hotel bookings and guest services",
    longDescription:
      "A friendly hotel receptionist who can help with room bookings, check-in/out procedures, and answer questions about hotel amenities. Specializes in providing excellent customer service and ensuring guests have a comfortable stay.",
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
    id: "agent2",
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
    id: "agent3",
    name: "CUSTOMER SERVICE",
    description: "Resolves customer issues and provides support",
    longDescription:
      "A dedicated customer service agent who specializes in problem-solving and conflict resolution. Can handle complaints, process refunds, and provide general assistance with a focus on customer satisfaction.",
    position: { x: 600, y: 200 },
    active: false,
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
      router.push("/interact")
    }, 500)
  }

  return (
    <div className="rpg-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="rpg-header p-4 text-center">
        <h1 className="pixel-text text-xl">AGENT VERSE ARCADE</h1>
        <p className="pixel-text-sm text-yellow-200 mt-1">EXPLORE AND CONNECT WITH AGENTS</p>
      </header>

      {/* Main game area */}
      <div className="flex-1 flex">
        {/* Agent sidebar */}
        <AgentSidebar agents={agents} selectedAgent={selectedAgent} onAgentSelect={handleAgentSelect} />

        {/* Game container */}
        <div className="flex-1 p-4">
          <div className="game-container">
            <GameWrapper
              agents={agents}
              targetPosition={targetPosition}
              onPlayerAtAgent={handlePlayerAtAgent}
              onConnect={handleConnect}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      

      {/* CRT Effect Overlay */}
      <div className="crt-overlay"></div>
    </div>
  )
}
