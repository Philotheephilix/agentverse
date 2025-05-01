"use client"

import { useState } from "react"
import PixelButton from "../components/pixel-button"
import PixelInput from "../components/pixel-input"
import { useRouter } from "next/navigation"

// Sample agent data

export default function GamePage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState("")
  const [isAnalysing, setIsAnalysing] = useState(false)

  const handleAnalyse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    
    setIsAnalysing(true)
    
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
      <div className="flex-1 flex">
      </div>
    </div>
  )
}