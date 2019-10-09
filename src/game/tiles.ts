import wu from 'wu'

import { Topping } from './topping'

import { Game } from './game'
import { Grid } from './grid'
import { Player } from './player'
import * as Reports from './reports'
import { AntiGhostBarrierSpecial } from './actions'

export interface Tile {
    ghost: boolean
    isValid(grid: Grid, point: number): boolean
    canMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): boolean
    onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void>
    onAttackAt(game: Game, player: Player, point: number | null): Promise<void>
    reportAsWall(): boolean
    reportAsGhost(): boolean
    reportAsPizza(): boolean
    reportAsHouse(): boolean
}

export abstract class BaseTile implements Tile {
    abstract ghost: boolean

    abstract isValid(grid: Grid, point: number): boolean

    canMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): boolean {
        return point !== null
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        if (point === null || player.point == point) return

        if (teleport) {
            this.ghost = false
        } else if (this.ghost) {
            game.sendPlayerReport(new Reports.BumpedIntoGhostActionReport(player))

            if (!player.hasSpecial(AntiGhostBarrierSpecial)) return

            const useSpecial = await player.handleUseAntiGhostBarrierSpecial()
            if (!useSpecial) return

            player.removeSpecial(AntiGhostBarrierSpecial)
            game.sendPlayerReport(new Reports.UseSpecialReport(player, AntiGhostBarrierSpecial))

            this.ghost = false
            game.sendPlayerReport(new Reports.ChaseAwayGhostActionReport(player))
        }
        player.point = point
    }

    async onAttackAt(game: Game, player: Player, point: number | null): Promise<void> {
        if (this.ghost) {
            this.ghost = false
            game.sendPlayerReport(new Reports.ChaseAwayGhostActionReport(player))
            game.givePlayerSpecial(player)
        } else {
            game.sendPlayerReport(new Reports.GhostNotFoundActionReport(player))
        }
    }

    reportAsWall(): boolean {
        return false
    }

    reportAsGhost(): boolean {
        return this.ghost
    }

    reportAsPizza(): boolean {
        return false
    }

    reportAsHouse(): boolean {
        return false
    }
}

export class Empty extends BaseTile {
    ghost = false
    safe = false
    isValid(grid: Grid, point: number) { return true }
}

export class Start extends BaseTile {
    get ghost() { return false }
    set ghost(_: boolean) {}

    player: Player
    constructor(player: Player) {
        super()
        this.player = player
    }

    isValid(grid: Grid, point: number): boolean {
        return wu(grid.adjacentPoints(point).values())
            .every((adjacentPoint) => grid.getOrBorder(adjacentPoint) instanceof Empty)
    }
}

export class Wall extends BaseTile {
    get ghost() { return false }
    set ghost(_: boolean) {}

    isValid(grid: Grid, point: number) { return true }

    canMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): boolean {
        return false
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(player))
    }

    reportAsWall(): boolean {
        return true
    }
}

export class Border extends Wall {}

export class Pizza extends BaseTile {
    topping: Topping
    found = false
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(topping: Topping) {
        super()
        this.topping = topping
    }

    isValid(grid: Grid, point: number): boolean {
        return !wu(grid.adjacentPoints(point).values()).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof House) && adjacentTile.topping == this.topping
        })
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        if (point === null || player.point == point) return

        player.point = point
        if (!this.found) {
            if (player.topping === null) {
                player.topping = this.topping
                game.spawnHouse(game.players, this)

                game.sendPlayerReport(new Reports.FoundPizzaActionReport(player, this.topping))
            } else {
                this.found = true
                game.sendPlayerReport(new Reports.FoundPizzaActionReport(player, null))
            }
        }
    }

    reportAsPizza(): boolean {
        return !this.found
    }
}

export class House extends BaseTile {
    topping: Topping
    spawned = false
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(topping: Topping) {
        super()
        this.topping = topping
    }

    isValid(grid: Grid, point: number): boolean {
        return !wu(grid.adjacentPoints(point).values()).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof Pizza) && adjacentTile.topping == this.topping
        }) && (grid.filter((tile: Tile) => tile instanceof Pizza && tile.topping == this.topping) as Pizza[]).length == 1
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        if (point === null || player.point == point) return

        player.point = point
        if (this.spawned) {
            game.sendPlayerReport(new Reports.FoundHouseActionReport(player))
            if (this.topping === player.topping) {
                player.won = game.playerTurn()

                game.sendPlayerReport(new Reports.WinReport(player, game.playerTurn()))
            }
        }
    }

    reportAsHouse(): boolean {
        return this.spawned
    }
}

export class Teleporter extends BaseTile {
    nextPoint: number
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(nextPoint: number) {
        super()
        this.nextPoint = nextPoint
    }

    isValid(grid: Grid, point: number): boolean {
        return point != this.nextPoint && grid.getOrBorder(this.nextPoint) instanceof Teleporter
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        player.point = this.nextPoint

        game.sendPlayerReport(new Reports.TeleportActionReport(player))
    }
}

export class Grave extends BaseTile {
    _ghost = true
    get ghost() { return this._ghost }
    set ghost(value) {
        // don't respawn ghosts
        if (this._ghost && !value) {
            this._ghost = value
        }
    }

    isValid(grid: Grid, point: number) { return true }
}
