import { createGrid, isEmpty, isInBounds, placeArrow } from '../engine/grid'
import type { Arrow, Direction, GridState, Position } from '../engine/types'
import { detectFacingHeads } from '../engine/validator'
import { buildDependencyGraph, computeFreedom } from './dependency-graph'
import type { GeneratorConfig } from './difficulty'
import { entryPathIsClear } from './entry-trajectory'
import type { SeededRng } from './prng'
import { generateArrowShape } from './shape-generator'

const MAX_PLACEMENT_ATTEMPTS = 100
const ARROW_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#AED6F1',
  '#D7BDE2',
]

export interface BuildResult {
  readonly grid: GridState
  readonly placementOrder: readonly string[] // reverse of solution order
}

/**
 * Core reverse construction algorithm.
 * Starting from an empty grid, places arrows one at a time.
 * Each arrow is placed at its final resting position, and we verify
 * its entry trajectory is clear. The placement order IS the solution (reversed).
 */
export function reverseConstruct(config: GeneratorConfig, rng: SeededRng): BuildResult | null {
  let grid = createGrid(config.width, config.height)
  const placedArrows: Arrow[] = []
  const placementOrder: string[] = []
  let consecutiveFailures = 0

  while (placedArrows.length < config.targetArrowCount) {
    if (consecutiveFailures > MAX_PLACEMENT_ATTEMPTS) break

    const arrow = tryPlaceArrow(grid, config, rng, placedArrows)
    if (!arrow) {
      consecutiveFailures++
      continue
    }

    grid = placeArrow(grid, arrow)
    placedArrows.push(arrow)
    placementOrder.push(arrow.id)
    consecutiveFailures = 0
  }

  // Must have placed at least 2 arrows for a valid puzzle
  if (placedArrows.length < 2) return null

  return { grid, placementOrder }
}

function tryPlaceArrow(
  grid: GridState,
  config: GeneratorConfig,
  rng: SeededRng,
  existing: readonly Arrow[]
): Arrow | null {
  // Generate candidate head positions: cells on the grid that are empty
  // and adjacent to a board edge (the arrow enters from the edge)
  const candidates = getEdgeAdjacentCandidates(grid, rng)

  for (const { pos, direction } of candidates) {
    // Generate a random shape
    const shape = generateArrowShape(rng, grid, pos, direction, config)
    if (!shape) continue

    const arrowId = `arrow_${existing.length}`
    const color = ARROW_COLORS[existing.length % ARROW_COLORS.length]
    const arrow: Arrow = { id: arrowId, cells: shape, color }

    // Verify entry trajectory is clear
    if (!entryPathIsClear(arrow, grid)) continue

    // Check no facing-heads deadlock
    const testGrid = placeArrow(grid, arrow)
    const facingHeads = detectFacingHeads(testGrid)
    if (facingHeads.length > 0) continue

    // Check no circular deadlock
    const depGraph = buildDependencyGraph(testGrid)
    if (depGraph.hasCycle) continue

    // Check difficulty constraint (freedom score)
    const freedom = computeFreedom(testGrid)
    if (freedom > config.targetMaxFreedom) continue

    return arrow
  }

  return null
}

/**
 * Generates candidate head positions along the board edges.
 * For reverse construction, arrows enter from the edge, so the head
 * should be at positions that can see the board edge in its direction.
 */
function getEdgeAdjacentCandidates(
  grid: GridState,
  rng: SeededRng
): Array<{ pos: Position; direction: Direction }> {
  const candidates: Array<{ pos: Position; direction: Direction }> = []

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (!isEmpty(grid, { row, col })) continue

      // Check each direction: if the head faces this way, is the exit path clear?
      const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']
      for (const dir of directions) {
        // For the head to point in this direction, there should be a clear path to the edge
        if (hasPathToEdge(grid, { row, col }, dir)) {
          candidates.push({ pos: { row, col }, direction: dir })
        }
      }
    }
  }

  return rng.shuffle(candidates)
}

/**
 * Checks if there's a clear path from a position to the board edge
 * in the given direction (no obstacles in the way).
 */
function hasPathToEdge(grid: GridState, pos: Position, dir: Direction): boolean {
  let current = pos
  const delta = { row: 0, col: 0 }
  switch (dir) {
    case 'UP':
      delta.row = -1
      break
    case 'DOWN':
      delta.row = 1
      break
    case 'LEFT':
      delta.col = -1
      break
    case 'RIGHT':
      delta.col = 1
      break
  }

  // Check from position to edge - all cells must be empty (or off-board)
  current = { row: current.row + delta.row, col: current.col + delta.col }
  while (isInBounds(grid, current)) {
    if (!isEmpty(grid, current)) return false
    current = { row: current.row + delta.row, col: current.col + delta.col }
  }
  return true
}
