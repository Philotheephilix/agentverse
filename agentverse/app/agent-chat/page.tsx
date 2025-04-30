"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import PixelButton from "../components/pixel-button"
import PixelInput from "../components/pixel-input"
import Image from "next/image"

type Agent = {
  name: string
  description: string
  agentType: string
}

type Message = {
  sender: "user" | "agent"
  text: string
  thinking?: boolean
  isTyping?: boolean
}

export default function InteractPage() {
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [userInput, setUserInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load agent data
  useEffect(() => {
    const savedAgent = localStorage.getItem("agent")
    if (savedAgent) {
      setAgent(JSON.parse(savedAgent))

      // Add initial greeting
      setTimeout(() => {
        const agentType = JSON.parse(savedAgent).agentType
        let greeting = "Hello! How can I help you today?"

        if (agentType === "hotel") {
          greeting = "Welcome to Pixel Palace Hotel! How may I assist you with your stay?"
        } else if (agentType === "ticket") {
          greeting = "Welcome to Arcade Tickets! What event would you like tickets for?"
        }

        setMessages([
          {
            sender: "agent",
            text: greeting,
            isTyping: true,
          },
        ])
        setCurrentTypingIndex(0)
        // Remove loading screen after greeting appears
        setTimeout(() => setIsLoading(false), 1500)
      }, 1000)
    } else {
      router.push("/register")
    }
  }, [router])

  // Handle typewriter effect
  useEffect(() => {
    if (currentTypingIndex >= 0 && currentTypingIndex < messages.length) {
      const timer = setTimeout(() => {
        setMessages((prev) => {
          const updated = [...prev]
          updated[currentTypingIndex] = {
            ...updated[currentTypingIndex],
            isTyping: false,
          }
          return updated
        })
        setCurrentTypingIndex(-1)
      }, messages[currentTypingIndex].text.length * 40)

      return () => clearTimeout(timer)
    }
  }, [currentTypingIndex, messages])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userInput.trim()) return

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userInput,
      },
    ])

    // Clear input
    setUserInput("")

    // Show agent thinking
    setIsThinking(true)

    // Simulate agent response (in a real app, this would call an AI API)
    setTimeout(() => {
      setIsThinking(false)

      let response = "I understand. How else can I help you?"

      // Simple response logic based on keywords
      const input = userInput.toLowerCase()
      if (agent?.agentType === "hotel") {
        if (input.includes("room") || input.includes("book")) {
          response = "We have several room types available. Would you prefer a standard room, deluxe room, or suite?"
        } else if (input.includes("check in") || input.includes("arrival")) {
          response = "Check-in time is at 3:00 PM. Early check-in may be available based on room availability."
        } else if (input.includes("check out") || input.includes("departure")) {
          response = "Check-out time is at 11:00 AM. Late check-out can be arranged for an additional fee."
        }
      } else if (agent?.agentType === "ticket") {
        if (input.includes("price") || input.includes("cost")) {
          response = "Tickets range from 50 to 200 coins depending on seating and event type."
        } else if (input.includes("available") || input.includes("when")) {
          response =
            "We have events scheduled throughout the week. The next big event is the Pixel Championship on Friday."
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "agent",
          text: response,
          isTyping: true,
        },
      ])
      setCurrentTypingIndex(messages.length + 1)
    }, 2000)
  }

  if (!agent) {
    return (
      <div className="arcade-bg min-h-screen flex items-center justify-center">
        <div className="pixel-container">
          <p className="pixel-text">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && <LoadingScreen agentName={agent?.name} />}
      <div
        className={
          `rpg-bg min-h-screen flex flex-col scene-container ${!isLoading ? "visible" : ""}`
        }
      >
        {/* Header */}
        

        {/* Main interaction area */}
        <main className="flex-1 p-4 flex flex-col">
          {/* Scene background */}
          <div className="flex-1 relative mb-4 overflow-hidden rpg-scene">

            {/* Characters */}
            <div className="absolute bottom-0 left-8 h-48 w-48 rpg-character agent-character">
              <Image src="/hagent.png" alt="Agent character" width={150} height={150} className="pixel-perfect" />
            </div>

            <div className="absolute bottom-0 right-8 h-48 w-48 rpg-character user-character">
              <Image src="/user.png" alt="User character" width={150} height={150} className="pixel-perfect" />
            </div>

            {/* Messages container */}
            <div className="absolute bottom-0 left-0 right-0 p-4 rpg-dialogue-container">
              {messages.length > 0 && (
                <div
                  className={`rpg-dialogue-box ${messages[messages.length - 1].sender === "agent" ? "agent-dialogue" : "user-dialogue"}`}
                >
                  <div className="rpg-dialogue-name">
                    {messages[messages.length - 1].sender === "agent" ? agent.name : "YOU"}
                  </div>
                  <div className="rpg-dialogue-text">
                    {messages[messages.length - 1].isTyping ? (
                      <TypewriterText text={messages[messages.length - 1].text} />
                    ) : (
                      messages[messages.length - 1].text
                    )}
                  </div>
                  <div className="rpg-dialogue-continue">▼</div>
                </div>
              )}

              {isThinking && (
                <div className="rpg-dialogue-box agent-dialogue">
                  <div className="rpg-dialogue-name">{agent.name}</div>
                  <div className="rpg-dialogue-text">
                    <span className="thinking-dots">
                      <span className="dot">.</span>
                      <span className="dot">.</span>
                      <span className="dot">.</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef}></div>
            </div>
          </div>

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="mt-auto">
            <div className="rpg-input-container">
              <PixelInput
                value={userInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUserInput(e.target.value)}
                placeholder="WHAT WILL YOU SAY?"
                className="w-full rpg-input"
              />
              <PixelButton type="submit" text="SPEAK" small />
            </div>
          </form>
        </main>

        {/* Footer navigation */}
        <footer className="p-4 flex justify-between rpg-footer">
          <div className="rpg-menu-button">
            <PixelButton onClick={() => router.push("/register")} text="NEW AGENT" small />
          </div>
          <div className="rpg-menu-button">
            <PixelButton onClick={() => router.push("/")} text="HOME" small />
          </div>
        </footer>

        {/* CRT Effect Overlay */}
        <div className="crt-overlay"></div>
      </div>
    </>
  )
}

// Typewriter effect component
function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, 40) // Speed of typing

      return () => clearTimeout(timer)
    }
  }, [currentIndex, text])

  return (
    <>
      {displayText}
      {currentIndex < text.length && <span className="rpg-cursor">▋</span>}
    </>
  )
}

// Loading overlay component
function LoadingScreen({ agentName }: { agentName?: string }) {
  return (
    <div className="loading-screen">
      <p className="pixel-text text-center animate-pulse">
        CONNECTING TO {agentName ? agentName.toUpperCase() : "AGENT"}...
      </p>
    </div>
  )
}
