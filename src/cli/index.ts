#!/usr/bin/env node

import program from 'commander';

import { GameCli } from './game';
import { PlayerCli } from './player';

import * as Specials from '../game/actions';
import { Deck } from '../game/game';
import { Grid, randomizeGameGrid } from '../game/grid';
import * as Tiles from '../game/tiles';


const asciiGrid = (grid: Grid, players: PlayerCli[]) => {
    return grid.map((tile, point) => {
        const player = players.find(player => player.point == point)
        if (player) {
            return player.emoji
        } else if (tile.ghost) {
            return '👻'
        } else if (tile instanceof Tiles.Empty) {
            return '🆓'
        } else if (tile instanceof Tiles.Start) {
            return '👣'
        } else if (tile instanceof Tiles.Teleporter) {
            return '🌀'
        } else if (tile instanceof Tiles.Grave) {
            return '⚰️'
        } else if (tile instanceof Tiles.House) {
            return tile.spawned ? '🏠' : '🚧'
        } else if (tile instanceof Tiles.Pizza) {
            return tile.found ? '🥡' : '🍕'
        } else if (tile instanceof Tiles.Wall) {
            return '⛔'
        }
        throw new Error(tile.constructor.name)
    })
        .reduce((result, value, point, array) => {
            if (point % grid.width == 0) {
                result.push(array.slice(point, point + grid.width).join(' '))
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
    randomizeGameGrid(game);

    (async function () {
        if (showMap) {
            console.log(asciiGrid(game.grid, players));
            console.log(' ');
        }
    
        while (true) {
            try {
                await game.loop()
            } catch (exception) {
                console.error(exception)
                break
            }
            if (showMap) {
                console.log(' ')
                console.log(asciiGrid(game.grid, players))
            }
            console.log(' ')
        }
    })();
}

program
  .version('0.0.1')
  .description("")
  .option('-p, --players <number>', 'number of players', parseInt)
  .option('-m, --map', 'show map', false)
  .parse(process.argv);

startGame(program.players, program.map)
