import { getCell, isInBounds, positionAhead } from '../engine/grid'
import type { GridState } from '../engine/types'

export interface DependencyGraph {
  readonly edges: ReadonlyMap<string, readonly string[]>
  readonly hasCycle: boolean
  readonly freeArrows: readonly string[]
}

/**
 * Builds a dependency graph for the current grid state.
 * An edge A -> B means "A cannot move until B moves" (B blocks A).
 */
export function buildDependencyGraph(grid: GridState): DependencyGraph {
  const edges = new Map<string, string[]>()

  for (const arrow of grid.arrows) {
    edges.set(arrow.id, [])
  }

  for (const arrow of grid.arrows) {
    const head = arrow.cells[0]
    if (head.content.type !== 'head') continue

    const ahead = positionAhead({ row: head.row, col: head.col }, head.content.direction)
    if (!isInBounds(grid, ahead)) continue

    const cell = getCell(grid, ahead)
    if (cell?.arrowId && cell.arrowId !== arrow.id) {
      edges.get(arrow.id)?.push(cell.arrowId)
    }
  }

  const hasCycle = detectCycle(edges)
  const freeArrows = [...edges.entries()].filter(([_, deps]) => deps.length === 0).map(([id]) => id)

  return { edges, hasCycle, freeArrows }
}

/**
 * Computes the freedom score: number of arrows that can move immediately.
 */
export function computeFreedom(grid: GridState): number {
  const graph = buildDependencyGraph(grid)
  return graph.freeArrows.length
}

// ── Cycle detection (DFS) ───────────────────────────────────────

function detectCycle(edges: ReadonlyMap<string, readonly string[]>): boolean {
  const visited = new Set<string>()
  const inStack = new Set<string>()

  for (const node of edges.keys()) {
    if (dfs(node, edges, visited, inStack)) return true
  }
  return false
}

function dfs(
  node: string,
  edges: ReadonlyMap<string, readonly string[]>,
  visited: Set<string>,
  inStack: Set<string>
): boolean {
  if (inStack.has(node)) return true
  if (visited.has(node)) return false

  visited.add(node)
  inStack.add(node)

  for (const neighbor of edges.get(node) ?? []) {
    if (dfs(neighbor, edges, visited, inStack)) return true
  }

  inStack.delete(node)
  return false
}
