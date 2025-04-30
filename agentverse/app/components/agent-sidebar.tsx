"use client"

import type React from "react"
import type { AgentData } from "../types/agent-types"
import Image from "next/image"

interface AgentSidebarProps {
  agents: AgentData[]
  selectedAgent: string | null
  onAgentSelect: (agentId: string) => void
}

const AgentSidebar: React.FC<AgentSidebarProps> = ({ agents, selectedAgent, onAgentSelect }) => {
  return (
    <div className="agent-sidebar">
      <div className="sidebar-header">
        <h2 className="pixel-text-sm">AVAILABLE AGENTS</h2>
      </div>

      <div className="agent-list">
        {agents.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent === agent.id}
            onClick={() => onAgentSelect(agent.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface AgentListItemProps {
  agent: AgentData
  isSelected: boolean
  onClick: () => void
}

const AgentListItem: React.FC<AgentListItemProps> = ({ agent, isSelected, onClick }) => {
  return (
    <div
      className={`agent-list-item ${isSelected ? "selected" : ""} ${!agent.active ? "inactive" : ""}`}
      onClick={onClick}
    >
      <div className="agent-avatar">
        <Image
          src={agent.avatar || "/placeholder.svg?height=64&width=64"}
          alt={agent.name}
          width={48}
          height={48}
          className="pixel-perfect"
        />
        <div className={`status-indicator ${agent.active ? "active" : "inactive"}`}></div>
      </div>

      <div className="agent-info">
        <h3 className="agent-name">{agent.name}</h3>
        <p className="agent-description">{agent.description}</p>
      </div>

      <div className="selection-arrow">
        {isSelected && (
          <div className="pixel-arrow">
            <div className="pixel"></div>
            <div className="pixel"></div>
            <div className="pixel"></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentSidebar
