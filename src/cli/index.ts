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
import { sleep } from '../util';


const colorTopping = (emoji: string, topping: Topping | null) => {
    switch (topping) {
        case Topping.Cheese:
            return chalk.bgYellow(emoji)
        case Topping.Shrimp:
            return chalk.bgRed(emoji)
        case Topping.Vegtable:
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
        } else if (tile instanceof Tiles.Crow) {
            return tile.found ? '🆓' : '🦜'
        } else if (tile instanceof Tiles.Monkey) {
            return tile.found ? '🆓' : '🐒'
        } else if (tile instanceof Tiles.Pig) {
            return '🐖'
        } else if (tile instanceof Tiles.ManholeCover) {
            return 'Ⓜ️ '
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

const startGame = async (
    playerCount: number,
    {
        showMap = false,
        width = 7,
        height = 7,
        walls = 4,
        graves = 6,
        teleporters = 3,
        crows = 0,
        monkeys = 0,
        pigs = 0,
        manholes = 0,
    } = {
        showMap: false,
        width: 7,
        height: 7,
        walls: 4,
        graves: 6,
        teleporters: 3,
        crows: 0,
        monkeys: 0,
        pigs: 0,
        manholes: 0,
    }
) => {
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

    const game = new GameCli(players, new Grid(width, height), deck, 20)
    randomizeGameGrid(game, {
        walls,
        graves,
        teleporters,
        crows,
        monkeys,
        pigs,
        manholes,
    })

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
                console.log(' ')
                while (true) {
                    for (let [index, map] of replay.entries()) {
                        if (index != 0) {
                            for (let i = 0; i < game.grid.height + 4; i++) {
                                process.stdout.moveCursor(0, -1)
                                process.stdout.clearLine(0)
                            }
                        }
                        console.log('Replay')
                        if (index === 0) {
                            console.log('Setup')
                        } else {
                            const playerCount = game.players.length
                            const turn = (index - 1)
                            console.log(`${players[turn % playerCount].emoji} turn ${Math.floor(turn / playerCount) + 1} / ${Math.floor((game.turn - 1) / playerCount) + 1}`)
                        }
                        console.log(' ')
                        console.log(map + '\n')
                        await sleep(1000)
                    }
                    await sleep(1000)

                    for (let i = 0; i < game.grid.height + 4; i++) {
                        process.stdout.moveCursor(0, -1)
                        process.stdout.clearLine(0)
                    }
                }
            } else {
                console.error(exception)
            }
            break
        }
    }

    process.exit()
}

program
  .version('0.0.1')
  .description("")
  .option('-p, --players <number>', 'number of players', parseInt)
  .option('-m, --map', 'show map', false)
  .option('--width <number>', 'width of map', parseInt)
  .option('--height <number>', 'height of map', parseInt)
  .option('--walls <number>', 'number of wall tiles', parseInt)
  .option('--graves <number>', 'number of grave tiles', parseInt)
  .option('--teleporters <number>', 'number of teleporter tiles', parseInt)
  .option('--crows <number>', 'number of crow special tiles', parseInt)
  .option('--monkeys <number>', 'number of monkey special tiles', parseInt)
  .option('--pigs <number>', 'number of pig special tiles', parseInt)
  .option('--manholes <number>', 'number of manhole special tiles', parseInt)
  .parse(process.argv);

startGame(program.players, {
    showMap: program.map,
    width: program.width,
    height: program.height,
    walls: program.walls,
    graves: program.graves,
    teleporters: program.teleporters,
    crows: program.crows,
    monkeys: program.monkeys,
    pigs: program.pigs,
    manholes: program.manholes,
})
