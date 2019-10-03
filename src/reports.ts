import {
    Topping,
    Direction,
    DiagonalDirections,
    OrthologicalDirections
} from './grid'

export interface Report {}

export class TurnStartReport implements Report {
    turn: number
    constructor(turn: number) {
        this.turn = turn
    }
}

export class TurnEndReport implements Report {
    walls: Set<Direction>
    nearGhosts: boolean
    nearPizza: boolean
    nearHouse: boolean

    constructor(walls: Set<Direction>, nearGhosts: boolean, nearPizza: boolean, nearHouse: boolean) {
        this.walls = walls
        this.nearGhosts = nearGhosts
        this.nearPizza = nearPizza
        this.nearHouse = nearHouse
    }
}

export interface ActionReport extends Report {}

export class AttackActionReport implements ActionReport {
    direction: OrthologicalDirections

    constructor(direction: OrthologicalDirections) {
        this.direction = direction
    }
}

export class MoveActionReport implements ActionReport {
    direction: OrthologicalDirections

    constructor(direction: OrthologicalDirections) {
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
