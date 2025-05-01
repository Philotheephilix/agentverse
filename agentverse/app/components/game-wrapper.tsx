import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { AgentData } from "../types/agent-types";
import AgentCard from "./agent-card";

interface GameWrapperProps {
  agents: AgentData[];
  targetPosition: { x: number; y: number } | null;
  onPlayerAtAgent: (agentId: string) => void;
  onConnect: (agentId: string) => void;
}

const GameWrapper: React.FC<GameWrapperProps> = ({
  agents,
  targetPosition,
  onPlayerAtAgent,
  onConnect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nearbyAgent, setNearbyAgent] = useState<AgentData | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle player at agent callback
  const handlePlayerAtAgent = (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    setNearbyAgent(agent || null);
    onPlayerAtAgent(agentId);
  };

  // Initialize game
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !canvasRef.current) {
      return;
    }

    // Dynamically import Excalibur and initialize the game
    const initializeGame = async () => {
      const ex = await import("excalibur");
      const { SpriteFusionResource } = await import(
        "@excaliburjs/plugin-spritefusion"
      );

      class Player extends ex.Actor {
        private targetPos: ex.Vector | null = null;
        private agentDetectionRadius = 50;
        private agents: AgentData[] = [];
        private onPlayerAtAgent: (agentId: string) => void = () => {};
        private currentAgentId: string | null = null;
        private playerImage: ex.ImageSource;

        constructor(
          agents: AgentData[],
          onPlayerAtAgent: (agentId: string) => void,
          playerImage: ex.ImageSource
        ) {
          super({
            pos: new ex.Vector(100, 100),
            width: 32,
            height: 32,
            color: ex.Color.Transparent,
          });

          this.agents = agents;
          this.onPlayerAtAgent = onPlayerAtAgent;
          this.playerImage = playerImage;
          this.z = 4;
        }

        onInitialize() {
          this.vel = new ex.Vector(0, 0);
          const sprite = this.playerImage.toSprite();
          this.graphics.use(sprite);

          this.on("postupdate", () => {
            this.handleInput();
            this.checkAgentProximity();
          });

          this.on("precollision", (evt) => {
            if (evt.other instanceof ex.Actor) {
              if (evt.other.body.collisionType === ex.CollisionType.Fixed) {
                const mtv = evt.contact.mtv;
                this.pos = this.pos.add(mtv);
                if (Math.abs(mtv.x) > 0) this.vel.x = 0;
                if (Math.abs(mtv.y) > 0) this.vel.y = 0;
              }
            }
          });
        }

        setTargetPosition(position: { x: number; y: number }) {
          this.targetPos = new ex.Vector(position.x, position.y);
        }

        handleInput() {
          if (!this.scene) return;

          const speed = 75;
          const keyboard = this.scene.engine.input.keyboard;

          if (this.targetPos) {
            const direction = this.targetPos.sub(this.pos);

            if (direction.distance() < 5) {
              this.vel = ex.Vector.Zero;
              this.targetPos = null;
              return;
            }

            this.vel = direction.normalize().scale(speed);
            return;
          }

          let direction = ex.Vector.Zero;

          if (keyboard.isHeld(ex.Keys.Left) || keyboard.isHeld(ex.Keys.A)) {
            direction.x = -1;
          } else if (
            keyboard.isHeld(ex.Keys.Right) ||
            keyboard.isHeld(ex.Keys.D)
          ) {
            direction.x = 1;
          }

          if (keyboard.isHeld(ex.Keys.Up) || keyboard.isHeld(ex.Keys.W)) {
            direction.y = -1;
          } else if (
            keyboard.isHeld(ex.Keys.Down) ||
            keyboard.isHeld(ex.Keys.S)
          ) {
            direction.y = 1;
          }

          if (!direction.equals(ex.Vector.Zero)) {
            direction = direction.normalize();
          }

          this.vel = direction.scale(speed);
        }

        checkAgentProximity() {
          for (const agent of this.agents) {
            const agentPos = new ex.Vector(agent.position.x, agent.position.y);
            const distance = this.pos.distance(agentPos);

            if (distance < this.agentDetectionRadius) {
              if (this.currentAgentId !== agent.id) {
                this.currentAgentId = agent.id;
                this.onPlayerAtAgent(agent.id);
              }
              return;
            }
          }

          if (this.currentAgentId) {
            this.currentAgentId = null;
            this.onPlayerAtAgent("");
          }
        }
      }

      const game = new ex.Engine({
        suppressPlayButton: true,
        width: 800,
        height: 600,
        backgroundColor: ex.Color.fromHex("#120024"),
        canvasElement: canvasRef.current || undefined,
        antialiasing: false,
      });

      const playerImage = new ex.ImageSource("/Icon40.png");

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
            });
            return tile;
          },
        },
      });

      const loader = new ex.Loader([spriteFusionMap, playerImage]);

      game.start(loader).then(() => {
        spriteFusionMap.addToScene(game.currentScene);

        agents.forEach((agent) => {
          const agentMarker = new ex.Actor({
            pos: new ex.Vector(agent.position.x, agent.position.y),
            width: 32,
            height: 32,
            color: agent.active ? ex.Color.Transparent : ex.Color.Red,
          });

          if (agent.active) {
            game.currentScene.add(
              new ex.Timer({
                interval: 500,
                repeats: true,
                fcn: () => {
                  agentMarker.actions.clearActions();
                },
              })
            );
          }

          const label = new ex.Text({
            text: agent.name,
            font: new ex.Font({
              family: '"Press Start 2P", monospace',
              size: 8,
              unit: ex.FontUnit.Px,
            }),
            color: ex.Color.White,
          });

          const textActor = new ex.Actor({
            pos: new ex.Vector(agent.position.x, agent.position.y - 25),
          });

          textActor.graphics.use(label);

          game.currentScene.add(agentMarker);
          game.currentScene.add(textActor);
        });

        const player = new Player(agents, handlePlayerAtAgent, playerImage);
        game.currentScene.add(player);

        if (targetPosition) {
          player.setTargetPosition(targetPosition);
        }

        game.currentScene.camera.strategy.elasticToActor(player, 0.8, 0.9);
      });
    };

    initializeGame();
  }, [isClient, agents, targetPosition]);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-frame" />
      <div className="game-controls">
        <div className="pixel-text-sm">WASD or ARROW KEYS to move</div>
      </div>
      {nearbyAgent && (
        <div className="agent-card-overlay">
          <AgentCard
            agent={nearbyAgent}
            onConnect={() => onConnect(nearbyAgent.id)}
          />
        </div>
      )}
    </div>
  );
};

export default GameWrapper;