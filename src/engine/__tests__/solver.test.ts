import { describe, expect, test } from 'bun:test'
import { createGrid, placeArrow } from '../grid'
import { executeMove } from '../move'
import { getValidMoves, solve } from '../solver'
import type { Arrow, GridCell } from '../types'

function makeCell(
  row: number,
  col: number,
  content: GridCell['content'],
  arrowId: string
): GridCell {
  return { row, col, content, arrowId }
}

describe('getValidMoves', () => {
  test('returns all movable arrows', () => {
    const grid = createGrid(8, 5)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(1, 3, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(1, 2, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const a2: Arrow = {
      id: 'a2',
      color: '#f00',
      cells: [
        makeCell(3, 5, { type: 'head', direction: 'RIGHT' }, 'a2'),
        makeCell(3, 4, { type: 'straight', axis: 'H' }, 'a2'),
      ],
    }
    let placed = placeArrow(grid, a1)
    placed = placeArrow(placed, a2)

    const moves = getValidMoves(placed)
    expect(moves).toContain('a1')
    expect(moves).toContain('a2')
    expect(moves).toHaveLength(2)
  })

  test('excludes blocked arrows', () => {
    const grid = createGrid(6, 5)
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

    const moves = getValidMoves(placed)
    // a1 blocked by a2's body at (2,3), a2 can move
    expect(moves).toContain('a2')
    expect(moves).not.toContain('a1')
  })
})

describe('solve', () => {
  test('single arrow puzzle is trivially solvable', () => {
    const grid = createGrid(5, 5)
    const arrow: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(2, 3, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(2, 2, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const placed = placeArrow(grid, arrow)
    const result = solve(placed)

    expect(result.solvable).toBe(true)
    expect(result.moves).toEqual(['a1'])
  })

  test('two independent arrows - both orders work', () => {
    const grid = createGrid(8, 5)
    const a1: Arrow = {
      id: 'a1',
      color: '#fff',
      cells: [
        makeCell(1, 3, { type: 'head', direction: 'RIGHT' }, 'a1'),
        makeCell(1, 2, { type: 'straight', axis: 'H' }, 'a1'),
      ],
    }
    const a2: Arrow = {
      id: 'a2',
      color: '#f00',
      cells: [
        makeCell(3, 5, { type: 'head', direction: 'RIGHT' }, 'a2'),
        makeCell(3, 4, { type: 'straight', axis: 'H' }, 'a2'),
      ],
    }
    let placed = placeArrow(grid, a1)
    placed = placeArrow(placed, a2)

    const result = solve(placed)
    expect(result.solvable).toBe(true)
    expect(result.moves).toHaveLength(2)
  })

  test('ordered dependency - must move a2 before a1', () => {
    const grid = createGrid(6, 5)
    // a1 blocked by a2's body
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

    const result = solve(placed)
    expect(result.solvable).toBe(true)
    expect(result.moves).toEqual(['a2', 'a1'])
  })

  test('solution sequence actually solves the puzzle when replayed', () => {
    const grid = createGrid(6, 5)
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

    const result = solve(placed)
    expect(result.solvable).toBe(true)

    // Replay the solution
    let state = placed
    for (const moveId of result.moves) {
      const moveResult = executeMove(moveId, state)
      expect(moveResult.success).toBe(true)
      state = moveResult.nextState
    }
    expect(state.arrows).toHaveLength(0)
  })

  test('empty grid is trivially solved', () => {
    const grid = createGrid(5, 5)
    const result = solve(grid)
    expect(result.solvable).toBe(true)
    expect(result.moves).toEqual([])
  })
})
