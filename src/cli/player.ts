import prompts from "prompts"

import { OrthogonalDirections, Direction, DiagonalDirections } from "../game/directions"
import * as Reports from "../game/reports"

import { Player } from "../game/player"
import * as Actions from "../game/actions"
import { Topping } from "../game/topping"
import { sleep } from "../util"
import { Token } from "../game/token"


export class PlayerCli extends Player {
    readonly emoji: string

    constructor(ascii: string, specials: Actions.Special[]) {
        super()
        this.emoji  = ascii

        specials.forEach(special => this.addSpecial(special))
    }

    // remove specials
    async handleTurn(): Promise<Actions.Action> {
        while (true) {
            try {
                const input = await prompts({
                    type: 'select',
                    name: 'turn',
                    message: 'What would you like to do?',
                    choices: ['move', 'attack', 'special', 'skip'].map(value => {
                        return {title: value, value: value}
                    }),
                })
                switch (input.turn) {
                    case 'move':
                        return new Actions.MoveAction(this, await this.handleOrthologicalDirection())
                    case 'attack':
                        return new Actions.AttackAction(this, await this.handleOrthologicalDirection())
                    case 'special':
                        return await this.handleSpecial()
                    case 'skip':
                        return new Actions.SkipAction(this)
                    default:
                        console.log(`Invalid choice: ${input.turn}`)
                }
            } catch (exception) { }
        }
    }

    async handleSpecial(): Promise<Actions.Action> {
        while (true) {
            const input = await prompts({
                type: 'select',
                name: 'special',
                message: 'Which special?',
                choices: ([
                    ['bishop', Actions.BishopSpecial],
                    ['rook', Actions.RookSpecial],
                    ['diagonal', Actions.DiagonalSpecial],
                    ['hopstep', Actions.HopStepSpecial],
                    ['rotate', Actions.PointSymmetricSpecial],
                    ['start', Actions.BackToStartSpecial],
                    ['cancel', null]
                ] as [string, typeof Actions.ActionSpecial?][])
                    .filter(value => value[1] ? this.hasSpecial(value[1]) : true)
                    .map(value => {
                        return {title: value[0], value: value[0]}
                    })
            })
            
            switch (input.special) {
                case 'bishop':
                    return new Actions.BishopSpecial(this, await this.handleDiagonalDirection())
                case 'rook':
                    return new Actions.RookSpecial(this, await this.handleOrthologicalDirection())
                case 'diagonal':
                    return new Actions.DiagonalSpecial(this, await this.handleDiagonalDirection())
                case 'hopstep':
                    return new Actions.HopStepSpecial(this, await this.handleOrthologicalDirection())
                case 'rotate':
                    return new Actions.PointSymmetricSpecial(this)
                case 'start':
                    return new Actions.BackToStartSpecial(this)
                case 'cancel':
                    throw new Error('cancel')
                default:
                    console.log(`Invalid choice: ${input.special}}`)
            }
        }
    }

    async handleOrthologicalDirection(): Promise<OrthogonalDirections> {
        while (true) {
            const input = await prompts({
                type: 'select',
                name: 'direction',
                message: 'Which direction?',
                choices: ['north', 'east', 'south', 'west', 'cancel'].map(value => {
                    return {title: value, value: value}
                })
            })
            switch (input.direction) {
                case 'north':
                    return Direction.North
                case 'east':
                    return Direction.East
                case 'south':
                    return Direction.South
                case 'west':
                    return Direction.West
                case 'cancel':
                    throw new Error('cancel')
                default:
                    console.log(`Invalid choice: ${input.direction}`)
            }
        }
    }

    async handleDiagonalDirection(): Promise<DiagonalDirections> {
        while (true) {
            const input = await prompts({
                type: 'select',
                name: 'direction',
                message: 'Which direction?',
                choices: ['northeast', 'southeast', 'southwest', 'northwest', 'cancel'].map(value => {
                    return {title: value, value: value}
                })
            })
            switch (input.direction) {
                case 'northeast':
                    return Direction.NorthEast
                case 'southeast':
                    return Direction.SouthEast
                case 'southwest':
                    return Direction.SouthWest
                case 'northwest':
                    return Direction.NorthWest
                case 'cancel':
                    throw new Error('cancel')
                default:
                    console.log(`Invalid choice: ${input.direction}`)
            }
        }
    }

    // remove special if used
    async handleUseAntiGhostBarrierSpecial(): Promise<boolean> {
        const input = await prompts([{
            type: 'confirm',
            name: 'confirm',
            message: 'Use Anti-Ghost Barrier?',
        }])
        return input.confirm
    }

    async handleBackToStartSpecial(): Promise<Actions.AttackAction | Actions.MoveAction | Actions.SkipAction> {
        while (true) {
            const input = await prompts([{
                type: 'select',
                name: 'turn',
                message: 'What would you like to do?',
                choices: ['move', 'attack', 'skip'].map(value => {
                    return {title: value, value: value}
                })
            }])
            switch (input.turn) {
                case 'move':
                    return new Actions.MoveAction(this, await this.handleOrthologicalDirection())
                case 'attack':
                    return new Actions.AttackAction(this, await this.handleOrthologicalDirection())
                case 'skip':
                    return new Actions.SkipAction(this)
                default:
                    console.log(`Invalid choice: ${input.turn}`)
            }
        }
    }

