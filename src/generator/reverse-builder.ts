import { createGrid, isEmpty, placeArrow } from '../engine/grid'
import type { Arrow, Direction, GridState, Position } from '../engine/types'
import { detectFacingHeads } from '../engine/validator'
import { buildDependencyGraph, computeFreedom } from './dependency-graph'
import type { GeneratorConfig } from './difficulty'
import type { SeededRng } from './prng'
import { generateArrowShape } from './shape-generator'

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
 * Scale placement attempts with grid area — larger grids need more attempts
 * since the candidate space is much larger.
 */
function maxAttempts(config: GeneratorConfig): number {
  return Math.max(200, config.width * config.height * 3)
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
  const limit = maxAttempts(config)

  while (placedArrows.length < config.targetArrowCount) {
    if (consecutiveFailures > limit) break

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
  const candidates = getEdgeAdjacentCandidates(grid, rng, existing.length, config)

  for (const { pos, direction } of candidates) {
    const shape = generateArrowShape(rng, grid, pos, direction, config)
    if (!shape) continue

    const arrowId = `arrow_${existing.length}`
    const color = ARROW_COLORS[existing.length % ARROW_COLORS.length]
    const arrow: Arrow = { id: arrowId, cells: shape, color }

    // Check no facing-heads deadlock
    const testGrid = placeArrow(grid, arrow)
    const facingHeads = detectFacingHeads(testGrid)
    if (facingHeads.length > 0) continue

    // Check no circular deadlock (full-path dependency graph)
    const depGraph = buildDependencyGraph(testGrid)
    if (depGraph.hasCycle) continue

    // Only enforce freedom constraint once grid is sufficiently populated.
    // Early placements should focus on filling the grid — freedom is
    // meaningless with few arrows since most will be unblocked anyway.
    // Enforce freedom once enough arrows exist for blocking to be meaningful.
    // For small targets (<= 15), enforce at 50%. For large targets, defer to 75%.
    const freedomThreshold = config.targetArrowCount <= 15 ? 0.5 : 0.75
    const shouldEnforceFreedom =
      existing.length >= Math.floor(config.targetArrowCount * freedomThreshold)
    if (shouldEnforceFreedom) {
      const freedom = computeFreedom(testGrid)
      if (freedom > config.targetMaxFreedom) continue
    }

    return arrow
  }

  return null
}

/**
 * Generates candidate head positions. Allows up to 1 blocker in the exit
 * path since the full-path dependency graph and cycle detection ensure
 * correctness. This dramatically increases the candidate pool on dense grids.
 *
 * Once the grid is partially populated (>30% of target), prioritizes
 * interior positions to create denser blocking patterns.
 */
function getEdgeAdjacentCandidates(
  grid: GridState,
  rng: SeededRng,
  placedCount: number,
  config: GeneratorConfig
): Array<{ pos: Position; direction: Direction }> {
  const candidates: Array<{ pos: Position; direction: Direction }> = []

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (!isEmpty(grid, { row, col })) continue

      const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT']
      for (const dir of directions) {
        candidates.push({ pos: { row, col }, direction: dir })
      }
    }
  }

  const shuffled = rng.shuffle(candidates)

  // Once partially populated, bias toward interior positions for denser blocking
  if (placedCount > config.targetArrowCount * 0.3) {
    shuffled.sort((a, b) => {
      const distA = Math.min(
        a.pos.row,
        a.pos.col,
        grid.height - 1 - a.pos.row,
        grid.width - 1 - a.pos.col
      )
      const distB = Math.min(
        b.pos.row,
        b.pos.col,
        grid.height - 1 - b.pos.row,
        grid.width - 1 - b.pos.col
      )
      return distB - distA
    })
  }

  return shuffled
}
