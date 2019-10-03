import { Grid, Direction, Point } from './grid'
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

export class Game {
    players: Player[]
    grid: Grid
    turn = -1
    specials: Special[]
    winner: Player | null

    constructor(players: Player[], grid: Grid, specials: Special[]) {
        this.players = players
        this.grid = grid
        this.specials = specials
    }

    loop = async () => {
        if (this.winner)
            throw new Error('Game over')

        this.turn++
        const player = this.players[this.turn % this.players.length]
        this.sendPlayerReport(player, new TurnStartReport())
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
                this.winner = player

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
        const special = this.specials.splice(Math.floor(Math.random() * this.specials.length), 1)
        player.specials.push(special)
    }
}
