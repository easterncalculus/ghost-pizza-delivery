import wu from 'wu'

import { Topping } from './topping'

import { Grid } from './grid'
import { Player } from './player'

export interface Tile {
    ghost: boolean
    isValid(grid: Grid, point: number): boolean
}

export class Empty implements Tile {
    ghost = false
    safe = false
    isValid = (grid: Grid, point: number) => true
}

export class Start implements Tile {
    get ghost() { return false }
    set ghost(_: boolean) {}

    player: Player
    constructor(player: Player) {
        this.player = player
    }

    isValid(grid: Grid, point: number): boolean {
        return wu(grid.adjacentPoints(point).values())
            .every((adjacentPoint) => grid.getOrBorder(adjacentPoint) instanceof Empty)
    }
}

export class Wall implements Tile {
    get ghost() { return false }
    set ghost(_: boolean) {}

    isValid = (grid: Grid, point: number) => true
}

export class Border extends Wall {}

export class Pizza implements Tile {
    topping: Topping
    found = false
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(topping: Topping) {
        this.topping = topping
    }

    isValid(grid: Grid, point: number): boolean {
        return !wu(grid.adjacentPoints(point).values()).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof House) && adjacentTile.topping == this.topping
        })
    }
}

export class House implements Tile {
    topping: Topping
    spawned = false
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(topping: Topping) {
        this.topping = topping
    }

    isValid(grid: Grid, point: number): boolean {
        return !wu(grid.adjacentPoints(point).values()).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof Pizza) && adjacentTile.topping == this.topping
        }) && (grid.filter((tile: Tile) => tile instanceof Pizza && tile.topping == this.topping) as Pizza[]).length == 1
    }
}

export class Teleporter implements Tile {
    nextPoint: number
    get ghost() { return false }
    set ghost(_: boolean) {}

    constructor(nextPoint: number) {
        this.nextPoint = nextPoint
    }

    isValid(grid: Grid, point: number): boolean {
        return point != this.nextPoint && grid.getOrBorder(this.nextPoint) instanceof Teleporter
    }
}

export class Grave implements Tile {
    ghost = true

    isValid = (grid: Grid, point: number) => true
}
