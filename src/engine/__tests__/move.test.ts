import { describe, expect, test } from 'bun:test'
import { createGrid, getCell, placeArrow } from '../grid'
import { canMove, executeMove } from '../move'
import type { Arrow, GridCell } from '../types'

function makeCell(
  row: number,
  col: number,
  content: GridCell['content'],
  arrowId: string
): GridCell {
  return { row, col, content, arrowId }
}

/**
 * Creates a horizontal arrow. Head is at (row, headCol), body extends BEHIND the head.
 * For RIGHT: body extends to the left (lower col values)
 * For LEFT: body extends to the right (higher col values)
 */
function makeHorizontalArrow(
  id: string,
  row: number,
  headCol: number,
  length: number,
  direction: 'LEFT' | 'RIGHT'
): Arrow {
  const cells: GridCell[] = []
  cells.push(makeCell(row, headCol, { type: 'head', direction }, id))
  for (let i = 1; i < length; i++) {
    // Body extends in opposite direction of head
    const col = direction === 'RIGHT' ? headCol - i : headCol + i
    cells.push(makeCell(row, col, { type: 'straight', axis: 'H' }, id))
  }
  return { id, cells, color: '#fff' }
}

/**
 * Creates a vertical arrow. Head is at (headRow, col), body extends BEHIND the head.
 * For DOWN: body extends upward (lower row values)
 * For UP: body extends downward (higher row values)
 */
function _makeVerticalArrow(
  id: string,
  col: number,
  headRow: number,
  length: number,
  direction: 'UP' | 'DOWN'
): Arrow {
  const cells: GridCell[] = []
  cells.push(makeCell(headRow, col, { type: 'head', direction }, id))
  for (let i = 1; i < length; i++) {
    const r = direction === 'DOWN' ? headRow - i : headRow + i
    cells.push(makeCell(r, col, { type: 'straight', axis: 'V' }, id))
  }
  return { id, cells, color: '#fff' }
}

describe('canMove', () => {
  test('arrow can move when head faces empty cell', () => {
    const grid = createGrid(5, 5)
    const arrow = makeHorizontalArrow('a1', 2, 1, 2, 'RIGHT')
    const placed = placeArrow(grid, arrow)
    expect(canMove('a1', placed)).toBe(true)
  })

  test('arrow can move when head faces board edge', () => {
    const grid = createGrid(5, 5)
    // Head at col 4 pointing RIGHT -> next is off-board
    const arrow = makeHorizontalArrow('a1', 2, 4, 2, 'RIGHT')
    const placed = placeArrow(grid, arrow)
    expect(canMove('a1', placed)).toBe(true)
  })

  test('arrow blocked by another arrow body ahead', () => {
    const grid = createGrid(6, 5)
    // a1: head RIGHT at (2,2), body at (2,1) -> head faces (2,3)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 2, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    // a2: vertical arrow blocking at (2,3)
    const a2: Arrow = {
      id: 'a2',
      color: '#f00',
      cells: [
        makeCell(1, 3, { type: 'head', direction: 'DOWN' }, 'a2'),
        makeCell(2, 3, { type: 'straight', axis: 'V' }, 'a2'),
      ],
    }
    let placed = placeArrow(grid, a1)
    placed = placeArrow(placed, a2)
    expect(canMove('a1', placed)).toBe(false)
  })

  test('arrow can move when nothing ahead', () => {
    const grid = createGrid(6, 5)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 2, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, a1)
    expect(canMove('a1', placed)).toBe(true)
  })

  test('returns false for non-existent arrow', () => {
    const grid = createGrid(5, 5)
    expect(canMove('nonexistent', grid)).toBe(false)
  })
})

