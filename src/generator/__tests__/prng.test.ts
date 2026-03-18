import { describe, expect, test } from 'bun:test'
import { createRng, mulberry32 } from '../prng'

describe('mulberry32', () => {
  test('produces deterministic sequence for same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b())
    }
  })

  test('different seeds produce different sequences', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const results = new Set<number>()
    for (let i = 0; i < 10; i++) {
      const va = a()
      const vb = b()
      // At least some values should differ
      results.add(va)
      results.add(vb)
    }
    expect(results.size).toBeGreaterThan(1)
  })

  test('values are in [0, 1)', () => {
    const rng = mulberry32(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('createRng', () => {
  test('nextInt returns values in range', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      const v = rng.nextInt(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
    }
  })

  test('nextBool respects probability', () => {
    const rng = createRng(42)
    let trueCount = 0
    const trials = 10000
    for (let i = 0; i < trials; i++) {
      if (rng.nextBool(0.3)) trueCount++
    }
    const ratio = trueCount / trials
    expect(ratio).toBeGreaterThan(0.25)
    expect(ratio).toBeLessThan(0.35)
  })

  test('shuffle returns all elements', () => {
    const rng = createRng(42)
    const arr = [1, 2, 3, 4, 5]
    const shuffled = rng.shuffle(arr)
    expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5])
  })

  test('shuffle does not mutate original', () => {
    const rng = createRng(42)
    const arr = [1, 2, 3, 4, 5]
    rng.shuffle(arr)
    expect(arr).toEqual([1, 2, 3, 4, 5])
  })

  test('pick returns element from array', () => {
    const rng = createRng(42)
    const arr = ['a', 'b', 'c']
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr))
    }
  })
})
