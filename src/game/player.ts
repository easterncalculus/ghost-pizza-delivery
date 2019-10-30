import { Topping } from "./topping"
import * as Actions from "./actions"
import { Report } from "./reports"
import { Token } from "./token"


export abstract class Player {
    point: number = -1
    topping: Topping | null = null
    readonly specials: Actions.Special[] = []
    readonly tokens: Token[] = []
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

    hasToken(token: any) {
        return this.tokens.includes(token)
    }

    addToken(token: any) {
        this.tokens.push(token)
    }

    removeToken(token: any) {
        const index = this.tokens.indexOf(token)
        if (index != -1) {
            this.tokens.splice(index, 1)
        }
        return index != -1
    }
}
