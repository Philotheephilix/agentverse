"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import PixelButton from "../components/pixel-button"
import Image from "next/image"

type Message = {
  sender: "user" | "agent"
  text: string
  isTyping?: boolean
}

export default function InteractPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [currentTypingIndex, setCurrentTypingIndex] = useState(-1)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const agentTopicId = localStorage.getItem("agentTopicId")
    const userTopicId = localStorage.getItem("userTopicId")

    if (!agentTopicId || !userTopicId) {
      console.error("Missing topic IDs in localStorage.")
      
    }

    const agentSocket = new WebSocket(`ws://localhost:3000?topicId=0.0.5921988`)
    const userSocket = new WebSocket(`ws://localhost:3000?topicId=0.0.5932000`)
    let first = true
    agentSocket.onmessage = (event) => {
      const msg = event.data;
      console.log("Received message:", msg);
      // Handle the message
    };
    
    
    const handleIncoming = (sender: "user" | "agent", message: string) => {
      setMessages(prev => [
        ...prev,
        { sender, text: message, isTyping: true }
      ])
      setCurrentTypingIndex(prev => prev + 1)
    }

    agentSocket.onmessage = (event) => {
      const msg = event.data
      setIsThinking(true)
      setTimeout(() => {
        setIsThinking(false)
        handleIncoming("agent", msg)
      }, first ? 1000 : 500)
      first = false
    }

    userSocket.onmessage = (event) => {
      const msg = event.data
      setIsThinking(true)
      setTimeout(() => {
        setIsThinking(false)
        handleIncoming("user", msg)
      }, 500)
    }

    return () => {
      agentSocket.close()
      userSocket.close()
    }
  }, [])

  // Typewriter effect for each new message
  useEffect(() => {
    if (currentTypingIndex >= 0 && currentTypingIndex < messages.length) {
      const len = messages[currentTypingIndex].text.length * 40
      const timer = setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev]
          updated[currentTypingIndex] = {
            ...updated[currentTypingIndex],
            isTyping: false,
          }
          return updated
        })
        setCurrentTypingIndex(-1)
      }, len)
      return () => clearTimeout(timer)
    }
  }, [currentTypingIndex, messages])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className="rpg-bg min-h-screen flex flex-col scene-container">
      <main className="flex-1 p-4 flex flex-col">
        <div className="flex-1 relative mb-4 overflow-hidden rpg-scene">
          {/* Characters */}
          <div className="absolute bottom-0 left-8 h-48 w-48 rpg-character agent-character">
            <Image src="/hagent.png" alt="Agent character" width={150} height={150} className="pixel-perfect" />
          </div>
          <div className="absolute bottom-0 right-8 h-48 w-48 rpg-character user-character">
            <Image src="/guy.png" alt="User character" width={150} height={150} className="pixel-perfect" />
          </div>

          {/* Dialogue */}
          <div className="absolute bottom-0 left-0 right-0 p-4 rpg-dialogue-container">
            {messages.map((msg, idx) => (
              <div key={idx} className={`rpg-dialogue-box ${msg.sender === "agent" ? "agent-dialogue" : "user-dialogue"}`}>
                <div className="rpg-dialogue-text">
                  {msg.isTyping ? <TypewriterText text={msg.text} /> : msg.text}
                </div>
                <div className="rpg-dialogue-continue">▼</div>
              </div>
            ))}
            {isThinking && (
              <div className="rpg-dialogue-box agent-dialogue">
                <div className="rpg-dialogue-text">
                  <span className="thinking-dots">
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                    <span className="dot">.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Footer with nav buttons */}
        <footer className="p-4 flex justify-between rpg-footer">
          <div className="rpg-menu-button">
            <PixelButton onClick={() => router.push("/register")} text="NEW AGENT" small />
          </div>
          <div className="rpg-menu-button">
            <PixelButton onClick={() => router.push("/")} text="HOME" small />
          </div>
        </footer>
      </main>
      <div className="crt-overlay"></div>
    </div>
  )
}

// Typewriter effect component
function TypewriterText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("")
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (idx < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[idx])
        setIdx(prev => prev + 1)
      }, 40)
      return () => clearTimeout(timer)
    }
  }, [idx, text])

  return (
    <>
      {displayText}
      {idx < text.length && <span className="rpg-cursor">▋</span>}
    </>
  )
}
