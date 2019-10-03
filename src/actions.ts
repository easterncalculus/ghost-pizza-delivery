import { Player } from "./player"
import { Direction } from "./grid"
import { Game } from "./game"
import * as Tiles from "./tiles"
import {
    BumpedIntoWallActionReport,
    MoveActionReport,
    BumpedIntoGhostActionReport,
    AttackActionReport,
    ChaseAwayGhostActionReport,
    GhostNotFoundActionReport,
} from "./reports"


export abstract class Action {
    player: Player

    abstract async resolve(game: Game): Promise<void>
}

export class AttackAction extends Action {
    player: Player
    direction: Direction.North | Direction.East | Direction.South | Direction.West

    constructor(player: Player, direction: Direction.North | Direction.East | Direction.South | Direction.West) {
        super()
        this.player = player
        this.direction = direction
    }

    async resolve(game: Game) {
        game.sendPlayerReport(this.player, new AttackActionReport(this.direction))
    
        const attackPoint = this.player.point.offsetDirection(this.direction)
        const tile = game.grid.getOrBorder(attackPoint)
        if (tile instanceof Tiles.Ghost && tile.spawned) {
            tile.despawn()
            game.givePlayerSpecial(this.player)

            game.sendPlayerReport(this.player, new ChaseAwayGhostActionReport())
        } else {
            game.sendPlayerReport(this.player, new GhostNotFoundActionReport())
        }
    }
}

export class MoveAction extends Action {
    player: Player
    direction: Direction.North | Direction.East | Direction.South | Direction.West

    constructor(player: Player, direction: Direction.North | Direction.East | Direction.South | Direction.West) {
        super()
        this.player = player
        this.direction = direction
    }

    async resolve(game: Game) {
        const newPoint = this.player.point.offsetDirection(this.direction)
        const newTile = game.grid.getOrBorder(newPoint)
        if (newTile instanceof Tiles.Wall) {
            game.sendPlayerReport(this.player, new BumpedIntoWallActionReport())
            return
        } else if (newTile instanceof Tiles.Ghost && newTile.spawned) {
            game.sendPlayerReport(this.player, new MoveActionReport(this.direction))
            game.sendPlayerReport(this.player, new BumpedIntoGhostActionReport())
            return // implement using anti ghost barrier special
        }
    
        this.player.point = newPoint
        game.sendPlayerReport(this.player, new MoveActionReport(this.direction))
    }
}
