import type { Difficulty } from '../engine/types'

export interface GeneratorConfig {
  readonly width: number
  readonly height: number
  readonly targetArrowCount: number
  readonly minArrowLength: number
  readonly maxArrowLength: number
  readonly targetMaxFreedom: number
  readonly curveProbability: number
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, GeneratorConfig> = {
  easy: {
    width: 6,
    height: 6,
    targetArrowCount: 6,
    minArrowLength: 2,
    maxArrowLength: 4,
    targetMaxFreedom: 4,
    curveProbability: 0.2,
  },
  medium: {
    width: 10,
    height: 10,
    targetArrowCount: 15,
    minArrowLength: 2,
    maxArrowLength: 7,
    targetMaxFreedom: 3,
    curveProbability: 0.45,
  },
  hard: {
    width: 14,
    height: 14,
    targetArrowCount: 30,
    minArrowLength: 3,
    maxArrowLength: 10,
    targetMaxFreedom: 2,
    curveProbability: 0.6,
  },
  superHard: {
    width: 18,
    height: 18,
    targetArrowCount: 50,
    minArrowLength: 4,
    maxArrowLength: 15,
    targetMaxFreedom: 1,
    curveProbability: 0.7,
  },
}

export function difficultyForLevel(n: number): Difficulty {
  if (n <= 3) return 'easy'
  if (n <= 8) return 'medium'
  if (n <= 20) return 'hard'
  return 'superHard'
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function lerpFloat(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function interpolateConfig(from: GeneratorConfig, to: GeneratorConfig, t: number): GeneratorConfig {
  return {
    width: lerp(from.width, to.width, t),
    height: lerp(from.height, to.height, t),
    targetArrowCount: lerp(from.targetArrowCount, to.targetArrowCount, t),
    minArrowLength: lerp(from.minArrowLength, to.minArrowLength, t),
    maxArrowLength: lerp(from.maxArrowLength, to.maxArrowLength, t),
    targetMaxFreedom: lerp(from.targetMaxFreedom, to.targetMaxFreedom, t),
    curveProbability: lerpFloat(from.curveProbability, to.curveProbability, t),
  }
}

/**
 * Returns an interpolated GeneratorConfig for the given level number.
 * Gradually ramps difficulty instead of flat 50-level tiers.
 */
export function configForLevel(n: number): GeneratorConfig {
  if (n <= 3) return DIFFICULTY_CONFIGS.easy
  if (n <= 8)
    return interpolateConfig(DIFFICULTY_CONFIGS.easy, DIFFICULTY_CONFIGS.medium, (n - 3) / 5)
  if (n <= 20)
    return interpolateConfig(DIFFICULTY_CONFIGS.medium, DIFFICULTY_CONFIGS.hard, (n - 8) / 12)
  if (n <= 50)
    return interpolateConfig(DIFFICULTY_CONFIGS.hard, DIFFICULTY_CONFIGS.superHard, (n - 20) / 30)
  return DIFFICULTY_CONFIGS.superHard
}
