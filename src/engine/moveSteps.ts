import { getHeadDirection } from './arrow'
import { getArrow } from './grid'
import type { GridState } from './types'
import { directionDelta } from './types'

export interface CellPosition {
  readonly row: number
  readonly col: number
}

export interface StepPositions {
  readonly positions: readonly CellPosition[]
}

/**
 * Computes per-step cell positions for a snake-style slide animation.
 * Unlike executeMoveSteps, this keeps ALL cell positions including those
 * that have exited the board, so the arrow smoothly slides off-screen
 * rather than shrinking at the edge.
 *
 * Step 0 = initial position. Each subsequent step advances the snake by one cell.
 * Continues until every cell is off-board.
 */
export function extractStepPositions(
  arrowId: string,
  initialState: GridState
): readonly StepPositions[] {
  const arrow = getArrow(initialState, arrowId)
  if (!arrow) return []

  const direction = getHeadDirection(arrow)
  const delta = directionDelta(direction)

  // Start with the arrow's current cell positions
  let positions: CellPosition[] = arrow.cells.map((c) => ({ row: c.row, col: c.col }))

  const allSteps: StepPositions[] = [{ positions: [...positions] }]

  const isAnyOnBoard = (cells: CellPosition[]): boolean =>
    cells.some(
      (c) => c.row >= 0 && c.row < initialState.height && c.col >= 0 && c.col < initialState.width
    )

  // Simulate snake movement: head moves forward, each body cell takes
  // the previous position of the cell ahead of it
  while (isAnyOnBoard(positions)) {
    const newPositions: CellPosition[] = []

    // Head advances in its direction
    newPositions.push({
      row: positions[0].row + delta.row,
      col: positions[0].col + delta.col,
    })

    // Body segments: each moves to where the segment ahead was
    for (let i = 1; i < positions.length; i++) {
      newPositions.push({
        row: positions[i - 1].row,
        col: positions[i - 1].col,
      })
    }

    positions = newPositions
    allSteps.push({ positions: [...positions] })
  }

  return allSteps
}
