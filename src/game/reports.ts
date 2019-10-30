import { Topping } from './topping'
import { Direction, OrthogonalDirections, DiagonalDirections } from './directions'
import { Player } from './player'
import { Special } from './actions'

export interface Report {}

export abstract class PlayerReport implements Report {
    player: Player

    constructor(player: Player) {
        this.player = player
    }
}

export class TurnStartReport extends PlayerReport {
    turn: number

    constructor(player: Player, turn: number) {
        super(player)
        this.turn = turn
    }
}

export class TurnEndReport extends PlayerReport {
    walls: Set<Direction>
    nearGhosts: boolean
    nearPizza: boolean
    nearHouse: boolean

    constructor(player: Player, walls: Set<Direction>, nearGhosts: boolean, nearPizza: boolean, nearHouse: boolean) {
        super(player)
        this.walls = walls
        this.nearGhosts = nearGhosts
        this.nearPizza = nearPizza
        this.nearHouse = nearHouse
    }
}

export class WinReport extends PlayerReport {
    turn: number
    
    constructor(player: Player, turn: number) {
        super(player)
        this.turn = turn
    }
}

export class ReceiveSpecialReport extends PlayerReport {
    special: Special

    constructor(player: Player, special: Special) {
        super(player)
        this.special = special
    }
}

export class UseSpecialReport extends PlayerReport {
    special: Special

    constructor(player: Player, special: Special) {
        super(player)
        this.special = special
    }
}

export abstract class ActionReport extends PlayerReport {}

export class AttackActionReport extends ActionReport {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class MoveActionReport extends ActionReport {
    direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class TeleportMoveActionReport extends ActionReport {
    direction: Direction
    count: number

    constructor(player: Player, direction: Direction, count: number) {
        super(player)
        this.direction = direction
        this.count = count
    }
}

export class DiagonalMoveActionReport extends ActionReport {
    direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class BackToStartTeleportActionReport extends ActionReport {}

export class TeleportActionReport extends ActionReport {}

export class FoundPizzaActionReport extends ActionReport {
    topping: Topping | null

    constructor(player: Player, topping: Topping | null) {
        super(player)
        this.topping = topping
    }
}

export class FoundHouseActionReport extends ActionReport {}

export class BumpedIntoWallActionReport extends ActionReport {}

export class BumpedIntoGhostActionReport extends ActionReport {}

export class ChaseAwayGhostActionReport extends ActionReport {}

export class GhostNotFoundActionReport extends ActionReport {}
