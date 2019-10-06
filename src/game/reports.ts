import { Topping } from './topping'
import { Direction, OrthogonalDirections, DiagonalDirections } from './directions'
import { Player } from './player'

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

export interface ActionReport extends Report {}

export class AttackActionReport implements ActionReport {
    direction: OrthogonalDirections

    constructor(direction: OrthogonalDirections) {
        this.direction = direction
    }
}

export class MoveActionReport implements ActionReport {
    direction: OrthogonalDirections

    constructor(direction: OrthogonalDirections) {
        this.direction = direction
    }
}

export class TeleportMoveActionReport implements ActionReport {
    direction: Direction
    count: number

    constructor(direction: Direction, count: number) {
        this.direction = direction
        this.count = count
    }
}

export class DiagonalMoveActionReport implements ActionReport {
    direction: DiagonalDirections

    constructor(direction: DiagonalDirections) {
        this.direction = direction
    }
}

export class BackToStartTeleportActionReport implements ActionReport {}

export class TeleportActionReport implements ActionReport {}

export class FoundPizzaActionReport implements ActionReport {
    topping: Topping | null

    constructor(topping: Topping | null) {
        this.topping = topping
    }
}

export class FoundHouseActionReport implements ActionReport {}

export class BumpedIntoWallActionReport implements ActionReport {}

export class BumpedIntoGhostActionReport implements ActionReport {}

export class ChaseAwayGhostActionReport implements ActionReport {}

export class GhostNotFoundActionReport implements ActionReport {}