describe('executeMove', () => {
  test('2-segment arrow pointing at edge exits completely', () => {
    const grid = createGrid(5, 5)
    // Head RIGHT at (2,4), body at (2,3) -> head faces off-board
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 4, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 3, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = executeMove('a1', placed)

    expect(result.success).toBe(true)
    expect(result.arrowRemoved).toBe(true)
    expect(result.heartLost).toBe(false)
    expect(result.nextState.arrows).toHaveLength(0)
    // All cells should be empty
    expect(getCell(result.nextState, { row: 2, col: 3 })?.content.type).toBe('empty')
    expect(getCell(result.nextState, { row: 2, col: 4 })?.content.type).toBe('empty')
  })

  test('3-segment arrow exits completely via snake movement', () => {
    const grid = createGrid(5, 5)
    // Head RIGHT at (2,3), body at (2,2) and (2,1)
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 3, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 2, { type: 'straight', axis: 'H' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = executeMove('a1', placed)

    expect(result.success).toBe(true)
    expect(result.arrowRemoved).toBe(true)
    expect(result.nextState.arrows).toHaveLength(0)
    // All original cells should be empty
    for (let col = 1; col <= 4; col++) {
      expect(getCell(result.nextState, { row: 2, col })?.content.type).toBe('empty')
    }
  })

  test('arrow with clear path ahead moves and exits', () => {
    const grid = createGrid(8, 5)
    // Head RIGHT at (2,2), body at (2,1) -> 5 empty cells ahead before edge
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 2, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = executeMove('a1', placed)

    expect(result.success).toBe(true)
    expect(result.arrowRemoved).toBe(true)
    expect(result.nextState.arrows).toHaveLength(0)
  })

  test('invalid move returns heartLost', () => {
    const grid = createGrid(5, 5)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 2, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const a2: Arrow = {
      id: 'a2',
      color: '#f00',
      cells: [
        makeCell(1, 3, { type: 'head', direction: 'DOWN' }, 'a2'),
        makeCell(2, 3, { type: 'straight', axis: 'V' }, 'a2'),
      ],
    }
    let placed = placeArrow(grid, a1)
    placed = placeArrow(placed, a2)

    const result = executeMove('a1', placed)
    expect(result.success).toBe(false)
    expect(result.heartLost).toBe(true)
    expect(result.arrowRemoved).toBe(false)
    // State unchanged
    expect(result.nextState.arrows).toHaveLength(2)
  })

  test('does not mutate original state', () => {
    const grid = createGrid(5, 5)
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 4, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 3, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const originalArrowCount = placed.arrows.length

    executeMove('a1', placed)

    // Original should be unchanged
    expect(placed.arrows.length).toBe(originalArrowCount)
    expect(getCell(placed, { row: 2, col: 4 })?.arrowId).toBe('a1')
  })

  test('vertical arrow moves UP and exits', () => {
    const grid = createGrid(5, 5)
    // Head UP at (1,2), body at (2,2)
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(1, 2, { type: 'head', direction: 'UP' }, 'a1'),
        makeCell(2, 2, { type: 'straight', axis: 'V' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = executeMove('a1', placed)

    expect(result.success).toBe(true)
    expect(result.arrowRemoved).toBe(true)
    expect(result.nextState.arrows).toHaveLength(0)
  })

  test('removing one arrow frees another', () => {
    const grid = createGrid(6, 5)
    // a1: head RIGHT at (2,2), body at (2,1) -> blocked by a2 at (2,3)
    // a2: head RIGHT at (2,4), body at (2,3) -> can move (faces (2,5) which is empty)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 2, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const a2: Arrow = {
      id: 'a2',
      color: '#f00',
      cells: [
        makeCell(2, 4, { type: 'head', direction: 'RIGHT' }, 'a2'),
        makeCell(2, 3, { type: 'straight', axis: 'H' }, 'a2'),
      ],
    }
    let placed = placeArrow(grid, a1)
    placed = placeArrow(placed, a2)

    // a1 is blocked by a2's body at (2,3)
    expect(canMove('a1', placed)).toBe(false)
    // a2 can move (faces (2,5) which is empty)
    expect(canMove('a2', placed)).toBe(true)

    // Remove a2 first
    const result = executeMove('a2', placed)
    expect(result.success).toBe(true)

    // Now a1 should be free
    expect(canMove('a1', result.nextState)).toBe(true)
  })

  test('long arrow (5 segments) exits correctly', () => {
    const grid = createGrid(8, 5)
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 5, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 4, { type: 'straight', axis: 'H' }, 'a1'),
        makeCell(2, 3, { type: 'straight', axis: 'H' }, 'a1'),
        makeCell(2, 2, { type: 'straight', axis: 'H' }, 'a1'),
        makeCell(2, 1, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = executeMove('a1', placed)

    expect(result.success).toBe(true)
    expect(result.arrowRemoved).toBe(true)
    expect(result.nextState.arrows).toHaveLength(0)
    // All cells should be empty
    for (let col = 0; col < 8; col++) {
      expect(getCell(result.nextState, { row: 2, col })?.content.type).toBe('empty')
    }
  })
})
