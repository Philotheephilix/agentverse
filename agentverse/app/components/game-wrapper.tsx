

import type React from "react"

import { useEffect, useRef, useState } from "react"
import * as ex from "excalibur"
import { SpriteFusionResource } from "@excaliburjs/plugin-spritefusion"
import type { AgentData } from "../types/agent-types"
import AgentCard from "./agent-card"

interface GameWrapperProps {
  agents: AgentData[]
  targetPosition: { x: number; y: number } | null
  onPlayerAtAgent: (agentId: string) => void
  onConnect: (agentId: string) => void
}

class Player extends ex.Actor {
  private targetPos: ex.Vector | null = null
  private agentDetectionRadius = 50
  private agents: AgentData[] = []
  private onPlayerAtAgent: (agentId: string) => void = () => {}
  private currentAgentId: string | null = null
  private playerSprite: ex.Sprite | null = null
  private playerImage: ex.ImageSource

  constructor(agents: AgentData[], onPlayerAtAgent: (agentId: string) => void, playerImage: ex.ImageSource) {
    super({
      pos: new ex.Vector(100, 100),
      width: 32,
      height: 32,
      color: ex.Color.Transparent,
    })

    this.agents = agents
    this.onPlayerAtAgent = onPlayerAtAgent
    this.playerImage = playerImage
    this.z = 4
  }

  onInitialize(engine: ex.Engine) {
    
    // Initialize velocity vector
    this.vel = new ex.Vector(0, 0)

    // Load player sprite
    

    // Create animation
    

    // Set default sprite
    const sprite = this.playerImage.toSprite();
    this.graphics.use(sprite);
   


    // Use engine update for better input handling
    this.on("postupdate", () => {
      this.handleInput()
      this.checkAgentProximity()
    })

    // Add collision handling
    this.on("precollision", (evt) => {
      if (evt.other instanceof ex.Actor) {
        // Only adjust position if colliding with a Fixed object
        if (evt.other.body.collisionType === ex.CollisionType.Fixed) {
          const mtv = evt.contact.mtv
          this.pos = this.pos.add(mtv)
          // Reset velocity in direction of collision
          if (Math.abs(mtv.x) > 0) this.vel.x = 0
          if (Math.abs(mtv.y) > 0) this.vel.y = 0
        }
      }
    })
  }

  setTargetPosition(position: { x: number; y: number }) {
    this.targetPos = new ex.Vector(position.x, position.y)
  }

  handleInput() {
    if (!this.scene) return

    const speed = 75
    const keyboard = this.scene.engine.input.keyboard

    // If we have a target position, move towards it
    if (this.targetPos) {
      const direction = this.targetPos.sub(this.pos)

      // If we're close enough to the target, stop moving
      if (direction.distance() < 5) {
        this.vel = ex.Vector.Zero
        this.targetPos = null
        return
      }

      // Otherwise, move towards the target
      this.vel = direction.normalize().scale(speed)
      return
    }

    // Manual movement with keyboard
    let direction = ex.Vector.Zero

    // Handle horizontal movement
    if (keyboard.isHeld(ex.Keys.Left) || keyboard.isHeld(ex.Keys.A)) {
      direction.x = -1
    } else if (keyboard.isHeld(ex.Keys.Right) || keyboard.isHeld(ex.Keys.D)) {
      direction.x = 1
    }

    // Handle vertical movement
    if (keyboard.isHeld(ex.Keys.Up) || keyboard.isHeld(ex.Keys.W)) {
      direction.y = -1
    } else if (keyboard.isHeld(ex.Keys.Down) || keyboard.isHeld(ex.Keys.S)) {
      direction.y = 1
    }

    // Normalize diagonal movement
    if (!direction.equals(ex.Vector.Zero)) {
      direction = direction.normalize()
    }

    // Apply speed to direction
    this.vel = direction.scale(speed)
  }

