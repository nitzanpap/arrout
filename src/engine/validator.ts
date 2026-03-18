import { areCellsConnected } from './arrow'
import { getCell, isInBounds } from './grid'
import type { Arrow, GridState } from './types'
import { directionDelta } from './types'

// ── Validation result ───────────────────────────────────────────

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

// ── Structural validation ───────────────────────────────────────

export function validateStructure(grid: GridState): ValidationResult {
  const errors: string[] = []

  for (const arrow of grid.arrows) {
    // Must have at least 2 cells
    if (arrow.cells.length < 2) {
      errors.push(`Arrow ${arrow.id}: must have at least 2 cells`)
    }

    // First cell must be a head
    if (arrow.cells[0].content.type !== 'head') {
      errors.push(`Arrow ${arrow.id}: first cell must be a head`)
    }

    // No curved heads
    for (const cell of arrow.cells) {
      if (cell.content.type === 'curve' && cell === arrow.cells[0]) {
        errors.push(`Arrow ${arrow.id}: head cannot be a curve`)
      }
    }

    // Consecutive cells must be connected
    for (let i = 0; i < arrow.cells.length - 1; i++) {
      if (!areCellsConnected(arrow.cells[i], arrow.cells[i + 1])) {
        errors.push(`Arrow ${arrow.id}: cells ${i} and ${i + 1} are not connected`)
      }
    }

    // Each cell must belong to at most one arrow (check grid)
    for (const cell of arrow.cells) {
      const gridCell = getCell(grid, { row: cell.row, col: cell.col })
      if (gridCell && gridCell.arrowId !== null && gridCell.arrowId !== arrow.id) {
        errors.push(
          `Arrow ${arrow.id}: cell (${cell.row},${cell.col}) occupied by ${gridCell.arrowId}`
        )
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// ── Deadlock detection ──────────────────────────────────────────

/**
 * Detects facing-heads deadlock: two arrowheads pointing directly at each other
 * on the same axis, regardless of what lies between them.
 */
export function detectFacingHeads(grid: GridState): readonly [string, string][] {
  const deadlocks: [string, string][] = []
  const arrows = grid.arrows

  for (let i = 0; i < arrows.length; i++) {
    for (let j = i + 1; j < arrows.length; j++) {
      if (areFacingHeads(arrows[i], arrows[j])) {
        deadlocks.push([arrows[i].id, arrows[j].id])
      }
    }
  }

  return deadlocks
}

function areFacingHeads(a: Arrow, b: Arrow): boolean {
  const headA = a.cells[0]
  const headB = b.cells[0]

  if (headA.content.type !== 'head' || headB.content.type !== 'head') return false

  const dirA = headA.content.direction
  const dirB = headB.content.direction

  // Same row, facing each other horizontally
  if (headA.row === headB.row) {
    if (dirA === 'RIGHT' && dirB === 'LEFT' && headA.col < headB.col) return true
    if (dirA === 'LEFT' && dirB === 'RIGHT' && headA.col > headB.col) return true
  }

  // Same column, facing each other vertically
  if (headA.col === headB.col) {
    if (dirA === 'DOWN' && dirB === 'UP' && headA.row < headB.row) return true
    if (dirA === 'UP' && dirB === 'DOWN' && headA.row > headB.row) return true
  }

  return false
}

// ── Circular dependency detection ───────────────────────────────

/**
 * Builds a dependency graph where an edge A -> B means
 * "A is blocked by B" (B's cells are in the path ahead of A's head).
 * Detects cycles in this graph.
 */
export function detectCircularDeadlocks(grid: GridState): boolean {
  const graph = buildDependencyGraph(grid)
  return hasCycle(graph)
}

export function buildDependencyGraph(grid: GridState): ReadonlyMap<string, readonly string[]> {
  const deps = new Map<string, string[]>()

  for (const arrow of grid.arrows) {
    deps.set(arrow.id, [])
  }

  for (const arrow of grid.arrows) {
    const blockers = findBlockers(arrow, grid)
    deps.set(arrow.id, blockers)
  }

  return deps
}

/**
 * Finds which arrows block the given arrow.
 * Checks the FULL exit path from the head to the board edge.
 * Any other arrow's cells in the exit path are blockers.
 */
function findBlockers(arrow: Arrow, grid: GridState): string[] {
  const head = arrow.cells[0]
  if (head.content.type !== 'head') return []

  const delta = directionDelta(head.content.direction)
  const blockers = new Set<string>()

  let current = { row: head.row + delta.row, col: head.col + delta.col }
  while (isInBounds(grid, current)) {
    const cell = getCell(grid, current)
    if (cell?.arrowId && cell.arrowId !== arrow.id) {
      blockers.add(cell.arrowId)
    }
    current = { row: current.row + delta.row, col: current.col + delta.col }
  }

  return [...blockers]
}

function hasCycle(graph: ReadonlyMap<string, readonly string[]>): boolean {
  const visited = new Set<string>()
  const inStack = new Set<string>()

  for (const node of graph.keys()) {
    if (dfsHasCycle(node, graph, visited, inStack)) return true
  }

  return false
}

function dfsHasCycle(
  node: string,
  graph: ReadonlyMap<string, readonly string[]>,
  visited: Set<string>,
  inStack: Set<string>
): boolean {
  if (inStack.has(node)) return true
  if (visited.has(node)) return false

  visited.add(node)
  inStack.add(node)

  const neighbors = graph.get(node) ?? []
  for (const neighbor of neighbors) {
    if (dfsHasCycle(neighbor, graph, visited, inStack)) return true
  }

  inStack.delete(node)
  return false
}

// ── Combined validation ─────────────────────────────────────────

export function isValidPuzzle(grid: GridState): boolean {
  const structure = validateStructure(grid)
  if (!structure.valid) return false

  const facingHeads = detectFacingHeads(grid)
  if (facingHeads.length > 0) return false

  if (detectCircularDeadlocks(grid)) return false

  return true
}

/**
 * Returns the number of arrows that can currently move (freedom score).
 * An arrow is free if its entire exit path to the board edge is clear.
 */
export function computeFreedomScore(grid: GridState): number {
  let free = 0
  for (const arrow of grid.arrows) {
    const head = arrow.cells[0]
    if (head.content.type !== 'head') continue

    const delta = directionDelta(head.content.direction)
    let blocked = false
    let current = { row: head.row + delta.row, col: head.col + delta.col }

    while (isInBounds(grid, current)) {
      const cell = getCell(grid, current)
      if (cell && cell.content.type !== 'empty') {
        blocked = true
        break
      }
      current = { row: current.row + delta.row, col: current.col + delta.col }
    }

    if (!blocked) free++
  }
  return free
}
