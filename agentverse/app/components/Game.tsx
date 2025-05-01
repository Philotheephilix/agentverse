'use client';

import { useEffect, useRef } from 'react';
import * as ex from 'excalibur';
import { SpriteFusionResource } from '@excaliburjs/plugin-spritefusion';
const playerImage = new ex.ImageSource('/Icon40.png');

// Add this to the loader so it's ready before use
const loader = new ex.Loader([playerImage]);

class Player extends ex.Actor {
    constructor() {
        super({
            pos: new ex.Vector(100, 100),
            width: 32,
            height: 32,
            color: ex.Color.Transparent
            //image source
           
        });

        // Set up collision body for platformer physics
        //this.body.collisionType = ex.CollisionType.Active;
        
        // Set z-index to render above map
        this.z = 5;
    }

    onInitialize() {
        // Initialize velocity vector
        this.vel = new ex.Vector(0, 0);
        const sprite = playerImage.toSprite();
        this.graphics.use(sprite);
        
        // Use engine update instead of preupdate for better input handling
        this.on('postupdate', () => this.handleInput());
        
        // Add collision handling
        this.on('precollision', (evt) => {
            if (evt.other instanceof ex.Actor) {
                // Only adjust position if colliding with a Fixed object
                if (evt.other.body.collisionType === ex.CollisionType.Fixed) {
                    const mtv = evt.contact.mtv;
                    this.pos = this.pos.add(mtv);
                    // Reset velocity in direction of collision
                    if (Math.abs(mtv.x) > 0) this.vel.x = 0;
                    if (Math.abs(mtv.y) > 0) this.vel.y = 0;
                }
            }
        });
    }

    handleInput() {
        if (!this.scene) return;
        //set player boundary
        this.pos.x = Math.max(0, Math.min(this.pos.x, 600 - this.width));
        this.pos.y = Math.max(0, Math.min(this.pos.y, 800 - this.height));
        
        const speed = 120;
        const keyboard = this.scene.engine.input.keyboard;
        
        // Reset velocity
        let direction = ex.Vector.Zero;
        
        // Handle horizontal movement


        if (keyboard.isHeld(ex.Keys.Left)) {
            direction.x = -1;
        } else if (keyboard.isHeld(ex.Keys.Right)) {
            direction.x = 1;
        }
        
        // Handle vertical movement
        if (keyboard.isHeld(ex.Keys.Up)) {
            direction.y = -1;
        } else if (keyboard.isHeld(ex.Keys.Down)) {
            direction.y = 1;
        }
        
        // Normalize diagonal movement
        if (!direction.equals(ex.Vector.Zero)) {
            direction = direction.normalize();
        }
        
        // Apply speed to direction
        this.vel = direction.scale(speed);
    }
}

const Game = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<ex.Engine | null>(null);
    
    useEffect(() => {
        if (!canvasRef.current || gameRef.current) {
            return;
        }
        
        const game = new ex.Engine({
            width: 800,
            height: 600,
            backgroundColor: ex.Color.Gray,
            suppressPlayButton: true,
            canvasElement: canvasRef.current,
        });
        
        const spriteFusionMap = new SpriteFusionResource({
            mapPath: './map/map.json',
            spritesheetPath: './map/spritesheet.png',
            useTileMapCameraStrategy: true,
            // Add collision for map tiles
            entityTileIdFactories: {
                '1': (props) => {
                    const tile = new ex.Actor({
                        pos: props.worldPos,
                        width: 16,
                        height: 16,
                        collisionType: ex.CollisionType.Fixed
                    });
                    return tile;
                }
            }
            
        });
        
        const loader = new ex.Loader([spriteFusionMap]);
        
        // Set up input system before the game starts
        game.input.keyboard.on('hold', (evt) => {
            console.log('Key held:', evt.key);
        });
        
        game.start(loader).then(() => {
            // Add map first
            spriteFusionMap.addToScene(game.currentScene);
            
            // Add player after map is loaded
            const player = new Player();
            // Position player at a higher Y to let it fall onto the map
            player.pos = new ex.Vector(100, 300);
            game.currentScene.add(player);
            
            // Set up camera to follow player
            game.currentScene.camera.strategy.elasticToActor(player, 0.8, 0.9);
            
            // Enable pointer events on canvas for debugging
            canvasRef.current?.addEventListener('click', (e) => {
                console.log('Canvas clicked at:', e.offsetX, e.offsetY);
            });
            
            console.log('Game started with map and player');
        });
        
        gameRef.current = game;
        
        return () => {
            game.stop();
            gameRef.current = null;
        };
    }, []);
    
    return (
        <div style={{ width: '800px', height: '600px' }}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }}></canvas>
        </div>
    );
};

export default Game;