export interface AgentData {
    id: string
    name: string
    description: string
    longDescription: string
    position: {
      x: number
      y: number
    }
    active: boolean
    stats: {
      intelligence: number
      charisma: number
      efficiency: number
    }
    avatar?: string
  }
  