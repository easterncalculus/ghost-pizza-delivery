import { Topping } from "./topping"
import * as Actions from "./actions"
import { Report } from "./reports"


export abstract class Player {
    point: number = -1
    topping: Topping | null = null
    specials: Actions.Special[] = []
    won: number | null = null

    // remove specials
    abstract async handleTurn(): Promise<Actions.Action>

    // remove special if used
    abstract async handleUseAntiGhostBarrierSpecial(): Promise<boolean>

    abstract async handleBackToStartSpecial(): Promise<Actions.Action>

    abstract async receiveReport(report: Report): Promise<void>

    hasSpecial(special: Actions.Special) {
        return this.specials.includes(special)
    }

    addSpecial(special: Actions.Special) {
        this.specials.push(special)
    }

    removeSpecial(special: Actions.Special) {
        const index = this.specials.indexOf(special)
        if (index != -1) {
            this.specials.splice(index, 1)
        }
        return index != -1
    }
}
