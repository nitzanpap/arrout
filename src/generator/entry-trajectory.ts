import { isInBounds } from '../engine/grid'
import type { Arrow, Direction, GridState, Position } from '../engine/types'
import { directionDelta, oppositeDirection } from '../engine/types'

/**
 * Computes the entry trajectory of an arrow entering the board from outside.
 * This is the reverse of the snake exit: simulate the arrow moving BACKWARDS
 * (opposite direction) until it's fully outside the board.
 *
 * Returns all intermediate frames — each frame is the set of cells occupied at that step.
 */
export function computeEntryTrajectory(
  arrow: Arrow,
  grid: GridState
): readonly (readonly Position[])[] {
  const direction = getArrowDirection(arrow)
  const reverseDir = oppositeDirection(direction)
  const delta = directionDelta(reverseDir)

  const frames: Position[][] = []
  let currentCells = arrow.cells.map((c) => ({ row: c.row, col: c.col }))

  // Move backwards until the entire arrow is off-board
  while (anyOnBoard(currentCells, grid)) {
    // Shift all cells in the reverse direction (snake backward)
    // The tail advances backward, each segment takes the position of the one behind it
    const newCells: Position[] = []
    // Last cell (tail) moves one step backward
    const tail = currentCells[currentCells.length - 1]
    newCells.push({ row: tail.row + delta.row, col: tail.col + delta.col })
    // Each other cell takes the position of the cell after it (toward tail)
    for (let i = currentCells.length - 2; i >= 0; i--) {
      newCells.push({ row: currentCells[i + 1].row, col: currentCells[i + 1].col })
    }
    newCells.reverse()

    currentCells = newCells
    frames.push([...currentCells])
  }

  return frames
}

/**
 * Checks if an arrow's entry trajectory is clear of other arrows.
 * All cells the arrow passes through during entry (excluding its final resting position)
 * must be empty in the current grid.
 */
export function entryPathIsClear(arrow: Arrow, grid: GridState): boolean {
  const trajectory = computeEntryTrajectory(arrow, grid)

  for (const frame of trajectory) {
    for (const pos of frame) {
      if (!isInBounds(grid, pos)) continue
      const cell = grid.cells[pos.row][pos.col]
      if (cell.content.type !== 'empty') return false
    }
  }

  return true
}

// ── Helpers ─────────────────────────────────────────────────────

function getArrowDirection(arrow: Arrow): Direction {
  const head = arrow.cells[0]
  if (head.content.type !== 'head') {
    throw new Error('Arrow first cell is not a head')
  }
  return head.content.direction
}

function anyOnBoard(positions: readonly Position[], grid: GridState): boolean {
  return positions.some((p) => isInBounds(grid, p))
}
