import { getCell, isInBounds } from '../engine/grid'
import type { GridState } from '../engine/types'
import { directionDelta } from '../engine/types'

export interface DependencyGraph {
  readonly edges: ReadonlyMap<string, readonly string[]>
  readonly hasCycle: boolean
  readonly freeArrows: readonly string[]
}

/**
 * Builds a dependency graph for the current grid state.
 * An edge A -> B means "A cannot move until B moves" (B blocks A).
 *
 * Checks the FULL exit path from each arrow's head to the board edge,
 * not just the immediate next cell. This correctly captures all blocking
 * relationships for dense grids where multiple arrows may sit in the
 * same exit lane.
 */
export function buildDependencyGraph(grid: GridState): DependencyGraph {
  const edges = new Map<string, string[]>()

  for (const arrow of grid.arrows) {
    edges.set(arrow.id, [])
  }

  for (const arrow of grid.arrows) {
    const head = arrow.cells[0]
    if (head.content.type !== 'head') continue

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

    const deps = edges.get(arrow.id)
    if (deps) {
      for (const blockerId of blockers) {
        deps.push(blockerId)
      }
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

/**
 * Returns a topological ordering of arrows: arrows that must move first
 * come first in the result. If the graph has a cycle, returns null.
 */
export function topologicalSort(graph: DependencyGraph): readonly string[] | null {
  if (graph.hasCycle) return null

  // Build in-degree counts and reverse edges for Kahn's algorithm.
  // For each "A depends on B", B has an out-edge to A.
  const inDegree = new Map<string, number>()
  const reverseEdges = new Map<string, string[]>()
  for (const node of graph.edges.keys()) {
    reverseEdges.set(node, [])
    inDegree.set(node, 0)
  }

  for (const [node, deps] of graph.edges) {
    inDegree.set(node, deps.length)
    for (const dep of deps) {
      reverseEdges.get(dep)?.push(node)
    }
  }

  // Kahn's algorithm
  const queue: string[] = []
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node)
  }

  const result: string[] = []
  while (queue.length > 0) {
    const node = queue.shift()
    if (!node) break
    result.push(node)

    for (const dependent of reverseEdges.get(node) ?? []) {
      const newDegree = (inDegree.get(dependent) ?? 1) - 1
      inDegree.set(dependent, newDegree)
      if (newDegree === 0) queue.push(dependent)
    }
  }

  if (result.length !== graph.edges.size) return null
  return result
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
