import type { Arrow, CellContent, Direction, GridCell, Position, Side } from './types'
import { getOpenSides, oppositeSide } from './types'

// ── Arrow creation ──────────────────────────────────────────────

export function createArrow(id: string, cells: readonly GridCell[], color: string): Arrow {
  return { id, cells, color }
}

// ── Arrow accessors ─────────────────────────────────────────────

export function getHead(arrow: Arrow): GridCell {
  return arrow.cells[0]
}

export function getHeadDirection(arrow: Arrow): Direction {
  const head = getHead(arrow)
  if (head.content.type !== 'head') {
    throw new Error(`Arrow ${arrow.id} first cell is not a head`)
  }
  return head.content.direction
}

export function getTail(arrow: Arrow): GridCell {
  return arrow.cells[arrow.cells.length - 1]
}

export function arrowLength(arrow: Arrow): number {
  return arrow.cells.length
}

// ── Segment connectivity ────────────────────────────────────────

/**
 * Returns the side through which a neighbor at the given relative position
 * would connect to this cell. Returns null if no connection possible.
 */
export function connectsSide(content: CellContent, side: Side): boolean {
  const openSides = getOpenSides(content)
  return openSides.includes(side)
}

/**
 * Checks if two adjacent cells are properly connected through matching open sides.
 * The shared wall must be an open side in both cells.
 */
export function areCellsConnected(cell: GridCell, neighbor: GridCell): boolean {
  const side = getSharedSide(cell, neighbor)
  if (!side) return false
  return connectsSide(cell.content, side) && connectsSide(neighbor.content, oppositeSide(side))
}

/**
 * Given two adjacent cells, returns the side of `cell` that faces `neighbor`.
 */
function getSharedSide(cell: GridCell, neighbor: GridCell): Side | null {
  const dr = neighbor.row - cell.row
  const dc = neighbor.col - cell.col

  if (dr === -1 && dc === 0) return 'top'
  if (dr === 1 && dc === 0) return 'bottom'
  if (dr === 0 && dc === -1) return 'left'
  if (dr === 0 && dc === 1) return 'right'
  return null // not adjacent
}

// ── Arrow validation ────────────────────────────────────────────

export function isValidArrow(arrow: Arrow): boolean {
  if (arrow.cells.length < 2) return false

  const head = arrow.cells[0]
  if (head.content.type !== 'head') return false

  // No curved heads
  for (const cell of arrow.cells) {
    if (cell.content.type === 'curve' && cell === head) return false
  }

  // All consecutive cells must be connected
  for (let i = 0; i < arrow.cells.length - 1; i++) {
    if (!areCellsConnected(arrow.cells[i], arrow.cells[i + 1])) return false
  }

  return true
}

// ── Arrow cell update helpers ───────────────────────────────────

/**
 * Returns a new arrow with cells at new positions, preserving content types.
 * Used by the snake movement system.
 */
export function updateArrowCells(arrow: Arrow, newCells: readonly GridCell[]): Arrow {
  return { ...arrow, cells: newCells }
}

/**
 * Returns all positions occupied by an arrow.
 */
export function arrowPositions(arrow: Arrow): readonly Position[] {
  return arrow.cells.map((c) => ({ row: c.row, col: c.col }))
}
