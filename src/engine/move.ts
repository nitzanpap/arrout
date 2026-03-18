import { getHeadDirection } from './arrow'
import { getArrow, getCell, isInBounds, placeArrow, removeArrow } from './grid'
import type { Arrow, Direction, GridCell, GridState, MoveResult, MoveStepsResult } from './types'
import { directionDelta } from './types'

// ── Public API ──────────────────────────────────────────────────

/**
 * Checks whether an arrow can begin moving.
 * An arrow can move if the cell immediately ahead of its head is empty or off-board.
 */
export function canMove(arrowId: string, grid: GridState): boolean {
  const arrow = getArrow(grid, arrowId)
  if (!arrow) return false

  const head = arrow.cells[0]
  const direction = getHeadDirection(arrow)
  const delta = directionDelta(direction)
  const aheadPos = { row: head.row + delta.row, col: head.col + delta.col }

  // Off board = valid (arrow will exit)
  if (!isInBounds(grid, aheadPos)) return true

  const ahead = getCell(grid, aheadPos)
  if (!ahead) return true
  return ahead.content.type === 'empty'
}

/**
 * Returns intermediate grid states for each step of the arrow's movement.
 * Valid moves: steps show the arrow sliding forward until it exits the board.
 * Invalid moves: steps show a brief forward bump then reverse back to original position.
 */
export function executeMoveSteps(arrowId: string, state: GridState): MoveStepsResult {
  if (!canMove(arrowId, state)) {
    return {
      success: false,
      steps: [state],
      heartLost: true,
      arrowId,
    }
  }

  const arrow = getArrow(state, arrowId)
  if (!arrow) {
    return { success: false, steps: [state], heartLost: true, arrowId }
  }

  const direction = getHeadDirection(arrow)
  const steps: GridState[] = []

  let current = state
  let currentArrow = getArrow(current, arrowId)

  while (currentArrow && currentArrow.cells.length > 0) {
    current = stepSnakeForward(currentArrow, direction, current)
    steps.push(current)
    currentArrow = getArrow(current, arrowId)
  }

  return {
    success: true,
    steps,
    heartLost: false,
    arrowId,
  }
}

/**
 * Executes a move for the given arrow (convenience wrapper).
 * Returns the final state after all steps complete.
 */
export function executeMove(arrowId: string, state: GridState): MoveResult {
  const result = executeMoveSteps(arrowId, state)
  const finalState = result.steps.length > 0 ? result.steps[result.steps.length - 1] : state

  return {
    success: result.success,
    nextState: finalState,
    arrowRemoved: result.success,
    heartLost: result.heartLost,
  }
}

// ── Internal ────────────────────────────────────────────────────

/**
 * Advances the snake by one step:
 * 1. Head moves one cell in its direction
 * 2. Each body segment moves to where the segment ahead of it was
 * 3. The tail is dropped off the back
 *
 * If the head moves off-board, the arrow shrinks from the front.
 * The arrow is fully removed when no cells remain on the board.
 */
function stepSnakeForward(arrow: Arrow, direction: Direction, state: GridState): GridState {
  const delta = directionDelta(direction)

  // Clear all current arrow cells from the grid
  const grid = removeArrow(state, arrow.id)

  const oldCells = arrow.cells

  // Head advances in its direction
  const newHead: GridCell = {
    ...oldCells[0],
    row: oldCells[0].row + delta.row,
    col: oldCells[0].col + delta.col,
  }

  // Body segments: each moves to where the segment ahead was
  const newBody: GridCell[] = []
  for (let i = 1; i < oldCells.length; i++) {
    newBody.push({
      ...oldCells[i],
      row: oldCells[i - 1].row,
      col: oldCells[i - 1].col,
    })
  }

  const allNewCells = [newHead, ...newBody]

  // Filter to only cells that are still on the board
  const onBoardCells = allNewCells.filter((cell) =>
    isInBounds(grid, { row: cell.row, col: cell.col })
  )

  if (onBoardCells.length === 0) {
    // Arrow fully exited
    return grid
  }

  // Place the updated arrow back on the grid
  const updatedArrow: Arrow = {
    ...arrow,
    cells: onBoardCells,
  }

  return placeArrow(grid, updatedArrow)
}