  checkAgentProximity() {
    // Check if player is near any agent
    for (const agent of this.agents) {
      const agentPos = new ex.Vector(agent.position.x, agent.position.y)
      const distance = this.pos.distance(agentPos)

      if (distance < this.agentDetectionRadius) {
        // Only trigger if it's a different agent than the current one
        if (this.currentAgentId !== agent.id) {
          this.currentAgentId = agent.id
          this.onPlayerAtAgent(agent.id)
        }
        return
      }
    }

    // If we're not near any agent, clear the current agent
    if (this.currentAgentId) {
      this.currentAgentId = null
      this.onPlayerAtAgent("")
    }
  }
}

const GameWrapper: React.FC<GameWrapperProps> = ({ agents, targetPosition, onPlayerAtAgent, onConnect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<ex.Engine | null>(null)
  const playerRef = useRef<Player | null>(null)
  const [nearbyAgent, setNearbyAgent] = useState<AgentData | null>(null)

  // Handle player at agent callback
  const handlePlayerAtAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    setNearbyAgent(agent || null)
    onPlayerAtAgent(agentId)
  }

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) {
      return
    }

    const game = new ex.Engine({
      suppressPlayButton: true,
      width: 800,
      height: 600,
      backgroundColor: ex.Color.fromHex("#120024"),
      canvasElement: canvasRef.current,
      antialiasing: false, // For pixel-perfect rendering
    })
    const playerImage = new ex.ImageSource('/Icon40.png')
    
    // Create a tilemap resource
    const spriteFusionMap = new SpriteFusionResource({
      mapPath: "/map/map.json",
      spritesheetPath: "/map/spritesheet.png",
      useTileMapCameraStrategy: true,
      entityTileIdFactories: {
        "1": (props) => {
          const tile = new ex.Actor({
            pos: props.worldPos,
            width: 16,
            height: 16,
            collisionType: ex.CollisionType.Fixed,
          })
          return tile
        },
      },
    })

    const loader = new ex.Loader([spriteFusionMap, playerImage])

    // Start the game
    game.start(loader).then(() => {

      // Add map first
      spriteFusionMap.addToScene(game.currentScene)

      // Add agent markers to the map
      agents.forEach((agent) => {
        const agentMarker = new ex.Actor({
          pos: new ex.Vector(agent.position.x, agent.position.y),
          width: 32,
          height: 32,
          color: agent.active ? ex.Color.Transparent : ex.Color.Red,
        })

        // Add a pulsing effect to active agents
        if (agent.active) {
          game.currentScene.add(
            new ex.Timer({
              interval: 500,
              repeats: true,
              fcn: () => {
                agentMarker.actions.clearActions()
               
              },
            }),
          )
        }

        // Add agent name label
        const label = new ex.Text({
          text: agent.name,
          font: new ex.Font({
            family: '"Press Start 2P", monospace',
            size: 8,
            unit: ex.FontUnit.Px,
          }),
          color: ex.Color.White,
        })

        const textActor = new ex.Actor({
          pos: new ex.Vector(agent.position.x, agent.position.y - 25),
        })

        textActor.graphics.use(label)

        game.currentScene.add(agentMarker)
        game.currentScene.add(textActor)
      })

      // Add player after map is loaded

      const player = new Player(agents, handlePlayerAtAgent, playerImage)

      player.pos = new ex.Vector(100, 100)
      game.currentScene.add(player)
      playerRef.current = player

      // Set up camera to follow player
      game.currentScene.camera.strategy.elasticToActor(player, 0.8, 0.9)

      console.log("Game started with map and player")
    })

    gameRef.current = game

    return () => {
      game.stop()
      gameRef.current = null
    }
  }, [agents])

  // Update player target position when it changes
  useEffect(() => {
    if (playerRef.current && targetPosition) {
      playerRef.current.setTargetPosition(targetPosition)
    }
  }, [targetPosition])

  return (
    <div className="relative w-full h-full">
      <div className="game-frame">
        <canvas ref={canvasRef} className="pixel-perfect"></canvas>

        {/* Game controls overlay */}
        <div className="game-controls">
          <div className="pixel-text-sm">WASD or ARROW KEYS to move</div>
        </div>

        {/* Agent card overlay */}
        {nearbyAgent && (
          <div className="agent-card-overlay">
            <AgentCard agent={nearbyAgent} onConnect={() => onConnect(nearbyAgent.id)} />
          </div>
        )}
      </div>
    </div>
  )
}

export default GameWrapper
