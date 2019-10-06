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

export type OrthogonalDirections = Direction.North | Direction.East | Direction.South | Direction.West
export type DiagonalDirections = Direction.NorthEast | Direction.SouthEast | Direction.SouthWest | Direction.NorthWest
