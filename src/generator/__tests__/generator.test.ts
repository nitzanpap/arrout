import { describe, expect, test } from 'bun:test'
import { executeMove } from '../../engine/move'
import { solve } from '../../engine/solver'
import { isValidPuzzle } from '../../engine/validator'
import { configForLevel } from '../difficulty'
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
    expect(level.grid.width).toBe(10)
    expect(level.grid.height).toBe(10)
  })

  test('multiple seeds all produce solvable levels', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const level = generateLevel(seed, 'easy')
      const result = solve(level.grid)
      expect(result.solvable).toBe(true)
    }
  })

  test('hard level has sufficient density', () => {
    const level = generateLevel(42, 'hard')
    expect(level.grid.width).toBe(14)
    expect(level.grid.height).toBe(14)
    expect(level.grid.arrows.length).toBeGreaterThanOrEqual(20)
    expect(isValidPuzzle(level.grid)).toBe(true)
  })

  test('hard level solution is valid', () => {
    const level = generateLevel(42, 'hard')
    let state = level.grid

    for (const arrowId of level.solution) {
      const result = executeMove(arrowId, state)
      expect(result.success).toBe(true)
      state = result.nextState
    }

    expect(state.arrows).toHaveLength(0)
  })

  test('superHard level solution is valid', () => {
    const level = generateLevel(42, 'superHard')
    expect(level.grid.width).toBe(18)
    expect(level.grid.height).toBe(18)
    let state = level.grid

    for (const arrowId of level.solution) {
      const result = executeMove(arrowId, state)
      expect(result.success).toBe(true)
      state = result.nextState
    }

    expect(state.arrows).toHaveLength(0)
  })

  test('configForLevel interpolation produces expected values', () => {
    // Level 5 should be interpolated between easy and medium
    const config5 = configForLevel(5)
    expect(config5.width).toBeGreaterThanOrEqual(7)
    expect(config5.width).toBeLessThanOrEqual(10)
    expect(config5.targetArrowCount).toBeGreaterThanOrEqual(8)

    // Level 10 should be interpolated between medium and hard
    const config10 = configForLevel(10)
    expect(config10.width).toBeGreaterThanOrEqual(10)
    expect(config10.targetArrowCount).toBeGreaterThanOrEqual(17)

    // Level 20 should be pure hard
    const config20 = configForLevel(20)
    expect(config20.width).toBe(14)
    expect(config20.targetArrowCount).toBe(30)
  })
})
