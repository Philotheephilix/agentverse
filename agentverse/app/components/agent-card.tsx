"use client"

import type React from "react"

import { useState } from "react"
import type { AgentData } from "../types/agent-types"
import Image from "next/image"
import PixelButton from "./pixel-button"

interface AgentCardProps {
  agent: AgentData
  onConnect: () => void
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onConnect }) => {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="agent-card" onMouseEnter={() => setShowDetails(true)} onMouseLeave={() => setShowDetails(false)}>
      <div className="agent-card-header">
        <h3 className="pixel-text">{agent.name}</h3>
        <div className={`status-badge ${agent.active ? "active" : "inactive"}`}>
          {agent.active ? "ONLINE" : "OFFLINE"}
        </div>
      </div>

      <div className="agent-card-content">
        <div className="agent-card-avatar">
          <Image
            src={agent.avatar || "/placeholder.svg?height=128&width=128"}
            alt={agent.name}
            width={96}
            height={96}
            className="pixel-perfect"
          />
        </div>

        <div className="agent-card-info">
          <div className="agent-stats">
            <div className="stat-bar">
              <span className="stat-label">INT</span>
              <div className="stat-bar-bg">
                <div className="stat-bar-fill intelligence" style={{ width: `${agent.stats.intelligence}%` }}></div>
              </div>
              <span className="stat-value">{agent.stats.intelligence}</span>
            </div>

            <div className="stat-bar">
              <span className="stat-label">CHR</span>
              <div className="stat-bar-bg">
                <div className="stat-bar-fill charisma" style={{ width: `${agent.stats.charisma}%` }}></div>
              </div>
              <span className="stat-value">{agent.stats.charisma}</span>
            </div>

            <div className="stat-bar">
              <span className="stat-label">EFF</span>
              <div className="stat-bar-bg">
                <div className="stat-bar-fill efficiency" style={{ width: `${agent.stats.efficiency}%` }}></div>
              </div>
              <span className="stat-value">{agent.stats.efficiency}</span>
            </div>
          </div>

          {agent.active && (
            <div className="agent-connect">
              <PixelButton onClick={onConnect} text="CONNECT" small />
            </div>
          )}
        </div>
      </div>

      {/* Expanded description */}
      {showDetails && (
        <div className="agent-card-details">
          <p className="pixel-text-sm">{agent.longDescription}</p>
        </div>
      )}
    </div>
  )
}

export default AgentCard
