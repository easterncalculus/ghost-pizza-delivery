import wu from 'wu'

import { Topping } from './topping'

import { Game } from './game'
import { Grid } from './grid'
import { Player } from './player'
import * as Reports from './reports'
import { AntiGhostBarrierSpecial } from './actions'
import { Token } from './token'

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
    get ghost() { return false }
    set ghost(_: boolean) {}

    abstract isValid(grid: Grid, point: number): boolean

    canMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): boolean {
        return point !== null
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        if (point === null || player.point == point) return

        if (teleport) {
            this.ghost = false
        } else if (this.ghost) {
            await game.sendPlayerReport(new Reports.BumpedIntoGhostPlayerReport(player))

            if (!player.hasSpecial(AntiGhostBarrierSpecial)) return

            const useSpecial = await player.handleUseAntiGhostBarrierSpecial()
            if (!useSpecial) return

            player.removeSpecial(AntiGhostBarrierSpecial)
            await game.sendPlayerReport(new Reports.UseSpecialReport(player, AntiGhostBarrierSpecial))

            this.ghost = false
            await game.sendPlayerReport(new Reports.ChaseAwayGhostPlayerReport(player))
        }
        player.point = point
    }

    async onAttackAt(game: Game, player: Player, point: number | null): Promise<void> {
        if (this.ghost) {
            this.ghost = false
            await game.sendPlayerReport(new Reports.ChaseAwayGhostPlayerReport(player))
            await game.givePlayerSpecial(player)
        } else {
            await game.sendPlayerReport(new Reports.GhostNotFoundPlayerReport(player))
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
    readonly player: Player

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
    isValid(grid: Grid, point: number) { return true }

    canMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): boolean {
        return false
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        await game.sendPlayerReport(new Reports.BumpedIntoWallPlayerReport(player))
    }

    reportAsWall(): boolean {
        return true
    }
}

export class Border extends Wall {}

export class Pizza extends BaseTile {
    readonly topping: Topping
    found = false

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

                await game.sendPlayerReport(new Reports.FoundPizzaPlayerReport(player, this.topping))
            } else {
                this.found = true
                await game.sendPlayerReport(new Reports.FoundPizzaPlayerReport(player, null))
            }
        }
    }

    reportAsPizza(): boolean {
        return !this.found
    }
}

export class House extends BaseTile {
    readonly topping: Topping
    spawned = false

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
            await game.sendPlayerReport(new Reports.FoundHousePlayerReport(player))
            if (this.topping === player.topping) {
                player.won = game.playerTurn()

                await game.sendPlayerReport(new Reports.WinReport(player, game.playerTurn()))
            }
        }
    }

    reportAsHouse(): boolean {
        return this.spawned
    }
}

export class Teleporter extends BaseTile {
    readonly nextPoint: number

    constructor(nextPoint: number) {
        super()
        this.nextPoint = nextPoint
    }

    isValid(grid: Grid, point: number): boolean {
        return point != this.nextPoint && grid.getOrBorder(this.nextPoint) instanceof Teleporter
    }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        player.point = this.nextPoint

        await game.sendPlayerReport(new Reports.TeleporterPlayerReport(player))
        await game.sendPlayerReport(new Reports.TeleportPlayerReport(player))
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

export class Pig extends BaseTile {
    readonly parent: boolean

    constructor(parent: boolean) {
        super()
        this.parent = parent
    }

    isValid(grid: Grid, point: number) { return true }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        await super.onMoveTo(game, player, point, teleport)
        await game.sendPlayerReport(new Reports.PigFoundPlayerReport(player, this.parent))
    }
}

export class Monkey extends BaseTile {
    found = false

    isValid(grid: Grid, point: number) { return true }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        await super.onMoveTo(game, player, point, teleport)
        if (this.found) return

        this.found = true
        player.addToken(Token.Monkey)
        await game.sendPlayerReport(new Reports.MonkeyFoundPlayerReport(player))
    }
}

export class Crow extends BaseTile {
    found = false

    isValid(grid: Grid, point: number) { return true }

    async onAttackAt(game: Game, player: Player, point: number | null): Promise<void> {
        if (this.found || point == null) {
            await super.onAttackAt(game, player, point)
            return
        }

        await game.sendPlayerReport(new Reports.CrowAttackedPlayerReport(player))

        this.found = true
        player.addToken(Token.Crow)

        const pointXY = game.grid.pointToXY(point)
        const houses = wu(game.grid.entries())
            .filter(([_, tile]) => tile instanceof House)
            .map(([housePoint, tile]) => {
                const housePointXY = game.grid.pointToXY(housePoint)
                return [housePoint, tile, Math.abs(pointXY[0] - housePointXY[0]) + Math.abs(pointXY[1] - housePointXY[1])]
            })
            .toArray() as [number, House, number][]
        
        houses.sort(([pointA, tileA, distanceA], [pointB, tileB, distanceB]): any => {
            if (distanceA > distanceB) {
                return 1
            } else if (distanceA < distanceB) {
                return -1
            }

            if (tileA.topping > tileB.topping) {
                return 1
            } else if (tileA.topping < tileB.topping) {
                return -1
            }

            return 0
        })

        const value = houses[0]
        if (!value) return

        player.point = value[0]
        await game.sendPlayerReport(new Reports.CrowTeleportPlayerReport(player))
    }
}

export class ManholeCover extends BaseTile {
    isValid(grid: Grid, point: number) { return true }

    async onMoveTo(game: Game, player: Player, point: number | null, teleport: boolean): Promise<void> {
        await super.onMoveTo(game, player, point, teleport)
        await game.sendPlayerReport(new Reports.ManholeCoverPlayerReport(player))
    }

    reportAsPizza() { return true }
}
