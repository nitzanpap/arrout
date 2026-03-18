import type { Level } from '../engine/types'
import { generateLevel } from '../generator'
import { difficultyForLevel } from '../generator/difficulty'

/**
 * Returns a level for the given level number.
 * Levels 1-50: handcrafted static levels (will load from JSON once created)
 * Levels 51+: procedurally generated using the level number as seed
 */
export function getLevel(levelNumber: number): Level {
  // For now, all levels are generated. Static levels will be added later.
  const difficulty = difficultyForLevel(levelNumber)
  return generateLevel(levelNumber, difficulty)
}

/**
 * Returns a daily challenge level based on today's date.
 * The seed is derived from the date string to ensure consistency.
 */
export function getDailyChallenge(dateStr: string): Level {
  const seed = hashDateString(dateStr)
  return generateLevel(seed, 'medium')
}

function hashDateString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return Math.abs(hash)
}
