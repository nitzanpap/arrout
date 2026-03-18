/**
 * Pre-generates levels and writes them to src/levels/bundled.json.
 * Run with: bun run scripts/generate-levels.ts
 */

import type { Level } from '../src/engine/types'
import { generateLevelFromConfig } from '../src/generator'
import { configForLevel, difficultyForLevel } from '../src/generator/difficulty'

const TOTAL_LEVELS = 200

interface BundledLevel {
  readonly id: number
  readonly difficulty: string
  readonly grid: Level['grid']
  readonly solution: readonly string[]
}

function generateAllLevels(): Record<string, BundledLevel> {
  const levels: Record<string, BundledLevel> = {}
  let totalTime = 0

  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const start = performance.now()
    const config = configForLevel(n)
    const difficulty = difficultyForLevel(n)
    const level = generateLevelFromConfig(n, difficulty, config)
    const elapsed = performance.now() - start

    totalTime += elapsed

    levels[String(n)] = {
      id: level.id,
      difficulty: level.difficulty,
      grid: level.grid,
      solution: level.solution,
    }

    const arrowCount = level.grid.arrows.length
    const gridSize = `${level.grid.width}x${level.grid.height}`
    console.log(
      `Level ${String(n).padStart(3)}: ${difficulty.padEnd(9)} ${gridSize.padEnd(5)} ${arrowCount} arrows  ${elapsed.toFixed(0)}ms`
    )
  }

  console.log(`\nGenerated ${TOTAL_LEVELS} levels in ${(totalTime / 1000).toFixed(1)}s`)
  return levels
}

const levels = generateAllLevels()
const json = JSON.stringify(levels)
const outputPath = new URL('../src/levels/bundled.json', import.meta.url).pathname

await Bun.write(outputPath, json)

const sizeKb = (json.length / 1024).toFixed(0)
console.log(`Written to ${outputPath} (${sizeKb}KB)`)
