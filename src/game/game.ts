import wu from 'wu'
import { Random } from 'random-js'

import { Direction } from './directions'
import * as Reports from './reports'

import { Grid } from './grid'
import { Player } from './player'
import * as Tiles from './tiles'
import { Special } from './actions'
import { Token } from './token'

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

export abstract class GameOverError extends Error {}

export class AllPlayersWonError extends GameOverError {
    constructor(m?: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, AllPlayersWonError.prototype);
    }
}

export class ReachedMaxTurnsError extends GameOverError {
    constructor(m?: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ReachedMaxTurnsError.prototype);
    }}

export abstract class Game {
    readonly players: Player[]
    readonly grid: Grid
    readonly specials: Deck<Special>
    turn = -1
    maxPlayerTurns: number

    constructor(players: Player[], grid: Grid, specials: Deck<Special>, maxPlayerTurns: number = 20) {
        this.players = players
        this.grid = grid
        this.specials = specials
        this.maxPlayerTurns = maxPlayerTurns
    }

    playerTurn = () => Math.floor(this.turn / this.players.length) + 1

    checkAllPlayersWon = () => {
        return this.players.every(player => player.won)
    }

    checkMaxTurnLimit = () => {
        return this.playerTurn() > this.maxPlayerTurns
    }

    loop = async () => {
        this.turn++
        if (this.checkAllPlayersWon()) {
            throw new AllPlayersWonError()
        } else if (this.checkMaxTurnLimit()) {
            throw new ReachedMaxTurnsError()
        }

        const player = this.players[this.turn % this.players.length]
        if (player.won) return

        await this.sendPlayerReport(new Reports.TurnStartReport(player, this.playerTurn()))
    
        const action = await player.handleTurn()
        await action.resolve(this)

        await this.sendPlayerTurnEndReport(player)
    }

    sendPlayerTurnEndReport = async (player: Player) => {
        const point = player.point
        const adjacentTiles = this.grid.adjacentTiles(point)
        const surroundingTiles = this.grid.surroundingTiles(point)
        
        const walls: Set<Direction> = new Set(
            wu(adjacentTiles.entries())
                .filter(([_, tile]) => tile.reportAsWall())
                .map(([direction, _]) => direction)
        )
        const ghosts = wu(surroundingTiles.values())
            .some(tile => tile.reportAsGhost())
        let pizza: boolean | Set<Direction>
        if (player.hasToken(Token.Monkey)) {
            pizza = new Set(
                wu(surroundingTiles.entries())
                    .filter(([_, tile]) => tile.reportAsPizza())
                    .map(([direction, _]) => direction)
            )
        } else {
            pizza = wu(surroundingTiles.values())
                .some(tile => tile.reportAsPizza())
        }
        const houses = wu(surroundingTiles.values())
            .some(tile => tile.reportAsHouse())
        
        await this.sendPlayerReport(new Reports.TurnEndReport(player, walls, ghosts, pizza, houses))
    }

    abstract async sendPlayerReport(report: Reports.Report): Promise<void>

    async givePlayerSpecial(player: Player) {
        const special = this.specials.draw()
        if (special) {
            player.addSpecial(special)
            await this.sendPlayerReport(new Reports.RecieveSpecialReport(player, special))
        }
    }

    spawnHouse = (players: Player[], pizzaTile: Tiles.Pizza) => {
        if (pizzaTile.found) throw new Error()
        pizzaTile.found = true

        const housePoint = this.grid.findIndex(tile => tile instanceof Tiles.House && tile.topping == pizzaTile.topping)
        const houseTile = this.grid[housePoint]
        if (!(houseTile instanceof Tiles.House)) throw new Error()
        else if (houseTile.spawned) throw new Error()

        this.grid.surroundingPoints(housePoint).forEach((point) => {
            if (point == null) return

            const player = players.find(player => player.point == point)
            if (player) return

            const tile = this.grid.getOrBorder(point)
            tile.ghost = true
        })
        houseTile.spawned = true
    }
}
