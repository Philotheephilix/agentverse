"use client"

import React, { useState, useEffect, useRef, JSX } from "react"
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
    
    const userSocket = new WebSocket(`ws://localhost:3000/ws-topic-listen`);
    let first = true;
    const agentSocket = new WebSocket('ws://localhost:3000/ws-topic-listen');
    console.log(agentTopicId)
    agentSocket.onopen = () => {
      console.log("WebSocket connection opened");

      // Send subscription message once the connection is open
      const message = JSON.stringify({ topicId: "0.0.5932000" });
      agentSocket.send(message);
    };

    agentSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    agentSocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    userSocket.onopen = () => {
      console.log("WebSocket connection opened");

      // Send subscription message once the connection is open
      const message = JSON.stringify({ topicId: "0.0.5921988" });
      userSocket.send(message);
    };

    userSocket.onmessage = (event) => {
      let content = "";
      try {
        const msgObj = JSON.parse(event.data);
        content = msgObj.content ?? "";
      } catch {
        content = event.data;
      }
      console.log("Received message:", content);
      // You may want to call handleIncoming("user", content) here if you display user messages
    };

    userSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    userSocket.onclose = () => {
      console.log("WebSocket connection closed");
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
      let content = "";
      try {
        const msgObj = JSON.parse(event.data);
        content = msgObj.content ?? "";
      } catch {
        content = event.data;
      }
    
      console.log("Received user message:", content);
    
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        handleIncoming("user", content);
      }, 500);
    };
    agentSocket.onmessage = (event) => {
      let content = "";
      try {
        const msgObj = JSON.parse(event.data);
        content = msgObj.content ?? "";
      } catch {
        content = event.data;
      }
    
      console.log("Received agent message:", content);
    
      setIsThinking(true);
      setTimeout(() => {
        setIsThinking(false);
        handleIncoming("agent", content);
      }, first ? 1000 : 500);
      first = false;
    };
    return () => {
      agentSocket.close()
      userSocket.close()
    }
  }, [])

  // Typewriter effect for each new message
  useEffect(() => {
    if (currentTypingIndex >= 0 && currentTypingIndex < messages.length) {
      if (messages[currentTypingIndex] && messages[currentTypingIndex].text) {
      }}
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
          {messages.map((msg, idx) => {
              let content: JSX.Element | string = msg.text;

              try {
                const parsed = JSON.parse(msg.text);

                // Check for tokenId format
                if (parsed.tokenId) {
                  content = (
                    <a
                      href={`https://hashscan.io/testnet/token/${parsed.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline hover:text-blue-600"
                    >
                      View Token on HashScan: {parsed.tokenId}
                    </a>
                  );
                }
              } catch {
                if (
                  msg.text.startsWith("https")
                ) {
                  content = (
                    <iframe
                      src={msg.text}
                      className="w-152 h-120 rounded-md border"
                      allow="fullscreen"
                    />
                  );
                } else if (
                  msg.text.includes("BK")
                ) {
                  content = msg.text; // Render as-is (normal confirmation)
                } else if (msg.isTyping) {
                  content = <TypewriterText text={msg.text} />;
                }
              }

              return (
                <div key={idx} className={`rpg-dialogue-box ${msg.sender === "agent" ? "agent-dialogue" : "user-dialogue"}`}>
                  <div className="rpg-dialogue-text">{content}</div>
                  <div className="rpg-dialogue-continue">▼</div>
                </div>
              );
            })}

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
    if (text && idx < text.length) {
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
      <span className="rpg-cursor">▋</span>
    </>
  )
}
