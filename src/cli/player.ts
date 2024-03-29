import prompts from "prompts"
import chalk from "chalk"

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
                    choices: ['move', 'attack', 'special', 'skip', 'end game'].map(value => {
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
                    case 'end game':
                        return new Actions.EndGameAction(this)
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

    async receiveReport(report: Reports.Report): Promise<void> {
        if (report instanceof Reports.TurnStartReport) {
            console.log(`${this.emoji} round ${report.round} / ${report.maxRounds}`)
            
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

            console.log(`Adjacent Walls: ${Array.from(report.walls).map(direction => Direction[direction]).join(', ') || chalk.bgRed('None')}`)
            if (report.ghosts instanceof Set) {
                console.log(`Near Ghosts: ${Array.from(report.ghosts).map(direction => Direction[direction]).join(', ') || chalk.bgRed('None')}`)
            } else {
                console.log(`Near Ghosts: ${report.ghosts ? chalk.bgGreen('Yes') : chalk.bgRed('No')}`)
            }
            if (report.pizza instanceof Set) {
                console.log(`Near Pizza: ${Array.from(report.pizza).map(direction => Direction[direction]).join(', ') || chalk.bgRed('None')}`)
            } else {
                console.log(`Near Pizza: ${report.pizza ? chalk.bgGreen('Yes') : chalk.bgRed('No')}`)
            }
            if (report.houses instanceof Set) {
                console.log(`Near Houses: ${Array.from(report.houses).map(direction => Direction[direction]).join(', ') || chalk.bgRed('None')}`)
            } else {
                console.log(`Near Houses: ${report.houses ? chalk.bgGreen('Yes') : chalk.bgRed('No')}`)
            }
        } else if (report instanceof Reports.WinReport) {
            console.log(`Congratulations! ${this.emoji} delivered their pizza on turn ${report.round}!`)
        } else if (report instanceof Reports.ReceiveSpecialReport) {
            console.log(chalk.magenta(`${this.emoji} received ${(report.special as Function).name}`))
        } else if (report instanceof Reports.UseSpecialReport) {
            console.log(chalk.magenta(`${this.emoji} used ${(report.special as Function).name}`))
        } else if (report instanceof Reports.AttackActionReport) {
            console.log(`${this.emoji} attacked ${Direction[report.direction]}`)
        } else if (report instanceof Reports.ChaseAwayGhostPlayerReport) {
            console.log(chalk.red(`${this.emoji} chased away a ghost`))
        } else if (report instanceof Reports.GhostNotFoundPlayerReport) {
            console.log(chalk.bgRed(`${this.emoji} attack failed. There is no ghost in that square`))
        } else if (report instanceof Reports.MoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.DiagonalMoveActionReport) {
            console.log(`${this.emoji} moved ${Direction[report.direction]}`)
        } else if (report instanceof Reports.BumpedIntoWallPlayerReport) {
            console.log(chalk.bgRed(`${this.emoji} bumped into a wall and was sent back`))
        } else if (report instanceof Reports.BumpedIntoGhostPlayerReport) {
            console.log(chalk.bgRed(`${this.emoji} bumped into a ghost and was sent back`))
        } else if (report instanceof Reports.TeleportMoveActionReport) {
            console.log(chalk.magenta(`${this.emoji} teleported ${report.count} spaces ${Direction[report.direction]}`))
        } else if (report instanceof Reports.BackToStartTeleportActionReport) {
            console.log(chalk.magenta(`${this.emoji} teleported to their starting space`))
        } else if (report instanceof Reports.TeleportPlayerReport) {
            console.log(chalk.bgMagenta.bold(`${this.emoji} was teleported!!`))
        } else if (report instanceof Reports.FoundPizzaPlayerReport) {
            if(report.topping){
                console.log(chalk.bgBlue.bold(`${this.emoji} found a pizza! It's the ${Topping[report.topping]} pizza!`))
            } else if (report.player.topping){
                console.log(chalk.blue(`${this.emoji} found a pizza! But they already have the ${Topping[report.player.topping]} pizza...`))
            }else{
                console.log(chalk.bgRed(`${this.emoji} found a pizza! But they already have something strange in their hands...`))
            }
        } else if (report instanceof Reports.FoundHousePlayerReport) {
            console.log(chalk.blue(`${this.emoji} found a house!`))
        } else if (report instanceof Reports.TeleporterPlayerReport) {
            console.log(`${this.emoji} entered a teleporter`)
        } else if (report instanceof Reports.PigFoundPlayerReport) {
            console.log(chalk.cyan(`${this.emoji} found a ${report.parent ? 'rather large' : 'little'} Pig. OINK!`))
        } else if (report instanceof Reports.MonkeyFoundPlayerReport) {
            console.log(chalk.cyan(`${this.emoji} found a monkey. yack-yack!`))
        } else if (report instanceof Reports.CrowAttackedPlayerReport) {
            console.log(chalk.cyan(`${this.emoji} attacked a crow.`))
        } else if (report instanceof Reports.CrowTeleportPlayerReport) {
            console.log(`${this.emoji} was teleported to the nearest signboard.`)
        } else if (report instanceof Reports.ManholeCoverPlayerReport) {
            console.log(chalk.bgBlue.bold(`${this.emoji} found a pizza! It's the...`))
            await sleep(1000)
            console.log(chalk.bgRed.bold(`... on closer inspection, it's just a manhole cover`))
        } else {
            console.log(report)
        }
    }
}