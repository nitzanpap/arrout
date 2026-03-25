import { describe, expect, test } from 'bun:test'
import type { GridCell, GridState } from '../../engine/types'
import { findClosestArrow, HIT_RADIUS_RATIO } from '../findClosestArrow'

// ── Helpers ──────────────────────────────────────────────────────

function makeEmptyCell(row: number, col: number): GridCell {
  return { row, col, content: { type: 'empty' }, arrowId: null }
}

function makeCellWithArrow(row: number, col: number, arrowId: string): GridCell {
  return { row, col, content: { type: 'head', direction: 'RIGHT' }, arrowId }
}

/** Build a grid where specific cells have arrows. */
function makeGrid(
  width: number,
  height: number,
  arrowCells: readonly { row: number; col: number; arrowId: string }[]
): GridState {
  const cells: GridCell[][] = []
  for (let r = 0; r < height; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < width; c++) {
      const arrow = arrowCells.find((a) => a.row === r && a.col === c)
      row.push(arrow ? makeCellWithArrow(r, c, arrow.arrowId) : makeEmptyCell(r, c))
    }
    cells.push(row)
  }
  return { width, height, cells, arrows: [] }
}

// ── Constants for tests ──────────────────────────────────────────

const CELL_SIZE = 50
const OFFSET_X = 0
const OFFSET_Y = 0

/** Center of cell (row, col) given CELL_SIZE and zero offset. */
function cellCenter(row: number, col: number) {
  return {
    x: col * CELL_SIZE + CELL_SIZE / 2,
    y: row * CELL_SIZE + CELL_SIZE / 2,
  }
}

// ── Tests ────────────────────────────────────────────────────────

