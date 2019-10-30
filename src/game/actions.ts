import { Direction, DiagonalDirections, OrthogonalDirections } from "./directions"
import * as Reports from "./reports"

import { Game } from "./game"
import { Player } from "./player"
import * as Tiles from "./tiles"


export abstract class Action {
    player: Player

    constructor(player: Player) {
        this.player = player
    }

    abstract async resolve(game: Game): Promise<void>
}

export class SkipAction extends Action {
    async resolve(game: Game) {}
}

export class EndGameAction extends Action {
    async resolve(game: Game) {
        game.turn = game.maxPlayerTurns
    }
}

export class AttackAction extends Action {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await game.sendPlayerReport(new Reports.AttackActionReport(this.player, this.direction))
    
        const attackPoint = game.grid.offsetPoint(this.player.point, this.direction)
        if (attackPoint == null) return

        const tile = game.grid.getOrBorder(attackPoint)
        await tile.onAttackAt(game, this.player, attackPoint)
    }
}

export class MoveAction extends Action {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await game.sendPlayerReport(new Reports.MoveActionReport(this.player, this.direction))
        
        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        await newTile.onMoveTo(game, this.player, newPoint, false)
    }
}

export interface Special {}

export abstract class ActionSpecial extends Action implements Special {
    async resolve(game: Game) {
        this.player.removeSpecial(this.constructor)
        await game.sendPlayerReport(new Reports.UseSpecialReport(this.player, this.constructor))
    }
}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class BishopSpecial extends ActionSpecial {
    direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        let offset = Math.max(game.grid.height, game.grid.width)
        let newPoint = this.movePoint(game, offset)
        let newTile = game.grid.getOrBorder(newPoint)
        while (!newTile.canMoveTo(game, this.player, newPoint, true) && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
            newTile = game.grid.getOrBorder(newPoint)
        }
    
        await game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, offset))
        if (offset == 0) return

        await newTile.onMoveTo(game, this.player, newPoint, true)
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
    }
}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class RookSpecial extends ActionSpecial {
    readonly direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        let offset = Math.max(game.grid.height, game.grid.width)
        let newPoint = this.movePoint(game, offset)
        let newTile = game.grid.getOrBorder(newPoint)
        while (!newTile.canMoveTo(game, this.player, newPoint, true) && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
            newTile = game.grid.getOrBorder(newPoint)
        }
    
        await game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, offset))
        if (offset == 0) return

        await newTile.onMoveTo(game, this.player, newPoint, true)
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
    }
}

//move diagonal
//remove ghost. do not report
//fail if wall. report
export class DiagonalSpecial extends ActionSpecial {
    readonly direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        await game.sendPlayerReport(new Reports.DiagonalMoveActionReport(this.player, this.direction))

        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        await newTile.onMoveTo(game, this.player, newPoint, true)
    }
}

//teleport 2 spaces
//remove ghost. do not report
//fail if wall. report
export class HopStepSpecial extends ActionSpecial {
    readonly direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        await game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, 2))

        const newPoint = game.grid.offsetPoint(this.player.point, this.direction, 2)
        const newTile = game.grid.getOrBorder(newPoint)
        await newTile.onMoveTo(game, this.player, newPoint, true)
    }
}

//move 180 around map
//remove ghost. do not report
//fail if unable to move. report
export class PointSymmetricSpecial extends ActionSpecial {
    constructor(player: Player) {
        super(player)
    }

    async resolve(game: Game) {
        await super.resolve(game)

        await game.sendPlayerReport(new Reports.TeleportPlayerReport(this.player))

        const newPoint = this.movePoint(game)
        const newTile = game.grid.getOrBorder(newPoint)
        await newTile.onMoveTo(game, this.player, newPoint, true)
    }

    movePoint(game: Game) {
        const [x, y] = game.grid.pointToXY(this.player.point)
        const width = game.grid.width
        const height = game.grid.height
        return game.grid.pointFromXY(width - x - 1, height - y - 1)
    }
}

//move to starting space
//do additional move OR attack
export class BackToStartSpecial extends ActionSpecial {
    constructor(player: Player) {
        super(player)
    }

    async resolve(game: Game) {
        await super.resolve(game)

        const newPoint = this.movePoint(game)
        const newTile = game.grid.getOrBorder(newPoint)
        await newTile.onMoveTo(game, this.player, newPoint, true)

        await game.sendPlayerReport(new Reports.BackToStartTeleportActionReport(this.player))
        const action = await this.player.handleBackToStartSpecial()
        await action.resolve(game)
    }

    movePoint(game: Game) {
        const point = game.grid.findIndex(tile => tile instanceof Tiles.Start && tile.player == this.player)
        if (point == undefined) throw new Error()

        return point
    }
}

//can only be used when bumping into ghost
export class AntiGhostBarrierSpecial implements Special {}
