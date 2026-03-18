import type { Difficulty, Level } from '../engine/types'
import { DIFFICULTY_CONFIGS } from './difficulty'
import { createRng } from './prng'
import { reverseConstruct } from './reverse-builder'

const MAX_RETRIES = 10

/**
 * Generates a level for the given seed and difficulty.
 * Deterministic: same seed + difficulty always produces the same level.
 * Retries with seed offsets if generation fails.
 */
export function generateLevel(seed: number, difficulty: Difficulty): Level {
  const config = DIFFICULTY_CONFIGS[difficulty]

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const rng = createRng(seed + attempt)
    const result = reverseConstruct(config, rng)

    if (result) {
      // Solution is the reverse of placement order
      const solution = [...result.placementOrder].reverse()
      return {
        id: seed,
        difficulty,
        grid: result.grid,
        solution,
      }
    }
  }

  // If all retries fail, generate with easier config
  const easierConfig = {
    ...config,
    targetArrowCount: Math.max(2, Math.floor(config.targetArrowCount / 2)),
  }
  const rng = createRng(seed + MAX_RETRIES)
  const result = reverseConstruct(easierConfig, rng)

  if (!result) {
    throw new Error(`Failed to generate level for seed ${seed} after ${MAX_RETRIES + 1} attempts`)
  }

  const solution = [...result.placementOrder].reverse()
  return {
    id: seed,
    difficulty,
    grid: result.grid,
    solution,
  }
}
