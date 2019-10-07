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

export class AttackAction extends Action {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        game.sendPlayerReport(new Reports.AttackActionReport(this.player, this.direction))
    
        const attackPoint = game.grid.offsetPoint(this.player.point, this.direction)
        if (attackPoint == null) return

        const tile = game.grid.getOrBorder(attackPoint)
        if (tile.ghost) {
            tile.ghost = false
            game.sendPlayerReport(new Reports.ChaseAwayGhostActionReport(this.player))
            game.givePlayerSpecial(this.player)
        } else {
            game.sendPlayerReport(new Reports.GhostNotFoundActionReport(this.player))
        }
    }
}

export class MoveAction extends Action {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        game.sendPlayerReport(new Reports.MoveActionReport(this.player, this.direction))
        
        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        if (newPoint == null) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            game.sendPlayerReport(new Reports.BumpedIntoGhostActionReport(this.player))
            
            const specials = this.player.specials
            const index = specials.indexOf(AntiGhostBarrierSpecial)
            if (index != -1) {
                const useSpecial = await this.player.handleUseAntiGhostBarrierSpecial()
                if (!useSpecial) return

                this.player.removeSpecial(AntiGhostBarrierSpecial)
                game.sendPlayerReport(new Reports.UseSpecialReport(this.player, AntiGhostBarrierSpecial))

                newTile.ghost = false
                game.sendPlayerReport(new Reports.ChaseAwayGhostActionReport(this.player))
            }
        }
    
        this.player.point = newPoint
    }
}

export interface Special {}

export abstract class ActionSpecial extends Action implements Special {
    async resolve(game: Game) {
        this.player.removeSpecial(this.constructor)
        game.sendPlayerReport(new Reports.UseSpecialReport(this.player, this.constructor))
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
        while (game.grid.getOrBorder(newPoint) instanceof Tiles.Wall && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
        }
        game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, offset))
        if (offset == 0) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
    }
}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class RookSpecial extends ActionSpecial {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        let offset = Math.max(game.grid.height, game.grid.width)
        let newPoint = this.movePoint(game, offset)
        while (game.grid.getOrBorder(newPoint) instanceof Tiles.Wall && offset > 0) {
            offset--
            newPoint = this.movePoint(game, offset)
        }
        game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, offset))
        if (offset == 0) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
    }
}

//move diagonal
//remove ghost. do not report
//fail if wall. report
export class DiagonalSpecial extends ActionSpecial {
    direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        game.sendPlayerReport(new Reports.DiagonalMoveActionReport(this.player, this.direction))

        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
    }
}

//teleport 2 spaces
//remove ghost. do not report
//fail if wall. report
export class HopStepSpecial extends ActionSpecial {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        await super.resolve(game)

        game.sendPlayerReport(new Reports.TeleportMoveActionReport(this.player, this.direction, 2))

        const newPoint = game.grid.offsetPoint(this.player.point, this.direction, 2)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
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

        game.sendPlayerReport(new Reports.TeleportActionReport(this.player))

        const newPoint = this.movePoint(game)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(new Reports.BumpedIntoWallActionReport(this.player))
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
    }

    movePoint(game: Game) {
        const [x, y] = game.grid.pointToXY(this.player.point)
        const width = game.grid.width
        const height = game.grid.height
        return game.grid.pointFromXY(width - x - 1, height - y)
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
        this.player.point = newPoint
        game.sendPlayerReport(new Reports.BackToStartTeleportActionReport(this.player))

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
