import { getHeadDirection } from './arrow'
import { getArrow, getCell, isInBounds, placeArrow, removeArrow } from './grid'
import type { Arrow, Direction, GridCell, GridState, MoveResult, MoveStepsResult } from './types'
import { directionDelta } from './types'

// ── Debug logging ──────────────────────────────────────────────

const DEBUG = typeof __DEV__ !== 'undefined' && __DEV__

function debugLog(tag: string, ...args: unknown[]) {
  if (DEBUG) {
    console.debug(`[move:${tag}]`, ...args)
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Checks whether an arrow can fully slide off the board.
 * Every cell from the head to the board edge (in the head's direction)
 * must be empty or part of the arrow itself.
 */
export function canMove(arrowId: string, grid: GridState): boolean {
  const arrow = getArrow(grid, arrowId)
  if (!arrow) {
    debugLog('canMove', `arrow ${arrowId} not found`)
    return false
  }

  const head = arrow.cells[0]
  const direction = getHeadDirection(arrow)
  const delta = directionDelta(direction)

  // Build set of cells owned by this arrow (they vacate as it slides)
  const arrowCellKeys = new Set(arrow.cells.map((c) => `${c.row},${c.col}`))

  // Walk from head+1 all the way to the board edge
  let checkRow = head.row + delta.row
  let checkCol = head.col + delta.col

  while (isInBounds(grid, { row: checkRow, col: checkCol })) {
    if (!arrowCellKeys.has(`${checkRow},${checkCol}`)) {
      const cell = getCell(grid, { row: checkRow, col: checkCol })
      if (cell && cell.content.type !== 'empty') {
        debugLog(
          'canMove',
          `arrow ${arrowId} blocked at (${checkRow},${checkCol}) by ${cell.content.type}` +
            (cell.arrowId ? ` [arrow: ${cell.arrowId}]` : '')
        )
        return false
      }
    }
    checkRow += delta.row
    checkCol += delta.col
  }

  debugLog('canMove', `arrow ${arrowId} path clear, direction=${direction}`)
  return true
}

/**
 * Returns intermediate grid states for each step of the arrow's movement.
 * Valid moves: steps show the arrow sliding forward until it exits the board.
 * Invalid moves: steps show a brief forward bump then reverse back to original position.
 */
export function executeMoveSteps(arrowId: string, state: GridState): MoveStepsResult {
  if (!canMove(arrowId, state)) {
    debugLog('executeMoveSteps', `arrow ${arrowId} cannot move — returning invalid`)
    return {
      success: false,
      steps: [state],
      heartLost: true,
      arrowId,
    }
  }

  const arrow = getArrow(state, arrowId)
  if (!arrow) {
    debugLog('executeMoveSteps', `arrow ${arrowId} not found in state`)
    return { success: false, steps: [state], heartLost: true, arrowId }
  }

  const direction = getHeadDirection(arrow)
  const steps: GridState[] = []

  let current = state
  let currentArrow = getArrow(current, arrowId)

  debugLog(
    'executeMoveSteps',
    `starting slide for ${arrowId}, direction=${direction}, cells=${arrow.cells.length}`
  )

  while (currentArrow && currentArrow.cells.length > 0) {
    current = stepSnakeForward(currentArrow, direction, current)
    steps.push(current)
    currentArrow = getArrow(current, arrowId)
    debugLog(
      'executeMoveSteps',
      `step ${steps.length}: remaining cells=${currentArrow?.cells.length ?? 0}`
    )
  }

  debugLog('executeMoveSteps', `arrow ${arrowId} exited in ${steps.length} steps`)

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

/**
 * Computes how many cells the arrow needs to travel to fully exit the board.
 * This is the distance from the head to the board edge plus the arrow's length.
 * Multiply by cellSize to get pixel distance for smooth animation.
 */
export function computeSlideDistanceCells(arrowId: string, state: GridState): number {
  const arrow = getArrow(state, arrowId)
  if (!arrow) return 0

  const direction = getHeadDirection(arrow)
  const head = arrow.cells[0]
  const delta = directionDelta(direction)

  let distance = 0
  let row = head.row + delta.row
  let col = head.col + delta.col

  while (isInBounds(state, { row, col })) {
    distance++
    row += delta.row
    col += delta.col
  }

  return distance + arrow.cells.length
}

/**
 * Computes how many empty cells lie between the arrow's head and the first
 * blocking obstacle (another arrow's cell or the board edge).
 * Returns 0 if the blocker is immediately adjacent to the head.
 * Only meaningful for invalid moves — for valid moves use computeSlideDistanceCells.
 */
export function computeDistanceToBlocker(arrowId: string, grid: GridState): number {
  const arrow = getArrow(grid, arrowId)
  if (!arrow) return 0

  const head = arrow.cells[0]
  const direction = getHeadDirection(arrow)
  const delta = directionDelta(direction)

  const arrowCellKeys = new Set(arrow.cells.map((c) => `${c.row},${c.col}`))

  let distance = 0
  let row = head.row + delta.row
  let col = head.col + delta.col

  while (isInBounds(grid, { row, col })) {
    if (!arrowCellKeys.has(`${row},${col}`)) {
      const cell = getCell(grid, { row, col })
      if (cell && cell.content.type !== 'empty') {
        return distance
      }
      distance++
    }
    row += delta.row
    col += delta.col
  }

  // No blocker found before edge — path is clear (shouldn't happen for invalid moves)
  return distance
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
