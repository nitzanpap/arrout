/**
 * Pre-generates levels and writes them to src/levels/bundled.json.
 * Run with: bun run scripts/generate-levels.ts
 */

import { executeMove } from '../src/engine/move'
import type { GridState, Level } from '../src/engine/types'
import { generateLevelFromConfig } from '../src/generator'
import { configForLevel, difficultyForLevel } from '../src/generator/difficulty'

const TOTAL_LEVELS = 500

interface BundledLevel {
  readonly id: number
  readonly difficulty: string
  readonly grid: Level['grid']
  readonly solution: readonly string[]
}

function verifySolution(level: Level, levelNumber: number): void {
  let state: GridState = level.grid

  for (const arrowId of level.solution) {
    const result = executeMove(arrowId, state)
    if (!result.success) {
      throw new Error(`Level ${levelNumber}: move ${arrowId} failed during solution verification`)
    }
    state = result.nextState
  }

  if (state.arrows.length !== 0) {
    throw new Error(
      `Level ${levelNumber}: solution did not clear all arrows (${state.arrows.length} remaining)`
    )
  }
}

function generateAllLevels(): Record<string, BundledLevel> {
  const levels: Record<string, BundledLevel> = {}
  let totalTime = 0
  let fallbackCount = 0

  for (let n = 1; n <= TOTAL_LEVELS; n++) {
    const start = performance.now()
    const config = configForLevel(n)
    const difficulty = difficultyForLevel(n)
    const level = generateLevelFromConfig(n, difficulty, config)
    const elapsed = performance.now() - start

    // Verify the solution is valid
    verifySolution(level, n)

    totalTime += elapsed

    const arrowCount = level.grid.arrows.length
    const gridSize = `${level.grid.width}x${level.grid.height}`
    const targetMet = arrowCount >= config.targetArrowCount * 0.8

    if (!targetMet) {
      fallbackCount++
      console.warn(
        `  ⚠ Level ${String(n).padStart(3)}: ${difficulty.padEnd(9)} ${gridSize.padEnd(5)} ${arrowCount}/${config.targetArrowCount} arrows (fallback)  ${elapsed.toFixed(0)}ms`
      )
    } else {
      console.log(
        `Level ${String(n).padStart(3)}: ${difficulty.padEnd(9)} ${gridSize.padEnd(5)} ${arrowCount} arrows  ${elapsed.toFixed(0)}ms`
      )
    }

    levels[String(n)] = {
      id: level.id,
      difficulty: level.difficulty,
      grid: level.grid,
      solution: level.solution,
    }
  }

  console.log(`\nGenerated ${TOTAL_LEVELS} levels in ${(totalTime / 1000).toFixed(1)}s`)
  if (fallbackCount > 0) {
    console.warn(`${fallbackCount} levels fell back to reduced arrow count`)
  }
  return levels
}

const levels = generateAllLevels()
const json = JSON.stringify(levels)
const outputPath = new URL('../src/levels/bundled.json', import.meta.url).pathname

await Bun.write(outputPath, json)

const sizeMb = (json.length / 1024 / 1024).toFixed(1)
console.log(`Written to ${outputPath} (${sizeMb}MB)`)
