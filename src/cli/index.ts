#!/usr/bin/env node

import program from 'commander';
import chalk from 'chalk'

import { PlayerCli } from './player';

import * as Specials from '../game/actions';
import { Deck, GameOverError } from '../game/game';
import { Grid, randomizeGameGrid } from '../game/grid';
import * as Tiles from '../game/tiles';
import { GameCli } from './game';
import { Topping } from '../game/topping';


const colorTopping = (emoji: string, topping: Topping | null) => {
    switch (topping) {
        case Topping.Cheese:
            return chalk.bgYellow(emoji)
        case Topping.Shrimp:
            return chalk.bgRed(emoji)
        case Topping.Vegtables:
            return chalk.bgGreen(emoji)
        default:
            return emoji
    }
}


const asciiGrid = (grid: Grid, players: PlayerCli[]) => {
    return grid.map((tile, point) => {
        const player = players.find(player => player.point == point)
        if (player) {
            return colorTopping(player.emoji, player.topping)
        } else if (tile.ghost) {
            return '👻'
        } else if (tile instanceof Tiles.Empty) {
            return '🆓'
        } else if (tile instanceof Tiles.Start) {
            return '👣'
        } else if (tile instanceof Tiles.Teleporter) {
            return '🌀'
        } else if (tile instanceof Tiles.Grave) {
            return '⚰️ '
        } else if (tile instanceof Tiles.House) {
            return colorTopping(tile.spawned ? '🏠' : '🚧', tile.topping)
        } else if (tile instanceof Tiles.Pizza) {
            return colorTopping(tile.found ? '🥡' : '🍕', tile.topping)
        } else if (tile instanceof Tiles.Wall) {
            return '⛔'
        }
        throw new Error(tile.constructor.name)
    })
        .reduce((result, value, point, array) => {
            if (point % grid.width == 0) {
                result.push(array.slice(point, point + grid.width).join(''))
            }
            return result
        }, new Array())
        .join('\n')
}

const playerEmojis = [
    '🐵',
    '🐶',
    '🐺',
    '🦊',
    '🐱',
    '🦁',
    '🐯',
    '🐴',
    '🦄',
    '🐮',
    '🐷',
    '🐭',
    '🐹',
    '🐰',
    '🐻',
    '🐼',
    '🐸',
    '🐲',
]

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

const startGame = (playerCount: number, showMap: boolean) => {
    const starterDeck = new Deck([
        Specials.BishopSpecial,
        Specials.RookSpecial,
        Specials.DiagonalSpecial,
        Specials.HopStepSpecial,
        Specials.PointSymmetricSpecial,
        Specials.BackToStartSpecial,
        Specials.AntiGhostBarrierSpecial,
    ], new Array(), true)
    
    const playerEmojiDeck = new Deck(playerEmojis, new Array(), true)

    const players = []
    for (let i = 0; i < playerCount; i++) {
        players.push(new PlayerCli(playerEmojiDeck.draw(), [starterDeck.draw(), starterDeck.draw()]))
    }
    
    const deck = new Deck([
        Specials.BishopSpecial,
        Specials.RookSpecial,
        Specials.DiagonalSpecial,
        Specials.HopStepSpecial,
        Specials.PointSymmetricSpecial,
        Specials.BackToStartSpecial,
        Specials.AntiGhostBarrierSpecial,
        Specials.BishopSpecial,
        Specials.RookSpecial,
        Specials.DiagonalSpecial,
        Specials.HopStepSpecial,
        Specials.PointSymmetricSpecial,
        Specials.BackToStartSpecial,
        Specials.AntiGhostBarrierSpecial,
    ], new Array(), true)

    const game = new GameCli(players, new Grid(), deck, 20)
    randomizeGameGrid(game)

    ;(async function () {
        console.log(`Players: ${players.map(player => player.emoji).join(' ')}\n`)
        const replay = new Array()

        const map = asciiGrid(game.grid, players)
        replay.push(map)
        if (showMap) {
            console.log(map);
            console.log(' ');
        }
    
        while (true) {
            try {
                await game.loop()
                console.log(' ')

                const map = asciiGrid(game.grid, players)
                replay.push(map)
                if (showMap) {
                    console.log(map)
                    console.log(' ')
                }
            } catch (exception) {
                if (exception instanceof GameOverError) {
                    while (true) {
                        for (let [index, map] of replay.entries()) {
                            if (index != 0) {
                                process.stdout.moveCursor(0, -game.grid.height)
                            }
                            process.stdout.write(map + '\n')
                            await sleep(1000)
                        }
                    }
                } else {
                    console.error(exception)
                }
                break
            }
        }

        process.exit()
    })();
}

program
  .version('0.0.1')
  .description("")
  .option('-p, --players <number>', 'number of players', parseInt)
  .option('-m, --map', 'show map', false)
  .parse(process.argv);

startGame(program.players, program.map)
