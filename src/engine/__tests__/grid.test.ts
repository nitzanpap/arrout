import { describe, expect, test } from 'bun:test'
import {
  cellAhead,
  createGrid,
  getCell,
  isEdge,
  isEmpty,
  isInBounds,
  placeArrow,
  positionAhead,
  removeArrow,
  setCell,
} from '../grid'
import type { Arrow } from '../types'

describe('createGrid', () => {
  test('creates grid with correct dimensions', () => {
    const grid = createGrid(6, 4)
    expect(grid.width).toBe(6)
    expect(grid.height).toBe(4)
    expect(grid.cells.length).toBe(4) // rows
    expect(grid.cells[0].length).toBe(6) // cols
  })

  test('all cells are empty', () => {
    const grid = createGrid(3, 3)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = grid.cells[row][col]
        expect(cell.content.type).toBe('empty')
        expect(cell.arrowId).toBeNull()
        expect(cell.row).toBe(row)
        expect(cell.col).toBe(col)
      }
    }
  })

  test('has no arrows', () => {
    const grid = createGrid(5, 5)
    expect(grid.arrows).toEqual([])
  })
})

describe('isInBounds', () => {
  const grid = createGrid(5, 4)

  test('returns true for valid positions', () => {
    expect(isInBounds(grid, { row: 0, col: 0 })).toBe(true)
    expect(isInBounds(grid, { row: 3, col: 4 })).toBe(true)
    expect(isInBounds(grid, { row: 2, col: 2 })).toBe(true)
  })

  test('returns false for out-of-bounds positions', () => {
    expect(isInBounds(grid, { row: -1, col: 0 })).toBe(false)
    expect(isInBounds(grid, { row: 0, col: -1 })).toBe(false)
    expect(isInBounds(grid, { row: 4, col: 0 })).toBe(false)
    expect(isInBounds(grid, { row: 0, col: 5 })).toBe(false)
  })
})

describe('getCell', () => {
  const grid = createGrid(3, 3)

  test('returns cell for valid position', () => {
    const cell = getCell(grid, { row: 1, col: 2 })
    expect(cell).not.toBeNull()
    expect(cell?.row).toBe(1)
    expect(cell?.col).toBe(2)
  })

  test('returns null for out-of-bounds', () => {
    expect(getCell(grid, { row: -1, col: 0 })).toBeNull()
    expect(getCell(grid, { row: 3, col: 0 })).toBeNull()
  })
})

describe('setCell', () => {
  test('returns new grid with updated cell', () => {
    const grid = createGrid(3, 3)
    const updated = setCell(grid, { row: 1, col: 1 }, { type: 'head', direction: 'UP' }, 'arrow-1')
    const cell = getCell(updated, { row: 1, col: 1 })
    expect(cell).not.toBeNull()
    expect(cell?.content).toEqual({ type: 'head', direction: 'UP' })
    expect(cell?.arrowId).toBe('arrow-1')
  })

  test('does not mutate original grid', () => {
    const grid = createGrid(3, 3)
    setCell(grid, { row: 1, col: 1 }, { type: 'head', direction: 'UP' }, 'arrow-1')
    const original = getCell(grid, { row: 1, col: 1 })
    expect(original).not.toBeNull()
    expect(original?.content.type).toBe('empty')
    expect(original?.arrowId).toBeNull()
  })

  test('ignores out-of-bounds position', () => {
    const grid = createGrid(3, 3)
    const result = setCell(grid, { row: 5, col: 5 }, { type: 'head', direction: 'UP' }, 'x')
    expect(result).toBe(grid) // same reference, nothing changed
  })
})

