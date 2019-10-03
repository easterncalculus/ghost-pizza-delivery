import { Point, Topping } from "./grid"
import { Report } from "./reports"
import { Action } from "./actions"
import { Special } from "./specials"


export class Player {
    point: Point
    topping: Topping | null = null
    specials: Special[] = []

    handleTurn = async (): Promise<Action> => {
        throw new Error("Method not implemented.")
    }
}
