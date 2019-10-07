import inquirer from "inquirer"

import { OrthogonalDirections, Direction, DiagonalDirections } from "../game/directions"
import * as Reports from "../game/reports"

import { Player } from "../game/player"
import * as Actions from "../game/actions"
import { Topping } from "../game/topping"


export class PlayerCli extends Player {
    emoji: string

    constructor(ascii: string, specials: Actions.Special[]) {
        super()
        this.emoji  = ascii

        specials.forEach(special => this.addSpecial(special))
    }

    // remove specials
    async handleTurn(): Promise<Actions.Action> {
        while (true) {
            try {
                const input = await inquirer.prompt([{
                    type: 'list',
                    name: 'turn',
                    message: 'What would you like to do?',
                    choices: ['move', 'attack', 'special', 'skip']
                }])
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
            const input = await inquirer.prompt([{
                type: 'list',
                name: 'special',
                message: 'Which special?',
                choices: () => {
                    const values = Array.from([
                        ['bishop', Actions.BishopSpecial],
                        ['rook', Actions.RookSpecial],
                        ['diagonal', Actions.DiagonalSpecial],
                        ['hopstep', Actions.HopStepSpecial],
                        ['rotate', Actions.PointSymmetricSpecial],
                        ['start', Actions.BackToStartSpecial],
                    ].filter(([_, value]) => {
                        return (this.specials.includes(value))
                    }).map(value => value[0]))
                    values.push('cancel')

                    return values
                }
            }])
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
            const input = await inquirer.prompt([{
                type: 'list',
                name: 'direction',
                message: 'Which direction?',
                choices: ['north', 'east', 'south', 'west', 'cancel']
            }])
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
            const input = await inquirer.prompt([{
                type: 'list',
                name: 'direction',
                message: 'Which direction?',
                choices: ['northeast', 'southeast', 'southwest', 'northwest', 'cancel']
            }])
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
        const input = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: 'Use Anti-Ghost Barrier?',
        }])
        return input.confirm
    }

    async handleBackToStartSpecial(): Promise<Actions.AttackAction | Actions.MoveAction | Actions.SkipAction> {
        while (true) {
            const input = await inquirer.prompt([{
                type: 'list',
                name: 'turn',
                message: 'What would you like to do?',
                choices: ['move', 'attack', 'skip']
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

            console.log(`Pizza: ${this.topping ? Topping[this.topping] : 'None'}`)
        } else if (report instanceof Reports.TurnEndReport) {
            console.log(' ')
            console.log(`${this.emoji} report`)
            console.log(`Adjacent Walls: ${Array.from(report.walls).map(wall => Direction[wall]).join(', ') || 'None'}`)
            console.log(`Near Ghosts: ${report.nearGhosts ? 'Yes' : 'No'}`)
            console.log(`Near Pizza: ${report.nearPizza ? 'Yes' : 'No'}`)
            console.log(`Near House: ${report.nearHouse ? 'Yes' : 'No'}`)
        } else if (report instanceof Reports.WinReport) {
            console.log(`${this.emoji} won on turn ${report.turn}!`)
        } else if (report instanceof Reports.RecieveSpecialReport) {
            console.log(`${this.emoji} recived ${(report.special as Function).name}`)
        } else if (report instanceof Reports.UseSpecialReport) {
            console.log(`${this.emoji} used ${(report.special as Function).name}`)
        } else if (report instanceof Reports.AttackActionReport) {
            console.log(`${this.emoji} attacked ${Direction[report.direction]}`)
        } else if (report instanceof Reports.ChaseAwayGhostActionReport) {
            console.log(`${this.emoji} chased away a ghost`)
        } else if (report instanceof Reports.GhostNotFoundActionReport) {
            console.log(`${this.emoji} attack failed. There is no ghost in that square`)
        } else if (report instanceof Reports.MoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.DiagonalMoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.BumpedIntoWallActionReport) {
            console.log(`${this.emoji} bumped into a wall`)
        } else if (report instanceof Reports.BumpedIntoGhostActionReport) {
            console.log(`${this.emoji} bumped into a ghost`)
        } else if (report instanceof Reports.TeleportMoveActionReport) {
            console.log(`${this.emoji} teleported ${report.count} spaces ${Direction[report.direction]}`)
        } else if (report instanceof Reports.BackToStartTeleportActionReport) {
            console.log(`${this.emoji} teleported to the start`)
        } else if (report instanceof Reports.TeleportActionReport) {
            console.log(`${this.emoji} was teleported`)
        } else if (report instanceof Reports.FoundPizzaActionReport) {
            console.log(`${this.emoji} found a pizza!`)
        } else if (report instanceof Reports.FoundHouseActionReport) {
            console.log(`${this.emoji} found a house!`)
        } else {
            console.log(report)
        }
    }
}