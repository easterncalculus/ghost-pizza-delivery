import wu from 'wu'

import { Direction } from './directions'
import { Topping } from './topping'

import { Game } from './game'
import { Player } from './player'
import * as Tiles from './tiles'
import { Random } from 'random-js'


export class Grid extends Array<Tiles.Tile> {
    width: number
    height: number
    random: Random

    constructor(width = 7, height = 7) {
        super()
        this.width = width
        this.height = height
        this.random = new Random()

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < height; x++) {
                const point = this.pointFromXY(x, y)
                if (point == null) throw new Error()

                this.push(new Tiles.Empty())
            }
        }
    }

    pointFromXY = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null

        return (y * this.height) + x
    }

    pointToXY = (point: number) => {
        const y = Math.floor(point / this.height)
        const x = point - (y * this.height)

        return [x, y]
    }

    offsetPoint = (point: number, direction: Direction, offset = 1) => {
        const [x, y] = this.pointToXY(point)
        switch(direction) {
            case Direction.North:
                return this.pointFromXY(x, y - offset)
            case Direction.NorthEast:
                return this.pointFromXY(x + offset, y - offset)
            case Direction.East:
                return this.pointFromXY(x + offset, y)
            case Direction.SouthEast:
                return this.pointFromXY(x + offset, y + offset)
            case Direction.South:
                return this.pointFromXY(x, y + offset)
            case Direction.SouthWest:
                return this.pointFromXY(x - offset, y + offset)
            case Direction.West:
                return this.pointFromXY(x - offset, y)
            case Direction.NorthWest:
                return this.pointFromXY(x - offset, y - offset)
        }
    }

    isAdjacentEmpty = (point: number) => {
        const tile = this.getOrBorder(point)
        return tile instanceof Tiles.Empty && !tile.safe &&
            wu(this.adjacentPoints(point).values()).every((adjacentPoint) => {
                return this.getOrBorder(adjacentPoint) instanceof Tiles.Empty
            })
    }

    adjacentPoints = (point: number): Map<Direction, number | null> => {
        return new Map([
            [Direction.North, this.offsetPoint(point, Direction.North)],
            [Direction.East, this.offsetPoint(point, Direction.East)],
            [Direction.South, this.offsetPoint(point, Direction.South)],
            [Direction.West, this.offsetPoint(point, Direction.West)],
        ])
    }

    adjacentTiles = (point: number): Map<Direction, Tiles.Tile> => {
        return new Map(wu(this.adjacentPoints(point).entries())
            .map(([direction, point]) => [direction, this.getOrBorder(point)]))
    }

    surroundingPoints = (point: number): Map<Direction, number | null> => {
        return new Map([
            [Direction.North, this.offsetPoint(point, Direction.North)],
            [Direction.NorthEast, this.offsetPoint(point, Direction.NorthEast)],
            [Direction.East, this.offsetPoint(point, Direction.East)],
            [Direction.SouthEast, this.offsetPoint(point, Direction.SouthEast)],
            [Direction.South, this.offsetPoint(point, Direction.South)],
            [Direction.SouthWest, this.offsetPoint(point, Direction.SouthWest)],
            [Direction.West, this.offsetPoint(point, Direction.West)],
            [Direction.NorthWest, this.offsetPoint(point, Direction.NorthWest)],
        ])
    }

    surroundingTiles = (point: number): Map<Direction, Tiles.Tile> => {
        return new Map(wu(this.surroundingPoints(point).entries())
            .map(([direction, point]) => [direction, this.getOrBorder(point)]))
    }
    
    getOrBorder = (point: number | null) => {
        return point ? this[point] : null ?? new Tiles.Border()
    }

    randomPoint = (condition: ([point, tile]: [number, Tiles.Tile]) => boolean) => {
        const values: [number, Tiles.Tile][] = wu(this.entries()).filter(condition).toArray()
        if (values.length == 0)
            throw new Error('Could not find point')

        return this.random.pick(values)[0]
    }

    isValid = (players: Player[]) => {
        const startTiles: Player[] = (this.filter(tile => tile instanceof Tiles.Start) as Tiles.Start[])
            .map((tile: Tiles.Start) => tile.player)
        return this.every((tile, point) => tile.isValid(this, point)) &&
            players.every(player => startTiles.includes(player))
    }

    spawnHouse = (topping: Topping) => {
        const housePoint = this.findIndex(tile => tile instanceof Tiles.House && tile.topping == topping)
        const houseTile = this[housePoint]
        if (!(houseTile instanceof Tiles.House)) throw new Error()

        this.surroundingPoints(housePoint).forEach((point) => {
            if (point == null) return

            const tile = this.getOrBorder(point)
            if (!(tile instanceof Tiles.Grave)) {
                tile.ghost = true
            }
        })
        houseTile.spawned = true
    }
}

export function randomizeGameGrid(game: Game, walls = 4, graves = 6, teleports = 3) {
    const initPlayers = (grid: Grid, players: Player[]) => {
        if (players.length <= 1)
            throw new Error('Not enough players')

        players.forEach((player) => {
            const point = grid.randomPoint(([point, _]) => grid.isAdjacentEmpty(point))
            player.point = point

            grid[point] = new Tiles.Start(player)
            grid.adjacentTiles(point).forEach((tile) => {
                if (tile instanceof Tiles.Empty) {
                    tile.safe = true
                } else {
                    throw new Error()
                }
            })
        })
    }

    const initPizza = (grid: Grid, count: number) => {
        let toppings = Object.values(Topping)
            .filter(k => typeof k === 'string')
            .map((k: any) => <Topping><unknown>Topping[k])
        if (toppings.length != count)
            throw new Error('Not enough toppings')

        toppings
            .filter((_, index) => index < count)
            .forEach((topping) => {
                const pizzaPoint = grid.randomPoint(([_, tile]) => tile instanceof Tiles.Empty && !tile.safe)
                grid[pizzaPoint] = new Tiles.Pizza(topping)
                
                const housePoint = grid.randomPoint(([point, tile]) => {
                    return tile instanceof Tiles.Empty && !tile.safe &&
                        !wu(grid.adjacentPoints(point).values()).has(pizzaPoint)
                })
                grid[housePoint] = new Tiles.House(topping)
            })
    }

    const initGhosts = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([_, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Grave()
        }
    }

    const initWalls = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([_, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Wall()
        }
    }

    const initTeleporters = (grid: Grid, count: number) => {
        if (count == 1)
            throw new Error('Can\'t have only 1 teleporter')

        const firstPoint = grid.randomPoint(([_, tile]) => tile instanceof Tiles.Empty && !tile.safe)
        let nextPoint = firstPoint
        for (let _ = 0; _ < count - 1; _++) {
            const point = nextPoint
            nextPoint = grid.randomPoint(([_, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Teleporter(nextPoint)
        }
        grid[nextPoint] = new Tiles.Teleporter(firstPoint)
    }

    const grid = game.grid
    const players = game.players

    initPlayers(grid, players)
    initPizza(grid, players.length)
    initGhosts(grid, graves)
    initWalls(grid, walls)
    initTeleporters(grid, teleports)
}