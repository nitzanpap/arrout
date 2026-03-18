import { describe, expect, test } from 'bun:test'
import { executeMove } from '../../engine/move'
import { solve } from '../../engine/solver'
import { isValidPuzzle } from '../../engine/validator'
import { generateLevel } from '../index'

describe('generateLevel', () => {
  test('generates a solvable easy level', () => {
    const level = generateLevel(42, 'easy')
    expect(level.grid.arrows.length).toBeGreaterThanOrEqual(2)
    expect(level.solution.length).toBeGreaterThanOrEqual(2)
    expect(level.difficulty).toBe('easy')

    // Verify solvable by BFS solver
    const solveResult = solve(level.grid)
    expect(solveResult.solvable).toBe(true)
  })

  test('same seed produces identical level', () => {
    const a = generateLevel(42, 'easy')
    const b = generateLevel(42, 'easy')
    expect(a.grid.arrows.length).toBe(b.grid.arrows.length)
    expect(a.solution).toEqual(b.solution)
  })

  test('different seeds produce different levels', () => {
    const a = generateLevel(1, 'easy')
    const b = generateLevel(2, 'easy')
    // Compare arrow positions - very unlikely to be identical
    const posA = a.grid.arrows.flatMap((ar) => ar.cells.map((c) => `${c.row},${c.col}`)).join(';')
    const posB = b.grid.arrows.flatMap((ar) => ar.cells.map((c) => `${c.row},${c.col}`)).join(';')
    expect(posA).not.toBe(posB)
  })

  test('solution sequence actually solves the puzzle', () => {
    const level = generateLevel(100, 'easy')
    let state = level.grid

    for (const arrowId of level.solution) {
      const result = executeMove(arrowId, state)
      expect(result.success).toBe(true)
      state = result.nextState
    }

    expect(state.arrows).toHaveLength(0)
  })

  test('generated puzzle passes validation', () => {
    const level = generateLevel(42, 'easy')
    expect(isValidPuzzle(level.grid)).toBe(true)
  })

  test('generates medium difficulty level', () => {
    const level = generateLevel(42, 'medium')
    expect(level.grid.arrows.length).toBeGreaterThanOrEqual(2)
    expect(level.grid.width).toBe(9)
    expect(level.grid.height).toBe(9)
  })

  test('multiple seeds all produce solvable levels', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const level = generateLevel(seed, 'easy')
      const result = solve(level.grid)
      expect(result.solvable).toBe(true)
    }
  })
})
