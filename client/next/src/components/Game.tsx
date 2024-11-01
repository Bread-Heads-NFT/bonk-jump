'use client';
import React, { useEffect } from 'react'
import Phaser from 'phaser';
import { LobbyScene } from '@/scenes/lobby';
import { LoadScene } from '@/scenes/load';
import { HelpScene } from '@/scenes/help';
import { GameScene } from '@/scenes/game';

export const DEFAULT_WIDTH: number = 800
export const DEFAULT_HEIGHT: number = 600

const Game = () => {
    useEffect(() => {
        const config: Phaser.Types.Core.GameConfig = {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            type: Phaser.AUTO,
            backgroundColor: "#4488aa",
            parent: "phaser-container",
            dom: {
                createContainer: true,
            },
            scene: [
                LobbyScene,
                LoadScene,
                HelpScene,
                GameScene,
            ],
        };
        const game = new Phaser.Game(config)
        return () => {
            game.destroy(true)
        }
    }, [])
    return (
        <div>

        </div>
    )
}


export default Game;