/**
 * Mulberry32 - lightweight seedable PRNG.
 * Returns a function that produces deterministic floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Utility wrapper around a seeded PRNG with convenient methods.
 */
export interface SeededRng {
  /** Returns a float in [0, 1) */
  next(): number
  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number
  /** Returns true with given probability (default 0.5) */
  nextBool(probability?: number): boolean
  /** Returns a random element from the array */
  pick<T>(array: readonly T[]): T
  /** Returns a shuffled copy of the array (Fisher-Yates) */
  shuffle<T>(array: readonly T[]): T[]
}

export function createRng(seed: number): SeededRng {
  const raw = mulberry32(seed)

  return {
    next: raw,

    nextInt(min: number, max: number): number {
      return Math.floor(raw() * (max - min + 1)) + min
    },

    nextBool(probability = 0.5): boolean {
      return raw() < probability
    },

    pick<T>(array: readonly T[]): T {
      return array[Math.floor(raw() * array.length)]
    },

    shuffle<T>(array: readonly T[]): T[] {
      const result = [...array]
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(raw() * (i + 1))
        const tmp = result[i]
        result[i] = result[j]
        result[j] = tmp
      }
      return result
    },
  }
}