describe('findClosestArrow', () => {
  describe('exact cell center taps', () => {
    test('returns arrow when tapping directly on its cell center', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 2, arrowId: 'a1' }])
      const { x, y } = cellCenter(1, 2)

      const result = findClosestArrow(x, y, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBe('a1')
    })

    test('returns null when tapping an empty cell center', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 2, arrowId: 'a1' }])
      const { x, y } = cellCenter(0, 0)

      const result = findClosestArrow(x, y, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBeNull()
    })
  })

  describe('radius-based detection', () => {
    test('finds arrow in adjacent cell when tap is within hit radius', () => {
      // Arrow at (1, 2), tap slightly to the left — still within 0.8 * cellSize radius
      const grid = makeGrid(4, 4, [{ row: 1, col: 2, arrowId: 'a1' }])
      const center = cellCenter(1, 2)
      // Tap 20px to the left of cell center (within 0.8 * 50 = 40px radius)
      const result = findClosestArrow(center.x - 20, center.y, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBe('a1')
    })

    test('returns null when tap is outside hit radius', () => {
      const grid = makeGrid(6, 6, [{ row: 1, col: 1, arrowId: 'a1' }])
      const center = cellCenter(1, 1)
      const hitRadius = CELL_SIZE * HIT_RADIUS_RATIO
      // Tap well beyond the radius
      const result = findClosestArrow(
        center.x + hitRadius + 10,
        center.y + hitRadius + 10,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBeNull()
    })

    test('returns closest arrow when multiple are within radius', () => {
      // Two arrows in adjacent cells. Tap closer to the first one.
      const grid = makeGrid(4, 4, [
        { row: 1, col: 1, arrowId: 'a1' },
        { row: 1, col: 2, arrowId: 'a2' },
      ])
      // Tap at the boundary between cells but slightly closer to a1
      const a1Center = cellCenter(1, 1)
      const result = findClosestArrow(
        a1Center.x + 5,
        a1Center.y,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBe('a1')
    })

    test('returns closest arrow when tapping between two arrows — picks nearer', () => {
      const grid = makeGrid(4, 4, [
        { row: 1, col: 1, arrowId: 'a1' },
        { row: 1, col: 2, arrowId: 'a2' },
      ])
      // Tap closer to a2
      const a2Center = cellCenter(1, 2)
      const result = findClosestArrow(
        a2Center.x - 5,
        a2Center.y,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBe('a2')
    })
  })

  describe('edge cases', () => {
    test('returns null for cellSize of 0', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 1, arrowId: 'a1' }])
      const result = findClosestArrow(25, 75, grid, 0, OFFSET_X, OFFSET_Y)
      expect(result).toBeNull()
    })

    test('handles tap outside grid bounds', () => {
      const grid = makeGrid(4, 4, [{ row: 0, col: 0, arrowId: 'a1' }])
      // Tap at negative coordinates
      const result = findClosestArrow(-100, -100, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBeNull()
    })

    test('handles tap far past grid right edge', () => {
      const grid = makeGrid(4, 4, [{ row: 0, col: 3, arrowId: 'a1' }])
      // Tap way past the grid
      const result = findClosestArrow(500, 25, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBeNull()
    })

    test('works with non-zero offsets', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 2, arrowId: 'a1' }])
      const ox = 100
      const oy = 200
      const x = ox + 2 * CELL_SIZE + CELL_SIZE / 2
      const y = oy + 1 * CELL_SIZE + CELL_SIZE / 2

      const result = findClosestArrow(x, y, grid, CELL_SIZE, ox, oy)
      expect(result).toBe('a1')
    })

    test('arrow at grid corner (0,0) is findable', () => {
      const grid = makeGrid(4, 4, [{ row: 0, col: 0, arrowId: 'corner' }])
      const { x, y } = cellCenter(0, 0)

      const result = findClosestArrow(x, y, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBe('corner')
    })

    test('arrow at grid corner (max, max) is findable', () => {
      const grid = makeGrid(4, 4, [{ row: 3, col: 3, arrowId: 'corner' }])
      const { x, y } = cellCenter(3, 3)

      const result = findClosestArrow(x, y, grid, CELL_SIZE, OFFSET_X, OFFSET_Y)
      expect(result).toBe('corner')
    })
  })

  describe('hit radius boundary', () => {
    test('finds arrow at exactly the hit radius boundary', () => {
      const grid = makeGrid(6, 6, [{ row: 2, col: 2, arrowId: 'a1' }])
      const center = cellCenter(2, 2)
      const hitRadius = CELL_SIZE * HIT_RADIUS_RATIO

      // Tap exactly at the boundary (within floating point tolerance)
      const result = findClosestArrow(
        center.x + hitRadius - 0.01,
        center.y,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBe('a1')
    })

    test('does not find arrow just past the hit radius', () => {
      const grid = makeGrid(6, 6, [{ row: 2, col: 2, arrowId: 'a1' }])
      const center = cellCenter(2, 2)
      const hitRadius = CELL_SIZE * HIT_RADIUS_RATIO

      // Tap just past the boundary
      const result = findClosestArrow(
        center.x + hitRadius + 1,
        center.y,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBeNull()
    })
  })

  describe('diagonal proximity', () => {
    test('finds arrow diagonally adjacent when within radius', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 1, arrowId: 'a1' }])
      const center = cellCenter(1, 1)
      // Tap diagonally — 20px right and 20px down (distance ≈ 28.3, within 40px radius)
      const result = findClosestArrow(
        center.x + 20,
        center.y + 20,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBe('a1')
    })

    test('does not find arrow diagonally when distance exceeds radius', () => {
      const grid = makeGrid(4, 4, [{ row: 1, col: 1, arrowId: 'a1' }])
      const center = cellCenter(1, 1)
      // Tap diagonally — 30px right and 30px down (distance ≈ 42.4, outside 40px radius)
      const result = findClosestArrow(
        center.x + 30,
        center.y + 30,
        grid,
        CELL_SIZE,
        OFFSET_X,
        OFFSET_Y
      )
      expect(result).toBeNull()
    })
  })
})
