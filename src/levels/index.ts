import type { Level } from '../engine/types'
import { generateLevel, generateLevelFromConfig } from '../generator'
import { configForLevel, difficultyForLevel } from '../generator/difficulty'
import bundledLevels from './bundled.json'

/**
 * Returns a level for the given level number.
 * Loads from pre-generated bundle when available, falls back to on-the-fly generation.
 */
export function getLevel(levelNumber: number): Level {
  const key = String(levelNumber)
  const bundled = (bundledLevels as Record<string, unknown>)[key]
  if (bundled) return bundled as Level

  const config = configForLevel(levelNumber)
  const difficulty = difficultyForLevel(levelNumber)
  return generateLevelFromConfig(levelNumber, difficulty, config)
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
