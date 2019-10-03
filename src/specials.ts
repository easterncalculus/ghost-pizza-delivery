import { Action } from "./actions"
import { Game } from "./game"
import { Player } from "./player"
import { OrthologicalDirections, DiagonalDirections, Point } from "./grid"
import {
    BumpedIntoWallActionReport,
    TeleportMoveActionReport,
    TeleportActionReport,
    DiagonalMoveActionReport,
    BackToStartTeleportActionReport,
} from "./reports"
import * as Tiles from "./tiles"

export interface Special {}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class BishopSpecial extends Action implements Special {
    direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        let offset = Math.max(game.grid.height, game.grid.width)
        let newPoint = this.movePoint(game, offset)
        while (game.grid.getOrBorder(newPoint) instanceof Tiles.Wall && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
        }
        if (offset == 0) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            newTile.despawn()
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new TeleportMoveActionReport(this.direction, offset))
    }

    movePoint(game: Game, offset: number) {
        return this.player.point.offsetDirection(this.direction, offset)
    }
}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class RookSpecial extends Action implements Special {
    direction: OrthologicalDirections

    constructor(player: Player, direction: OrthologicalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        let offset = Math.max(game.grid.height, game.grid.width)
        let newPoint = this.movePoint(game, offset)
        while (game.grid.getOrBorder(newPoint) instanceof Tiles.Wall && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
        }
        if (offset == 0) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            newTile.despawn()
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new TeleportMoveActionReport(this.direction, offset))
    }

    movePoint(game: Game, offset: number) {
        return this.player.point.offsetDirection(this.direction, offset)
    }
}

//move diagonal
//remove ghost. do not report
//fail if wall. report
export class DiagonalSpecial extends Action implements Special {
    direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        const newPoint = this.player.point.offsetDirection(this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            newTile.despawn()
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new DiagonalMoveActionReport(this.direction))
    }
}

//teleport 2 spaces
//remove ghost. do not report
//fail if wall. report
export class HopStepSpecial extends Action implements Special {
    direction: OrthologicalDirections

    constructor(player: Player, direction: OrthologicalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        const newPoint = this.player.point.offsetDirection(this.direction, 2)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            newTile.despawn()
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new TeleportMoveActionReport(this.direction, 2))
    }
}

//move 180 around map
//remove ghost. do not report
//fail if unable to move. report
export class PointSymmetricSpecial extends Action implements Special {
    constructor(player: Player) {
        super(player)
    }

    async resolve(game: Game) {
        const newPoint = this.movePoint(game)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            newTile.despawn()
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new TeleportActionReport())
    }

    movePoint(game: Game) {
        const point = this.player.point
        const width = game.grid.width
        const height = game.grid.height
        return new Point(width - point.x - 1, height - point.y)
    }
}

//move to starting space
//do additional move OR attack
export class BackToStartSpecial extends Action implements Special {
    constructor(player: Player) {
        super(player)
    }

    async resolve(game: Game) {
        const newPoint = this.movePoint(game)

        this.player.point = newPoint
        game.sendPlayerReport(this.player, new BackToStartTeleportActionReport())

        const action = await this.player.handleBackToStartSpecial()
        await action.resolve(game)
    }

    movePoint(game: Game) {
        return game.grid.find(tile => tile instanceof Tiles.Start && tile.player == this.player)
    }
}

//can only be used when bumping into ghost
export class AntiGhostBarrierSpecial implements Special {}
