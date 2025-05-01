"use client"

import { useState, useEffect } from "react"
import GameWrapper from "../components/game-wrapper"
import AgentSidebar from "../components/agent-sidebar"
import type { AgentData } from "../types/agent-types"
import PixelButton from "../components/pixel-button"
import PixelInput from "../components/pixel-input"
import { useRouter } from "next/navigation"
import { Client, TopicMessageQuery } from "@hashgraph/sdk"
import { AccountId, PrivateKey } from "@hashgraph/sdk";

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
  const [prompt, setPrompt] = useState("")
  const [isAnalysing, setIsAnalysing] = useState(false)

  // Set up Hedera subscription when needed
  
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
    const userTopicId = localStorage.getItem("userTopicId");
    
    try {
      // Make API call to the server with proper CORS handling
    fetch("http://localhost:3000/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt ,userTopicId: "0.0.5932000" }),
      });
            
     
       
      
      // Set up Hedera subscription to listen for topic ID
      const monitorAgentResponse = await fetch("/api/monitor-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: "0.0.5921988" }),
      });
    const data = await monitorAgentResponse.json();

if (data.topicId) {
  localStorage.setItem("agentTopicId", data.topicId);
  router.push("/agent-chat");
}
      
      // Note: Not navigating here - will navigate when topic ID is received
    } catch (err) {
      console.error("Error in analysis process", err)
      setIsAnalysing(false)
    }
  }

  return (
    <div className="rpg-bg min-h-screen flex flex-col">
      {/* Header */}
      <header className="rpg-header p-4 text-center">
        <h1 className="pixel-text text-xl">AGENT VERSE ARCADE</h1>
        <p className="pixel-text-sm text-yellow-200 mt-1">EXPLORE AND CONNECT WITH AGENTS</p>

        {/* Prompt analyse input */}
        <form onSubmit={handleAnalyse} className="mt-4 flex flex-col items-center gap-2">
          <PixelInput
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask something…"
            className="w-full max-w-md"
          />
          <PixelButton type="submit" text={isAnalysing ? "LOADING" : "ANALYSE"} small />
        </form>
      </header>

      {/* Main game area */}
      <div className="flex-1 flex">
        {/* Agent sidebar */}
        {/* <AgentSidebar agents={agents} selectedAgent={selectedAgent} onAgentSelect={handleAgentSelect} />

        {/* Game container 
        <div className="flex-1 p-4">
          <div className="game-container">
            <GameWrapper
              agents={agents}
              targetPosition={targetPosition}
              onPlayerAtAgent={handlePlayerAtAgent}
              onConnect={handleConnect}
            />
          </div>
        </div> */}
      </div>
    </div>
  )
}