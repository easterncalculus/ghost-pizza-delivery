import { Topping } from './topping'
import { Direction, OrthogonalDirections, DiagonalDirections } from './directions'
import { Player } from './player'
import { Special } from './actions'

export interface Report {}

export abstract class PlayerReport implements Report {
    readonly player: Player

    constructor(player: Player) {
        this.player = player
    }
}

export class TurnStartReport extends PlayerReport {
    readonly round: number
    readonly maxRounds: number

    constructor(player: Player, round: number, maxRounds: number) {
        super(player)
        this.round = round
        this.maxRounds = maxRounds
    }
}

export class TurnEndReport extends PlayerReport {
    readonly round: number
    readonly maxRounds: number
    readonly walls: Set<Direction>
    readonly ghosts: boolean | Set<Direction>
    readonly pizza: boolean | Set<Direction>
    readonly houses: boolean | Set<Direction>

    constructor(player: Player, round: number, maxRounds: number, walls: Set<Direction>, ghosts: boolean, pizza: boolean | Set<Direction>, houses: boolean) {
        super(player)
        this.round = round
        this.maxRounds = maxRounds
        this.walls = walls
        this.ghosts = ghosts
        this.pizza = pizza
        this.houses = houses
    }
}

export class WinReport extends PlayerReport {
    readonly round: number
    readonly maxRounds: number
    
    constructor(player: Player, round: number, maxRounds: number) {
        super(player)
        this.round = round
        this.maxRounds = maxRounds
    }
}

export class ReceiveSpecialReport extends PlayerReport {
    readonly special: Special

    constructor(player: Player, special: Special) {
        super(player)
        this.special = special
    }
}

export class UseSpecialReport extends PlayerReport {
    readonly special: Special

    constructor(player: Player, special: Special) {
        super(player)
        this.special = special
    }
}

export abstract class ActionReport extends PlayerReport {}

export class AttackActionReport extends ActionReport {
    readonly direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class MoveActionReport extends ActionReport {
    readonly direction: OrthogonalDirections

    constructor(player: Player, direction: OrthogonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class TeleportMoveActionReport extends ActionReport {
    readonly direction: Direction
    readonly count: number

    constructor(player: Player, direction: Direction, count: number) {
        super(player)
        this.direction = direction
        this.count = count
    }
}

export class DiagonalMoveActionReport extends ActionReport {
    readonly direction: DiagonalDirections

    constructor(player: Player, direction: DiagonalDirections) {
        super(player)
        this.direction = direction
    }
}

export class BackToStartTeleportActionReport extends ActionReport {}

export class TeleporterPlayerReport extends PlayerReport {}

export class TeleportPlayerReport extends PlayerReport {}

export class FoundPizzaPlayerReport extends PlayerReport {
    readonly topping: Topping | null

    constructor(player: Player, topping: Topping | null) {
        super(player)
        this.topping = topping
    }
}

export class FoundHousePlayerReport extends PlayerReport {}

export class BumpedIntoWallPlayerReport extends PlayerReport {}

export class BumpedIntoGhostPlayerReport extends PlayerReport {}

export class ChaseAwayGhostPlayerReport extends PlayerReport {}

export class GhostNotFoundPlayerReport extends PlayerReport {}

export class PigFoundPlayerReport extends PlayerReport {
    readonly parent: boolean

    constructor(player: Player, parent: boolean) {
        super(player)
        this.parent = parent
    }
}

export class MonkeyFoundPlayerReport extends PlayerReport {}

export class CrowAttackedPlayerReport extends PlayerReport {}

export class CrowTeleportPlayerReport extends PlayerReport {}

export class ManholeCoverPlayerReport extends PlayerReport {}
