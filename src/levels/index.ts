import type { Level } from '../engine/types'
import bundledLevels from './bundled.json'

/**
 * Returns a pre-generated level for the given level number.
 * All levels must exist in the bundle — no on-the-fly generation.
 */
export function getLevel(levelNumber: number): Level {
  const key = String(levelNumber)
  const bundled = (bundledLevels as Record<string, unknown>)[key]
  if (!bundled) throw new Error(`Level ${levelNumber} not found in bundle`)
  return bundled as Level
}
