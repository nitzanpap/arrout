import type { Arrow, CellContent, Direction, GridCell, GridState, Position } from './types'
import { directionDelta } from './types'

// ── Grid creation ───────────────────────────────────────────────

export function createGrid(width: number, height: number): GridState {
  const cells: GridCell[][] = []
  for (let row = 0; row < height; row++) {
    const rowCells: GridCell[] = []
    for (let col = 0; col < width; col++) {
      rowCells.push({
        row,
        col,
        content: { type: 'empty' },
        arrowId: null,
      })
    }
    cells.push(rowCells)
  }
  return { width, height, cells, arrows: [] }
}

// ── Cell accessors ──────────────────────────────────────────────

export function isInBounds(grid: GridState, pos: Position): boolean {
  return pos.row >= 0 && pos.row < grid.height && pos.col >= 0 && pos.col < grid.width
}

export function getCell(grid: GridState, pos: Position): GridCell | null {
  if (!isInBounds(grid, pos)) return null
  return grid.cells[pos.row][pos.col]
}

export function isEmpty(grid: GridState, pos: Position): boolean {
  const cell = getCell(grid, pos)
  if (!cell) return false
  return cell.content.type === 'empty'
}

// ── Cell mutation (immutable) ───────────────────────────────────

export function setCell(
  grid: GridState,
  pos: Position,
  content: CellContent,
  arrowId: string | null
): GridState {
  if (!isInBounds(grid, pos)) return grid
  const newCells = grid.cells.map((rowCells, r) => {
    if (r !== pos.row) return rowCells
    return rowCells.map((cell, c) => {
      if (c !== pos.col) return cell
      return { ...cell, content, arrowId }
    })
  })
  return { ...grid, cells: newCells, arrows: grid.arrows }
}

// ── Arrow placement ─────────────────────────────────────────────

export function placeArrow(grid: GridState, arrow: Arrow): GridState {
  let state = grid
  for (const cell of arrow.cells) {
    state = setCell(state, { row: cell.row, col: cell.col }, cell.content, arrow.id)
  }
  return {
    ...state,
    arrows: [...state.arrows, arrow],
  }
}

export function removeArrow(grid: GridState, arrowId: string): GridState {
  const arrow = grid.arrows.find((a) => a.id === arrowId)
  if (!arrow) return grid

  let state = grid
  for (const cell of arrow.cells) {
    if (isInBounds(state, { row: cell.row, col: cell.col })) {
      state = setCell(state, { row: cell.row, col: cell.col }, { type: 'empty' }, null)
    }
  }
  return {
    ...state,
    arrows: state.arrows.filter((a) => a.id !== arrowId),
  }
}

// ── Position helpers ────────────────────────────────────────────

export function positionAhead(pos: Position, direction: Direction): Position {
  const delta = directionDelta(direction)
  return { row: pos.row + delta.row, col: pos.col + delta.col }
}

export function cellAhead(pos: Position, direction: Direction, grid: GridState): GridCell | null {
  const ahead = positionAhead(pos, direction)
  return getCell(grid, ahead)
}

export function isEdge(grid: GridState, pos: Position, direction: Direction): boolean {
  const ahead = positionAhead(pos, direction)
  return !isInBounds(grid, ahead)
}

export function getArrow(grid: GridState, arrowId: string): Arrow | null {
  return grid.arrows.find((a) => a.id === arrowId) ?? null
}
