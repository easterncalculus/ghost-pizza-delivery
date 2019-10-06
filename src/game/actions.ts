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
    direction: Direction.North | Direction.East | Direction.South | Direction.West

    constructor(player: Player, direction: Direction.North | Direction.East | Direction.South | Direction.West) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        game.sendPlayerReport(this.player, new Reports.AttackActionReport(this.direction))
    
        const attackPoint = game.grid.offsetPoint(this.player.point, this.direction)
        if (attackPoint == null) return

        const tile = game.grid.getOrBorder(attackPoint)
        if (tile.ghost) {
            tile.ghost = false
            game.sendPlayerReport(this.player, new Reports.ChaseAwayGhostActionReport())
            game.givePlayerSpecial(this.player)
        } else {
            game.sendPlayerReport(this.player, new Reports.GhostNotFoundActionReport())
        }
    }
}

export class MoveAction extends Action {
    direction: Direction.North | Direction.East | Direction.South | Direction.West

    constructor(player: Player, direction: Direction.North | Direction.East | Direction.South | Direction.West) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        if (newPoint == null) return

        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            game.sendPlayerReport(this.player, new Reports.MoveActionReport(this.direction))
            game.sendPlayerReport(this.player, new Reports.BumpedIntoGhostActionReport())
            
            const specials = this.player.specials
            const index = specials.indexOf(AntiGhostBarrierSpecial)
            if (index != -1) {
                const useSpecial = await this.player.handleUseAntiGhostBarrierSpecial()
                if (!useSpecial) return

                newTile.ghost = false
                game.sendPlayerReport(this.player, new Reports.ChaseAwayGhostActionReport())
            }
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.MoveActionReport(this.direction))
    }
}

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
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.TeleportMoveActionReport(this.direction, offset))
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
    }
}

//move as many spaces as possible. report spaces
//remove ghost. do not report
//fail if unable to move. report
export class RookSpecial extends Action implements Special {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
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
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.TeleportMoveActionReport(this.direction, offset))
    }

    movePoint(game: Game, offset: number) {
        return game.grid.offsetPoint(this.player.point, this.direction, offset)
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
        const newPoint = game.grid.offsetPoint(this.player.point, this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.DiagonalMoveActionReport(this.direction))
    }
}

//teleport 2 spaces
//remove ghost. do not report
//fail if wall. report
export class HopStepSpecial extends Action implements Special {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }

    async resolve(game: Game) {
        const newPoint = game.grid.offsetPoint(this.player.point, this.direction, 2)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.TeleportMoveActionReport(this.direction, 2))
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
        if (newPoint == null || newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new Reports.BumpedIntoWallActionReport())
            return
        } else if (newTile.ghost) {
            newTile.ghost = false
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.TeleportActionReport())
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
export class BackToStartSpecial extends Action implements Special {
    constructor(player: Player) {
        super(player)
    }

    async resolve(game: Game) {
        const newPoint = this.movePoint(game)

        this.player.point = newPoint
        game.sendPlayerReport(this.player, new Reports.BackToStartTeleportActionReport())

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
