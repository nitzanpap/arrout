import { getHeadDirection } from './arrow'
import { getArrow, isInBounds } from './grid'
import type { GridState } from './types'
import { directionDelta } from './types'

export interface CellPosition {
  readonly row: number
  readonly col: number
}

/**
 * A track is the full path the arrow rides along during its slide animation.
 * Positions are ordered from tail to head, then extended beyond the head
 * in the head's direction until the entire arrow would be off-board.
 *
 * The animation is a sliding window over this track:
 * - At progress 0, the window covers positions [0, arrowLength-1] (original arrow)
 * - At progress N, the window has shifted N positions toward the head end
 * - Total steps = positions.length - arrowLength
 */
export interface ArrowTrack {
  readonly positions: readonly CellPosition[]
  readonly arrowLength: number
}

/**
 * Builds the track for an arrow's slide animation.
 *
 * The track consists of:
 * 1. The arrow's current cells in tail-to-head order
 * 2. Extensions beyond the head in the head's direction until
 *    the entire arrow has exited the board
 */
export function extractTrack(arrowId: string, initialState: GridState): ArrowTrack | null {
  const arrow = getArrow(initialState, arrowId)
  if (!arrow || arrow.cells.length === 0) return null

  const direction = getHeadDirection(arrow)
  const delta = directionDelta(direction)
  const arrowLength = arrow.cells.length

  // Arrow cells are head-first (cells[0] = head). Reverse to get tail-first.
  const tailToHead: CellPosition[] = [...arrow.cells].reverse().map((c) => ({
    row: c.row,
    col: c.col,
  }))

  // Extend beyond the head until the entire arrow would be off-board.
  // We need enough extensions so that even the tail (first element) exits.
  const head = tailToHead[arrowLength - 1]
  let extRow = head.row + delta.row
  let extCol = head.col + delta.col

  // Keep extending until we've added enough positions for the full arrow to exit.
  // The arrow exits when the tail (first visible position) is off-board.
  // At progress P, the tail is at track[P]. We need track[P] to be off-board.
  // P_max = positions.length - arrowLength, and tail = track[P_max].
  // So we need positions beyond the head until track has enough off-board entries.
  let offBoardCount = 0
  while (offBoardCount < arrowLength) {
    tailToHead.push({ row: extRow, col: extCol })
    if (!isInBounds(initialState, { row: extRow, col: extCol })) {
      offBoardCount++
    }
    extRow += delta.row
    extCol += delta.col
  }

  return { positions: tailToHead, arrowLength }
}