    async recieveReport(report: Reports.Report): Promise<void> {
        if (report instanceof Reports.TurnStartReport) {
            console.log(`${this.emoji} turn ${report.turn}`)
            
            const specials = Array.from(new Set(this.specials)).map(x => {
                return `${(x as Function).name} x${this.specials.filter(y => y === x).length}`
            }).join(', ') || 'None'
            console.log(`Specials: ${specials}`)

            const tokens = Array.from(new Set(this.tokens)).map(token => {
                return `${Token[token]} x${this.tokens.filter(y => y === token).length}`
            }).join(', ') || 'None'
            console.log(`Tokens: ${tokens}`)

            console.log(`Pizza: ${this.topping ? Topping[this.topping] : 'None'}`)
            console.log(' ')
        } else if (report instanceof Reports.TurnEndReport) {
            console.log(' ')

            console.log(`${this.emoji} report:`)
            const specials = Array.from(new Set(this.specials)).map(x => {
                return `${(x as Function).name} x${this.specials.filter(y => y === x).length}`
            }).join(', ') || 'None'
            console.log(`Specials: ${specials}`)

            const tokens = Array.from(new Set(this.tokens)).map(token => {
                return `${Token[token]} x${this.tokens.filter(y => y === token).length}`
            }).join(', ') || 'None'
            console.log(`Tokens: ${tokens}`)

            console.log(`Pizza: ${this.topping ? Topping[this.topping] : 'None'}`)
            console.log(' ')

            console.log(`Adjacent Walls: ${Array.from(report.walls).map(direction => Direction[direction]).join(', ') || 'None'}`)
            if (report.ghosts instanceof Set) {
                console.log(`Near Ghosts: ${Array.from(report.ghosts).map(direction => Direction[direction]).join(', ') || 'None'}`)
            } else {
                console.log(`Near Ghosts: ${report.ghosts ? 'Yes' : 'No'}`)
            }
            if (report.pizza instanceof Set) {
                console.log(`Near Pizza: ${Array.from(report.pizza).map(direction => Direction[direction]).join(', ') || 'None'}`)
            } else {
                console.log(`Near Pizza: ${report.pizza ? 'Yes' : 'No'}`)
            }
            if (report.houses instanceof Set) {
                console.log(`Near Houses: ${Array.from(report.houses).map(direction => Direction[direction]).join(', ') || 'None'}`)
            } else {
                console.log(`Near Houses: ${report.houses ? 'Yes' : 'No'}`)
            }

            console.log(' ')
            await prompts([{
                type: 'confirm',
                name: 'confirm',
                message: 'Next Player',
            }])
        } else if (report instanceof Reports.WinReport) {
            console.log(`${this.emoji} won on turn ${report.turn}!`)
        } else if (report instanceof Reports.RecieveSpecialReport) {
            console.log(`${this.emoji} recived ${(report.special as Function).name}`)
        } else if (report instanceof Reports.UseSpecialReport) {
            console.log(`${this.emoji} used ${(report.special as Function).name}`)
        } else if (report instanceof Reports.AttackActionReport) {
            console.log(`${this.emoji} attacked ${Direction[report.direction]}`)
        } else if (report instanceof Reports.ChaseAwayGhostPlayerReport) {
            console.log(`${this.emoji} chased away a ghost`)
        } else if (report instanceof Reports.GhostNotFoundPlayerReport) {
            console.log(`${this.emoji} attack failed. There is no ghost in that square`)
        } else if (report instanceof Reports.MoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.DiagonalMoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.BumpedIntoWallPlayerReport) {
            console.log(`${this.emoji} bumped into a wall and was sent back`)
        } else if (report instanceof Reports.BumpedIntoGhostPlayerReport) {
            console.log(`${this.emoji} bumped into a ghost and was sent back`)
        } else if (report instanceof Reports.TeleportMoveActionReport) {
            console.log(`${this.emoji} teleported ${report.count} spaces ${Direction[report.direction]}`)
        } else if (report instanceof Reports.BackToStartTeleportActionReport) {
            console.log(`${this.emoji} teleported to the start`)
        } else if (report instanceof Reports.TeleporterPlayerReport) {
            console.log(`${this.emoji} entered a teleporter`)
        } else if (report instanceof Reports.TeleportPlayerReport) {
            console.log(`${this.emoji} was teleported`)
        } else if (report instanceof Reports.FoundPizzaPlayerReport) {
            console.log(`${this.emoji} found a ${report.topping ? Topping[report.topping] + ' ' : ''}pizza!`)
        } else if (report instanceof Reports.FoundHousePlayerReport) {
            console.log(`${this.emoji} found a house!`)
        } else if (report instanceof Reports.PigFoundPlayerReport) {
            console.log(`${this.emoji} found a ${report.parent ? 'rather large' : 'little'} Pig. OINK!`)
        } else if (report instanceof Reports.MonkeyFoundPlayerReport) {
            console.log(`${this.emoji} found a monkey. yack-yack!`)
        } else if (report instanceof Reports.CrowAttackedPlayerReport) {
            console.log(`${this.emoji} attacked a crow.`)
        } else if (report instanceof Reports.CrowTeleportPlayerReport) {
            console.log(`${this.emoji} was teleported to the nearest signboard.`)
        } else if (report instanceof Reports.ManholeCoverPlayerReport) {
            console.log(`${this.emoji} found a pizza!`)
            await sleep(1000)
            console.log(`... on closer inspection its a manhole cover`)
        } else {
            console.log(report)
        }
    }
}