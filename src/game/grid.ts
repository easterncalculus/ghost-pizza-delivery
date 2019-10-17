import wu from 'wu'
import { Random } from 'random-js'

import { Direction } from './directions'
import { Topping } from './topping'

import { Game } from './game'
import { Player } from './player'
import * as Tiles from './tiles'


export class Grid extends Array<Tiles.Tile> {
    readonly width: number
    readonly height: number
    readonly random: Random
    readonly border = new Tiles.Border()

    constructor(width = 7, height = 7, random: Random = new Random()) {
        super()
        this.width = width
        this.height = height
        this.random = random

        for (let i = 0; i < width * height; i++) {
            this.push(new Tiles.Empty())
        }
    }

    pointFromXY = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null

        return (y * this.width) + x
    }

    pointToXY = (point: number) => {
        const y = Math.floor(point / this.width)
        const x = point - (y * this.width)

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
        return this[point ?? -1] ?? this.border
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
}

export function randomizeGameGrid(
    game: Game,
    {walls = 4, graves = 6, teleports = 3, monkey = 0, pigs = 0, crow = 0, manhole = 0} = {walls: 4, graves: 6, teleports: 3, monkey: 0, pigs: 0, crow: 0, manhole: 0}
) {
    const isAdjacentEmpty = (grid: Grid, point: number) => {
        const tile = grid.getOrBorder(point)
        return tile instanceof Tiles.Empty && !tile.safe &&
            wu(grid.adjacentPoints(point).values()).every((adjacentPoint) => {
                return grid.getOrBorder(adjacentPoint) instanceof Tiles.Empty
            })
    }

    const initPlayers = (grid: Grid, players: Player[]) => {
        if (players.length <= 1)
            throw new Error('Not enough players')

        players.forEach((player) => {
            const point = grid.randomPoint(([point, _]) => isAdjacentEmpty(grid, point))
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

    const pathToAllNodes = (grid: Grid, point: number, tile: Tiles.Tile, visitedPoints: Set<number>, ignorePoint: number) => {
        if (tile instanceof Tiles.Wall || ignorePoint == point || visitedPoints.has(point)) return visitedPoints

        visitedPoints.add(point)
        wu(grid.adjacentPoints(point).values()).forEach(adjacentPoint => {
            if (adjacentPoint == null) return
            
            pathToAllNodes(grid, adjacentPoint, grid.getOrBorder(adjacentPoint), visitedPoints, ignorePoint)
        })
        return visitedPoints
    }

    const areAllNodesVisitable = (grid: Grid, point: number) => {
        const allVisitableNodes = wu(grid.entries())
            .filter(([otherPoint, tile]) => !(tile instanceof Tiles.Wall || otherPoint == point))
            .map(([otherPoint, _]) => otherPoint)
            .toArray()
        if (allVisitableNodes.length == 0) return false

        const startPoint = allVisitableNodes[0]
        const allVisitedNodes = pathToAllNodes(grid, startPoint, grid.getOrBorder(startPoint), new Set(), point)
        return isSetsEqual(new Set(allVisitableNodes), allVisitedNodes)
    }

    const isSetsEqual = (a: Set<number>, b: Set<number>) => a.size === b.size && [...a].every(value => b.has(value));

    const initWalls = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe && areAllNodesVisitable(grid, randomPoint))
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

    const initMonkey = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Monkey()
        }
    }

    const initCrow = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Crow()
        }
    }

    const initPigs = (grid: Grid, count: number) => {
        if (count == 0) return

        const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe)
        grid[point] = new Tiles.Pig(true)
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.Pig(false)
        }
    }

    const initManhole = (grid: Grid, count: number) => {
        for (let _ = 0; _ < count; _++) {
            const point = grid.randomPoint(([randomPoint, tile]) => tile instanceof Tiles.Empty && !tile.safe)
            grid[point] = new Tiles.ManholeCover()
        }
    }

    const grid = game.grid
    const players = game.players

    initPlayers(grid, players)
    initPizza(grid, players.length)
    initGhosts(grid, graves)
    initWalls(grid, walls)
    initTeleporters(grid, teleports)
    initMonkey(grid, monkey)
    initCrow(grid, crow)
    initPigs(grid, pigs)
    initManhole(grid, manhole)
}