describe('placeArrow / removeArrow', () => {
  const arrow: Arrow = {
    id: 'a1',
    color: '#fff',
    cells: [
      { row: 0, col: 0, content: { type: 'head', direction: 'RIGHT' }, arrowId: 'a1' },
      { row: 0, col: 1, content: { type: 'straight', axis: 'H' }, arrowId: 'a1' },
    ],
  }

  test('places arrow cells on grid', () => {
    const grid = createGrid(4, 4)
    const placed = placeArrow(grid, arrow)

    const headCell = getCell(placed, { row: 0, col: 0 })
    expect(headCell).not.toBeNull()
    expect(headCell?.content).toEqual({ type: 'head', direction: 'RIGHT' })
    expect(headCell?.arrowId).toBe('a1')

    const bodyCell = getCell(placed, { row: 0, col: 1 })
    expect(bodyCell).not.toBeNull()
    expect(bodyCell?.content).toEqual({ type: 'straight', axis: 'H' })
    expect(bodyCell?.arrowId).toBe('a1')

    expect(placed.arrows).toHaveLength(1)
    expect(placed.arrows[0].id).toBe('a1')
  })

  test('removes arrow and clears cells', () => {
    const grid = createGrid(4, 4)
    const placed = placeArrow(grid, arrow)
    const removed = removeArrow(placed, 'a1')

    expect(getCell(removed, { row: 0, col: 0 })?.content.type).toBe('empty')
    expect(getCell(removed, { row: 0, col: 0 })?.arrowId).toBeNull()
    expect(getCell(removed, { row: 0, col: 1 })?.content.type).toBe('empty')
    expect(removed.arrows).toHaveLength(0)
  })

  test('does not mutate original grid on place', () => {
    const grid = createGrid(4, 4)
    placeArrow(grid, arrow)
    expect(grid.arrows).toHaveLength(0)
    expect(getCell(grid, { row: 0, col: 0 })?.content.type).toBe('empty')
  })
})

describe('positionAhead', () => {
  test('returns correct position for each direction', () => {
    const pos = { row: 2, col: 3 }
    expect(positionAhead(pos, 'UP')).toEqual({ row: 1, col: 3 })
    expect(positionAhead(pos, 'DOWN')).toEqual({ row: 3, col: 3 })
    expect(positionAhead(pos, 'LEFT')).toEqual({ row: 2, col: 2 })
    expect(positionAhead(pos, 'RIGHT')).toEqual({ row: 2, col: 4 })
  })
})

describe('cellAhead', () => {
  test('returns cell when in bounds', () => {
    const grid = createGrid(5, 5)
    const cell = cellAhead({ row: 2, col: 2 }, 'RIGHT', grid)
    expect(cell).not.toBeNull()
    expect(cell?.col).toBe(3)
  })

  test('returns null when off board edge', () => {
    const grid = createGrid(5, 5)
    expect(cellAhead({ row: 0, col: 0 }, 'UP', grid)).toBeNull()
    expect(cellAhead({ row: 0, col: 0 }, 'LEFT', grid)).toBeNull()
    expect(cellAhead({ row: 4, col: 4 }, 'DOWN', grid)).toBeNull()
    expect(cellAhead({ row: 4, col: 4 }, 'RIGHT', grid)).toBeNull()
  })
})

describe('isEdge', () => {
  const grid = createGrid(5, 5)

  test('detects edges correctly', () => {
    expect(isEdge(grid, { row: 0, col: 2 }, 'UP')).toBe(true)
    expect(isEdge(grid, { row: 4, col: 2 }, 'DOWN')).toBe(true)
    expect(isEdge(grid, { row: 2, col: 0 }, 'LEFT')).toBe(true)
    expect(isEdge(grid, { row: 2, col: 4 }, 'RIGHT')).toBe(true)
  })

  test('non-edges return false', () => {
    expect(isEdge(grid, { row: 2, col: 2 }, 'UP')).toBe(false)
    expect(isEdge(grid, { row: 2, col: 2 }, 'DOWN')).toBe(false)
  })
})

describe('isEmpty', () => {
  test('returns true for empty cell', () => {
    const grid = createGrid(3, 3)
    expect(isEmpty(grid, { row: 0, col: 0 })).toBe(true)
  })

  test('returns false for occupied cell', () => {
    const grid = createGrid(3, 3)
    const updated = setCell(grid, { row: 0, col: 0 }, { type: 'head', direction: 'UP' }, 'a1')
    expect(isEmpty(updated, { row: 0, col: 0 })).toBe(false)
  })

  test('returns false for out-of-bounds', () => {
    const grid = createGrid(3, 3)
    expect(isEmpty(grid, { row: -1, col: 0 })).toBe(false)
  })
})
