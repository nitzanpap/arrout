import { isEmpty, isInBounds } from '../engine/grid'
import type { CurveType, Direction, GridCell, GridState, Position, Side } from '../engine/types'
import { directionDelta, oppositeDirection } from '../engine/types'
import type { GeneratorConfig } from './difficulty'
import type { SeededRng } from './prng'

/**
 * Generates a random arrow shape starting from a head position and direction.
 * The body grows backwards (opposite to head direction) using a constrained random walk.
 *
 * Returns ordered cells [head, ...body] or null if minimum length can't be reached.
 */
export function generateArrowShape(
  rng: SeededRng,
  grid: GridState,
  headPos: Position,
  headDirection: Direction,
  config: GeneratorConfig
): GridCell[] | null {
  const arrowId = `gen_${headPos.row}_${headPos.col}`
  const targetLength = rng.nextInt(config.minArrowLength, config.maxArrowLength)

  const headCell: GridCell = {
    row: headPos.row,
    col: headPos.col,
    content: { type: 'head', direction: headDirection },
    arrowId,
  }

  const cells: GridCell[] = [headCell]
  let growthDir: Direction = oppositeDirection(headDirection)
  let currentPos = headPos

  while (cells.length < targetLength) {
    const nextPos = move(currentPos, growthDir)
    if (!canPlaceAt(grid, nextPos, cells)) break

    // Decide: straight or curve?
    if (rng.nextBool(config.curveProbability)) {
      const curve = tryCurve(rng, nextPos, growthDir, arrowId)
      if (curve) {
        cells.push(curve.cell)
        currentPos = nextPos
        growthDir = curve.newGrowthDir
        continue
      }
    }

    // Straight segment
    cells.push(makeStraightCell(nextPos, growthDir, arrowId))
    currentPos = nextPos
    // growthDir stays the same for straight
  }

  if (cells.length < config.minArrowLength) return null

  // Reject shapes where body cells cross the head's exit path
  if (bodyBlocksExitPath(cells, headDirection, grid)) return null

  return cells
}

/**
 * Returns true if any body cell (non-head) sits on the head's straight-line
 * exit path to the board edge. Such shapes look like closed loops and
 * create confusing gameplay where the arrow appears to pass through itself.
 */
function bodyBlocksExitPath(
  cells: readonly GridCell[],
  headDirection: Direction,
  grid: GridState
): boolean {
  if (cells.length < 2) return false

  const head = cells[0]
  const delta = directionDelta(headDirection)
  const bodyKeys = new Set(cells.slice(1).map((c) => `${c.row},${c.col}`))

  let row = head.row + delta.row
  let col = head.col + delta.col
  while (isInBounds(grid, { row, col })) {
    if (bodyKeys.has(`${row},${col}`)) return true
    row += delta.row
    col += delta.col
  }

  return false
}

// ── Internal ────────────────────────────────────────────────────

interface CurveResult {
  cell: GridCell
  newGrowthDir: Direction
}

/**
 * Creates a curve cell at the given position.
 * The curve enters from the growth direction and exits perpendicular.
 */
function tryCurve(
  rng: SeededRng,
  pos: Position,
  growthDir: Direction,
  arrowId: string
): CurveResult | null {
  // Entry side: opposite of growthDir (path comes from that direction)
  const entrySide = dirToSide(oppositeDirection(growthDir))
  // Exit: one of the two perpendicular sides
  const perpSides = getPerpendicularSides(entrySide)
  const shuffled = rng.shuffle(perpSides)

  for (const exitSide of shuffled) {
    const curveType = sidesToCurve(entrySide, exitSide)
    if (!curveType) continue

    return {
      cell: { row: pos.row, col: pos.col, content: { type: 'curve', curve: curveType }, arrowId },
      newGrowthDir: sideToDir(exitSide),
    }
  }
  return null
}

function makeStraightCell(pos: Position, growthDir: Direction, arrowId: string): GridCell {
  const axis = growthDir === 'UP' || growthDir === 'DOWN' ? ('V' as const) : ('H' as const)
  return {
    row: pos.row,
    col: pos.col,
    content: { type: 'straight', axis },
    arrowId,
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function move(pos: Position, dir: Direction): Position {
  switch (dir) {
    case 'UP':
      return { row: pos.row - 1, col: pos.col }
    case 'DOWN':
      return { row: pos.row + 1, col: pos.col }
    case 'LEFT':
      return { row: pos.row, col: pos.col - 1 }
    case 'RIGHT':
      return { row: pos.row, col: pos.col + 1 }
  }
}

function canPlaceAt(grid: GridState, pos: Position, existingCells: readonly GridCell[]): boolean {
  if (pos.row < 0 || pos.row >= grid.height || pos.col < 0 || pos.col >= grid.width) return false
  if (!isEmpty(grid, pos)) return false
  return !existingCells.some((c) => c.row === pos.row && c.col === pos.col)
}

function dirToSide(dir: Direction): Side {
  switch (dir) {
    case 'UP':
      return 'top'
    case 'DOWN':
      return 'bottom'
    case 'LEFT':
      return 'left'
    case 'RIGHT':
      return 'right'
  }
}

function sideToDir(side: Side): Direction {
  switch (side) {
    case 'top':
      return 'UP'
    case 'bottom':
      return 'DOWN'
    case 'left':
      return 'LEFT'
    case 'right':
      return 'RIGHT'
  }
}

function getPerpendicularSides(side: Side): Side[] {
  if (side === 'top' || side === 'bottom') return ['left', 'right']
  return ['top', 'bottom']
}

function sidesToCurve(sideA: Side, sideB: Side): CurveType | null {
  const key = [sideA, sideB].sort().join(',')
  switch (key) {
    case 'right,top':
      return 'NE'
    case 'left,top':
      return 'NW'
    case 'bottom,right':
      return 'SE'
    case 'bottom,left':
      return 'SW'
    default:
      return null
  }
}
