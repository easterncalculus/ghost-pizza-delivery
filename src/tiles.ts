import { Player } from './player'
import { Point, Grid, Topping } from './grid'

export interface Tile {
    isValid(grid: Grid, point: Point): boolean
}

export class Empty implements Tile {
    isValid = (grid: Grid, point: Point) => true
}

export class Safe extends Empty {}

export class Start implements Tile {
    player: Player
    constructor(player: Player) {
        this.player = player
    }

    isValid(grid: Grid, point: Point): boolean {
        return grid.adjacentPoints(point)
            .every((adjacentPoint) => grid.getOrBorder(adjacentPoint) instanceof Empty)
    }
}

export class Wall implements Tile {
    isValid = (grid: Grid, point: Point) => true
}

export class Pizza implements Tile {
    topping: Topping
    found: false

    constructor(topping: Topping) {
        this.topping = topping
    }

    isValid(grid: Grid, point: Point): boolean {
        return !grid.adjacentPoints(point).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof House) && adjacentTile.topping == this.topping
        })
    }
}

export class House implements Tile {
    topping: Topping
    spawned = false

    constructor(topping: Topping) {
        this.topping = topping
    }

    isValid(grid: Grid, point: Point): boolean {
        return !grid.adjacentPoints(point).some((adjacentPoint) => {
            const adjacentTile = grid.getOrBorder(adjacentPoint)
            return (adjacentTile instanceof Pizza) && adjacentTile.topping == this.topping
        }) && (grid.values().filter((tile: Tile) => tile instanceof Pizza && tile.topping == this.topping) as Pizza[]).length == 1
    }
}

export class Teleporter implements Tile {
    nextPoint: Point
    constructor(nextPoint: Point) {
        this.nextPoint = nextPoint
    }

    isValid(grid: Grid, point: Point): boolean {
        return point != this.nextPoint && grid.getOrBorder(this.nextPoint) instanceof Teleporter
    }
}

export class Ghost implements Tile {
    spawned = true

    despawn = () => {
        this.spawned = false
    }

    isValid = (grid: Grid, point: Point) => true
}

export class Grave extends Ghost {
    spawned = true
}
