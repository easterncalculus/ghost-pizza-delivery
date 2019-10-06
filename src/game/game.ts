import wu from 'wu'
import { Random } from 'random-js'

import { Direction } from './directions'
import * as Reports from './reports'

import { Grid } from './grid'
import { Player } from './player'
import * as Tiles from './tiles'
import { Special } from './actions'

export class Deck<T> {
    drawPile: T[]
    discardPile: T[]
    random: Random

    constructor(drawPile: T[], discardPile: T[] = [], shuffle = false) {
        this.drawPile = drawPile
        this.discardPile = discardPile
        this.random = new Random()

        if (shuffle) {
            this.shuffle()
        }
    }

    draw() {
        if (this.drawPile.length == 0) {
            this.shuffle()
        }
        const card = this.drawPile.pop()
        if (card == undefined) throw new Error()

        return card
    }
    
    discard(item: T) {
        this.discardPile.push(item)
    }

    shuffle() {
        const discardPile = this.discardPile
        this.discardPile = []

        this.drawPile.concat(discardPile)
        this.random.shuffle(this.drawPile)
    }
}

export abstract class Game {
    players: Player[]
    grid: Grid
    specials: Deck<Special>
    turn = -1
    maxPlayerTurns: number

    constructor(players: Player[], grid: Grid, specials: Deck<Special>, maxPlayerTurns: number = 20) {
        this.players = players
        this.grid = grid
        this.specials = specials
        this.maxPlayerTurns = maxPlayerTurns
    }

    playerTurn = () => Math.floor(this.turn / this.players.length) + 1

    loop = async () => {
        if (this.players.every(player => player.won)) {
            throw new Error('All players have won')
        } else if (this.playerTurn() >= this.maxPlayerTurns) {
            throw new Error('Reached max turns')
        }

        this.turn++
        const player = this.players[this.turn % this.players.length]
        if (player.won) return

        this.sendPlayerReport(new Reports.TurnStartReport(player, this.playerTurn()))
        const oldPoint = player.point
    
        const action = await player.handleTurn()
        await action.resolve(this)

        if (player.point != oldPoint) {
            this.afterPlayerMove(player)
        }

        this.sendPlayerTurnEndReport(player)
    }

    afterPlayerMove(player: Player) {
        const newTile = this.grid.getOrBorder(player.point)
        if (newTile instanceof Tiles.Teleporter) {
            player.point = newTile.nextPoint
            
            this.sendPlayerReport(new Reports.TeleportActionReport(player))
        } else if (newTile instanceof Tiles.Pizza && !newTile.found) {
            if (player.topping === null) {
                this.grid.spawnHouse(newTile.topping)

                this.sendPlayerReport(new Reports.FoundPizzaActionReport(player, newTile.topping))
            } else {
                this.sendPlayerReport(new Reports.FoundPizzaActionReport(player, null))
            }
        } else if (newTile instanceof Tiles.House && !newTile.spawned) {
            this.sendPlayerReport(new Reports.FoundHouseActionReport(player))
            if (newTile.topping === player.topping) {
                player.won = this.playerTurn()

                this.sendPlayerReport(new Reports.WinReport(player, this.playerTurn()))
            }
        }
    }

    sendPlayerTurnEndReport = (player: Player) => {
        const point = player.point
        const surroundingTiles = this.grid.surroundingTiles(point)
        
        const walls: Set<Direction> = new Set(
            wu(this.grid.adjacentTiles(point).entries())
                .filter(([_, tile]) => tile instanceof Tiles.Wall)
                .map(([direction, _]) => direction)
        )
        const nearGhosts = wu(surroundingTiles.values())
            .some(tile => tile.ghost)
        const nearPizza = wu(surroundingTiles.values())
            .some(tile => tile instanceof Tiles.Pizza && !tile.found)
        const nearHouse = wu(surroundingTiles.values())
            .some(tile => tile instanceof Tiles.House && tile.spawned)
        
        this.sendPlayerReport(new Reports.TurnEndReport(player, walls, nearGhosts, nearPizza, nearHouse))
    }

    abstract sendPlayerReport(report: Reports.Report): void

    givePlayerSpecial(player: Player) {
        const special = this.specials.draw()
        if (special) {
            player.addSpecial(special)
            this.sendPlayerReport(new Reports.RecieveSpecialReport(player, special))
        }
    }
}
