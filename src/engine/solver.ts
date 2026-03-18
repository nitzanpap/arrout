import { canMove, executeMove } from './move'
import type { GridState } from './types'

// ── Solver result ───────────────────────────────────────────────

export interface SolveResult {
  readonly solvable: boolean
  readonly moves: readonly string[] // arrow IDs in solve order
}

// ── BFS Solver ──────────────────────────────────────────────────

/**
 * BFS solver that finds a sequence of moves to clear all arrows from the board.
 * Returns the move sequence if solvable, or { solvable: false } if not.
 *
 * @param grid - The initial grid state
 * @param maxStates - Maximum number of states to explore (prevents runaway on large grids)
 */
export function solve(grid: GridState, maxStates = 50_000): SolveResult {
  if (grid.arrows.length === 0) {
    return { solvable: true, moves: [] }
  }

  const visited = new Set<string>()
  const queue: Array<{ state: GridState; moves: string[] }> = [{ state: grid, moves: [] }]

  let explored = 0

  while (queue.length > 0 && explored < maxStates) {
    const current = queue.shift()
    if (!current) break
    explored++

    const hash = hashGridState(current.state)
    if (visited.has(hash)) continue
    visited.add(hash)

    // Try moving each arrow
    for (const arrow of current.state.arrows) {
      if (!canMove(arrow.id, current.state)) continue

      const result = executeMove(arrow.id, current.state)
      if (!result.success) continue

      const newMoves = [...current.moves, arrow.id]

      // Check if solved (all arrows removed)
      if (result.nextState.arrows.length === 0) {
        return { solvable: true, moves: newMoves }
      }

      const nextHash = hashGridState(result.nextState)
      if (!visited.has(nextHash)) {
        queue.push({ state: result.nextState, moves: newMoves })
      }
    }
  }

  return { solvable: false, moves: [] }
}

/**
 * Returns all arrow IDs that can currently move.
 */
export function getValidMoves(grid: GridState): readonly string[] {
  return grid.arrows.filter((arrow) => canMove(arrow.id, grid)).map((arrow) => arrow.id)
}

// ── State hashing ───────────────────────────────────────────────

/**
 * Creates a hash string for a grid state for visited-set deduplication.
 * Based on which arrows are present and their positions.
 */
function hashGridState(grid: GridState): string {
  // Sort arrows by ID for consistent hashing
  const sorted = [...grid.arrows].sort((a, b) => a.id.localeCompare(b.id))
  return sorted.map((a) => `${a.id}:${a.cells.map((c) => `${c.row},${c.col}`).join('|')}`).join(';')
}
