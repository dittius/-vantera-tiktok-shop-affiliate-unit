// Isometric projection helpers. Grid coordinates (col,row) are logical
// floor tiles; screen coordinates are SVG units within the office canvas.
export const TILE_W = 64
export const TILE_H = 32
export const GRID_COLS = 14
export const GRID_ROWS = 10

export interface TilePos {
  col: number
  row: number
}

export function toScreen({ col, row }: TilePos): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  }
}

export function depthOf({ col, row }: TilePos): number {
  return col + row
}

export const WALL_HEIGHT = 210

export const CANVAS = (() => {
  const minX = toScreen({ col: 0, row: GRID_ROWS - 1 }).x
  const maxX = toScreen({ col: GRID_COLS - 1, row: 0 }).x
  const maxY = toScreen({ col: GRID_COLS - 1, row: GRID_ROWS - 1 }).y
  const padX = 44
  return {
    minX: minX - TILE_W / 2 - padX,
    maxX: maxX + TILE_W / 2 + padX,
    minY: -WALL_HEIGHT - 34,
    maxY: maxY + TILE_H / 2 + 46,
  }
})()

export const CANVAS_WIDTH = CANVAS.maxX - CANVAS.minX
export const CANVAS_HEIGHT = CANVAS.maxY - CANVAS.minY
