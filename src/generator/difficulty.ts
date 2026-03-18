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
    width: 9,
    height: 9,
    targetArrowCount: 12,
    minArrowLength: 2,
    maxArrowLength: 7,
    targetMaxFreedom: 3,
    curveProbability: 0.4,
  },
  hard: {
    width: 13,
    height: 13,
    targetArrowCount: 20,
    minArrowLength: 3,
    maxArrowLength: 10,
    targetMaxFreedom: 2,
    curveProbability: 0.6,
  },
  superHard: {
    width: 18,
    height: 18,
    targetArrowCount: 40,
    minArrowLength: 4,
    maxArrowLength: 15,
    targetMaxFreedom: 1,
    curveProbability: 0.7,
  },
}

export function difficultyForLevel(n: number): Difficulty {
  if (n <= 50) return 'easy'
  if (n <= 100) return 'medium'
  if (n <= 150) return 'hard'
  return 'superHard'
}
