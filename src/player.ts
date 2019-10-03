import { Point, Topping } from "./grid"
import { Action, AttackAction, MoveAction } from "./actions"
import { Special } from "./specials"


export class Player {
    point: Point
    topping: Topping | null = null
    specials: Special[] = []
    won: number

    // remove specials
    handleTurn = async (): Promise<Action> => {
        throw new Error("Method not implemented.")
    }

    // remove special if used
    handleUseAntiGhostBarrierSpecial = async (): Promise<boolean> => {
        throw new Error("Method not implemented.")
    }

    handleBackToStartSpecial = async(): Promise<AttackAction | MoveAction> => {
        throw new Error("Method not implemented.");
    }
}
