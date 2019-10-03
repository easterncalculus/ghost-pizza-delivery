import { Player } from './player'
import * as Tiles from './tiles'
import { Map, Record, Repeat } from 'immutable'
import * as Extendable from 'extendable-immutable'
import { Game } from './game'


export enum Topping {
    Shrimp,
    Vegtables,
    Cheese,
}

export enum Direction {
    North = 1,
    East = 2,
    South = 4,
    West = 8,
    NorthEast = 3,
    SouthEast = 6,
    NorthWest = 9,
    SouthWest = 12,
}

export type OrthologicalDirections = Direction.North | Direction.East | Direction.South | Direction.West
export type DiagonalDirections = Direction.NorthEast | Direction.SouthEast | Direction.SouthWest | Direction.NorthWest

export class Point extends Record({x: 0, y: 0}) {
    constructor(x: number, y: number) {
        super({x, y})
    }

    offsetDirection(direction: Direction, offset = 1) {
        switch(direction) {
            case Direction.North:
                return new Point(this.x, this.y - offset)
            case Direction.NorthEast:
                return new Point(this.x + offset, this.y - offset)
            case Direction.East:
                return new Point(this.x + offset, this.y)
            case Direction.SouthEast:
                return new Point(this.x + offset, this.y + offset)
            case Direction.South:
                return new Point(this.x, this.y + offset)
            case Direction.SouthWest:
                return new Point(this.x - offset, this.y + offset)
            case Direction.West:
                return new Point(this.x - offset, this.y)
            case Direction.NorthWest:
                return new Point(this.x - offset, this.y - offset)
        }
    }
}

export class Grid extends Extendable.Map<Point, Tiles.Tile> {
    width: number
    height: number

    emptyTile = new Tiles.Empty()
    borderTile = new Tiles.Wall()
    safeTile = new Tiles.Safe()

    constructor(width = 7, height = 7) {
        super()
        this.width = width
        this.height = height

        Repeat(width).forEach(x => {
            Repeat(height).forEach(y => {
                this.set(new Point(x, y), this.emptyTile)
            })
        })
    }

    isAdjacentEmpty = (point: Point) => {
        return this.getOrBorder(point) == this.emptyTile &&
            this.adjacentPoints(point).every((adjacentPoint) => {
                return this.getOrBorder(adjacentPoint) instanceof Tiles.Empty
            })
    }

    adjacentPoints = (point: Point): Map<Direction, Point> => {
        return Map([
            [Direction.North, point.offsetDirection(Direction.North)],
            [Direction.East, point.offsetDirection(Direction.East)],
            [Direction.South, point.offsetDirection(Direction.South)],
            [Direction.West, point.offsetDirection(Direction.West)],
        ])
    }

    adjacentTiles = (point: Point): Map<Direction, Tiles.Tile> => {
        return this.adjacentPoints(point)
            .mapEntries(([direction, point]) => [direction, this.getOrBorder(point)])
    }

    surroundingPoints = (point: Point): Map<Direction, Point> => {
        return Map([
            [Direction.North, point.offsetDirection(Direction.North)],
            [Direction.NorthEast, point.offsetDirection(Direction.NorthEast)],
            [Direction.East, point.offsetDirection(Direction.East)],
            [Direction.SouthEast, point.offsetDirection(Direction.SouthEast)],
            [Direction.South, point.offsetDirection(Direction.South)],
            [Direction.SouthWest, point.offsetDirection(Direction.SouthWest)],
            [Direction.West, point.offsetDirection(Direction.West)],
            [Direction.NorthWest, point.offsetDirection(Direction.NorthWest)],
        ])
    }

    surroundingTiles = (point: Point): Map<Direction, Tiles.Tile> => {
        return this.surroundingPoints(point)
            .mapEntries(([direction, point]) => [direction, this.getOrBorder(point)])
    }
    
    getOrBorder = (point: Point) => {
        return this.get(point) || this.borderTile
    }

    randomPoint = (condition: ([point, tile]: [Point, Tiles.Tile]) => boolean) => {
        const values: [Point, Tiles.Tile][] = this.filter(condition)
        if (values.length == 0)
            throw new Error('Could not find point')

        return values[Math.floor(Math.random() * values.length)][0]
    }

    isValid = (players: Player[]) => {
        const startTiles: Player[] = this.filter(tile => tile instanceof Tiles.Start)
            .map((tile: Tiles.Start) => tile.player)
        return this.every((tile, point) => tile.isValid(point)) &&
            players.every(player => startTiles.includes(player))
    }

    spawnHouse = (topping: Topping) => {
        const housePoint = this.find(tile => tile instanceof Tiles.House && tile.topping == topping)
        const houseTile = this.get(housePoint)

        this.surroundingPoints(housePoint).forEach((point) => {
            const tile = this.getOrBorder(point)
            if (tile instanceof Tiles.Empty) {
                this.set(point, new Tiles.Ghost())
            } else if (tile instanceof Tiles.Ghost) {
                tile.spawned = true
            }
        })
        houseTile.spawned = true
    }
}

export function randomizeGrid(game: Game, walls = 4, graves = 6, teleports = 3) {
    const initPlayers = (grid: Grid, players: Player[]) => {
        if (players.length <= 1)
            throw new Error('Not enough players')

        players.forEach((player) => {
            const point = grid.randomPoint(([point, _]) => grid.isAdjacentEmpty(point))
            player.point = point

            grid.set(point, new Tiles.Start(player))
            grid.adjacentPoints(point).forEach((adjacentPoint) => {
                grid.set(adjacentPoint, grid.safeTile)
            })
        })
    }

    const initPizza = (grid: Grid, count: number) => {
        const toppings = (Object.values(Topping) as Topping[])
        if (toppings.length != count)
            throw new Error('Not enough toppings')

        toppings
            .filter((_, index) => index < count)
            .forEach((topping) => {
                const pizzaPoint = grid.randomPoint(([point, tile]) => tile == grid.emptyTile)
                grid.set(pizzaPoint, new Tiles.Pizza(topping))
                
                const housePoint = grid.randomPoint(([point, tile]) => {
                    return tile == grid.emptyTile &&
                        !grid.adjacentPoints(point).includes(pizzaPoint)
                })
                grid.set(housePoint, new Tiles.House(topping))
            })
    }

    const initGhosts = (grid: Grid, count: number) => {
        Repeat(count).forEach(_ => {
            const point = grid.randomPoint(([_, tile]) => tile == grid.emptyTile)
            grid.set(point, new Tiles.Grave())
        })
    }

    const initWalls = (grid: Grid, count: number) => {
        Repeat(count).forEach(_ => {
            const point = grid.randomPoint(([_, tile]) => tile == grid.emptyTile)
            grid.set(point, new Tiles.Wall())
        })
    }

    const initTeleporters = (grid: Grid, count: number) => {
        if (count == 1)
            throw new Error('Can\'t have only 1 teleporter')

        const firstPoint = grid.randomPoint(([_, tile]) => tile == grid.emptyTile)
        let nextPoint = firstPoint
        Repeat(count - 1).forEach(_ => {
            const point = nextPoint
            nextPoint = grid.randomPoint(([_, tile]) => tile == grid.emptyTile)
            grid.set(point, new Tiles.Teleporter(nextPoint))
        })
        grid.set(nextPoint, new Tiles.Teleporter(firstPoint))
    }

    const grid = game.grid
    const players = game.players

    initPlayers(grid, players)
    initPizza(grid, players.length)
    initGhosts(grid, graves)
    initWalls(grid, walls)
    initTeleporters(grid, teleports)
}