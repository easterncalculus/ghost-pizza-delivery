import { Grid, Direction } from './grid'
import { Player } from './player'
import * as Tiles from './tiles'
import {
    TurnStartReport,
    TurnEndReport,
    Report,
    TeleportActionReport,
    FoundPizzaActionReport,
    FoundHouseActionReport
} from './reports'
import { Special } from './specials'

function shuffle(items: any[]) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

export class Deck<T> {
    drawPile: T[]
    discardPile: T[]

    constructor(drawPile: T[], discardPile: T[] = []) {
        this.drawPile = drawPile
        this.discardPile = discardPile
    }

    draw() {
        if (this.drawPile.length == 0) {
            this.shuffle()
        }
        return this.drawPile.pop()
    }
    
    discard(item: T) {
        this.discardPile.push(item)
    }

    shuffle() {
        const discardPile = this.discardPile
        this.discardPile = []

        this.drawPile.concat(discardPile)
        shuffle(this.drawPile)
    }
}

export class Game {
    players: Player[]
    grid: Grid
    specials: Deck<Special>
    turn = -1
    maxPlayerTurns: number

    constructor(players: Player[], grid: Grid, specials: Deck<Special>, maxPlayerTurns: number) {
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

        this.sendPlayerReport(player, new TurnStartReport(this.playerTurn()))
        const oldPoint = player.point
    
        const action = await player.handleTurn()
        action.resolve(this)

        if (player.point != oldPoint) {
            this.afterPlayerMove(player)
        }

        this.sendPlayerTurnEndReport(player)
    }

    afterPlayerMove(player: Player) {
        const newTile = this.grid.getOrBorder(player.point)
        if (newTile instanceof Tiles.Teleporter) {
            player.point = newTile.nextPoint
            
            this.sendPlayerReport(player, new TeleportActionReport())
        } else if (newTile instanceof Tiles.Pizza && !newTile.found) {
            if (player.topping === null) {
                this.grid.spawnHouse(newTile.topping)

                this.sendPlayerReport(player, new FoundPizzaActionReport(newTile.topping))
            } else {
                this.sendPlayerReport(player, new FoundPizzaActionReport(null))
            }
        } else if (newTile instanceof Tiles.House && !newTile.spawned) {
            this.sendPlayerReport(player, new FoundHouseActionReport())
            if (newTile.topping === player.topping) {
                player.won = this.playerTurn()

                //game.sendPlayerReport(player, new WinnerReport(player))
            }
        }
    }

    sendPlayerTurnEndReport = (player: Player) => {
        const point = player.point
        const surroundingTiles = this.grid.surroundingTiles(point)
        
        const walls: Set<Direction> = new Set(
            this.grid.adjacentTiles(point)
                .filter(tile => tile instanceof Tiles.Wall)
                .toArray()
                .map(([direction, _]) => direction)
        )
        const nearGhosts = surroundingTiles
            .some(tile => tile instanceof Tiles.Ghost && tile.spawned)
        const nearPizza = surroundingTiles
            .some(tile => tile instanceof Tiles.Pizza && !tile.found)
        const nearHouse = surroundingTiles
            .some(tile => tile instanceof Tiles.House && tile.spawned)
        
        this.sendPlayerReport(player, new TurnEndReport(walls, nearGhosts, nearPizza, nearHouse))
    }

    sendPlayerReport = (player: Player, report: Report) => {
        throw new Error("Method not implemented.")
    }

    givePlayerSpecial(player: Player) {
        const special = this.specials.draw()
        if (special) {
            player.specials.push(special)
        }
    }
}
