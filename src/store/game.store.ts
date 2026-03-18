import { create } from 'zustand'
import { executeMoveSteps } from '../engine/move'
import { solve } from '../engine/solver'
import type { GridState, Level } from '../engine/types'

const DEBUG = typeof __DEV__ !== 'undefined' && __DEV__

function debugLog(tag: string, ...args: unknown[]) {
  if (DEBUG) {
    console.debug(`[store:${tag}]`, ...args)
  }
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'failed'
export type AnimationType = 'valid' | 'invalid' | null

interface GameState {
  // Data
  readonly level: Level | null
  readonly gridState: GridState | null
  readonly initialGridState: GridState | null
  readonly moveHistory: readonly GridState[]
  readonly heartsRemaining: number
  readonly hintsUsed: number
  readonly status: GameStatus
  readonly selectedArrowId: string | null
  readonly solution: readonly string[]

  // Animation
  readonly animationSteps: readonly GridState[]
  readonly isAnimating: boolean
  readonly animationType: AnimationType
  readonly animatingArrowId: string | null
  readonly preAnimationState: GridState | null
  readonly errorArrowIds: readonly string[]

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
  advanceAnimation: () => void
  completeAnimation: () => void
  undo: () => void
  restart: () => void
  useHint: () => string | null
}

const INITIAL_HEARTS = 3

export const useGameStore = create<GameState>((set, get) => ({
  level: null,
  gridState: null,
  initialGridState: null,
  moveHistory: [],
  heartsRemaining: INITIAL_HEARTS,
  hintsUsed: 0,
  status: 'idle',
  selectedArrowId: null,
  solution: [],

  animationSteps: [],
  isAnimating: false,
  animationType: null,
  animatingArrowId: null,
  preAnimationState: null,
  errorArrowIds: [],

  loadLevel: (level: Level) => {
    set({
      level,
      gridState: level.grid,
      initialGridState: level.grid,
      moveHistory: [],
      heartsRemaining: INITIAL_HEARTS,
      hintsUsed: 0,
      status: 'playing',
      selectedArrowId: null,
      solution: level.solution,
      animationSteps: [],
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
      errorArrowIds: [],
    })
  },

  selectArrow: (arrowId: string | null) => {
    set({ selectedArrowId: arrowId })
  },

  makeMove: (arrowId: string) => {
    const { gridState, status, isAnimating } = get()
    if (!gridState || status !== 'playing' || isAnimating) {
      debugLog('makeMove', `ignored: status=${status}, isAnimating=${isAnimating}`)
      return
    }

    debugLog('makeMove', `arrow=${arrowId}, arrows on board=${gridState.arrows.length}`)

    const result = executeMoveSteps(arrowId, gridState)

    debugLog(
      'makeMove',
      `result: success=${result.success}, steps=${result.steps.length}, heartLost=${result.heartLost}`
    )

    if (result.success) {
      // Valid move: animate forward steps, arrow slides off
      set({
        animationSteps: result.steps,
        isAnimating: true,
        animationType: 'valid',
        animatingArrowId: arrowId,
        preAnimationState: gridState,
        selectedArrowId: null,
      })
    } else {
      // Invalid move: animate forward bump then bounce back to original
      set({
        animationSteps: [gridState],
        isAnimating: true,
        animationType: 'invalid',
        animatingArrowId: arrowId,
        preAnimationState: gridState,
        selectedArrowId: null,
      })
    }
  },

  advanceAnimation: () => {
    const {
      animationSteps,
      animationType,
      animatingArrowId,
      preAnimationState,
      heartsRemaining,
      moveHistory,
      errorArrowIds,
    } = get()

    if (animationSteps.length === 0) return

    const nextStep = animationSteps[0]
    const remainingSteps = animationSteps.slice(1)

    debugLog(
      'advanceAnimation',
      `type=${animationType}, remaining=${remainingSteps.length}, arrow=${animatingArrowId}`
    )

    if (remainingSteps.length > 0) {
      // More steps to play
      set({
        gridState: nextStep,
        animationSteps: remainingSteps,
      })
      return
    }

    // Last step — finalize
    if (animationType === 'valid') {
      const isWon = nextStep.arrows.length === 0
      debugLog('advanceAnimation', `valid move complete, isWon=${isWon}`)
      const updatedErrorIds = animatingArrowId
        ? errorArrowIds.filter((id) => id !== animatingArrowId)
        : errorArrowIds

      set({
        gridState: nextStep,
        moveHistory: preAnimationState ? [...moveHistory, preAnimationState] : moveHistory,
        animationSteps: [],
        isAnimating: false,
        animationType: null,
        animatingArrowId: null,
        preAnimationState: null,
        status: isWon ? 'won' : 'playing',
        errorArrowIds: updatedErrorIds,
      })
    } else {
      // Invalid move — bounce back complete, lose heart, mark arrow red
      const newHearts = heartsRemaining - 1
      debugLog(
        'advanceAnimation',
        `invalid move complete, arrow=${animatingArrowId}, hearts=${newHearts}`
      )
      const updatedErrorIds = animatingArrowId
        ? [...errorArrowIds.filter((id) => id !== animatingArrowId), animatingArrowId]
        : errorArrowIds

      set({
        gridState: nextStep,
        animationSteps: [],
        isAnimating: false,
        animationType: null,
        animatingArrowId: null,
        preAnimationState: null,
        heartsRemaining: newHearts,
        status: newHearts <= 0 ? 'failed' : 'playing',
        errorArrowIds: updatedErrorIds,
      })
    }
  },

  completeAnimation: () => {
    const { animationSteps } = get()
    if (animationSteps.length === 0) return

    // Jump to the last step immediately
    const finalStep = animationSteps[animationSteps.length - 1]
    set({
      gridState: finalStep,
      animationSteps: [finalStep],
    })
    // Then let advanceAnimation handle finalization
    get().advanceAnimation()
  },

  undo: () => {
    const { moveHistory, status, isAnimating } = get()
    if (moveHistory.length === 0 || status !== 'playing' || isAnimating) return

    const previous = moveHistory[moveHistory.length - 1]
    set({
      gridState: previous,
      moveHistory: moveHistory.slice(0, -1),
      selectedArrowId: null,
    })
  },

  restart: () => {
    const { initialGridState, level, isAnimating } = get()
    if (!initialGridState || !level || isAnimating) return

    set({
      gridState: initialGridState,
      moveHistory: [],
      heartsRemaining: INITIAL_HEARTS,
      hintsUsed: 0,
      status: 'playing',
      selectedArrowId: null,
      errorArrowIds: [],
      animationSteps: [],
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
    })
  },

  useHint: () => {
    const { gridState, status, isAnimating } = get()
    if (!gridState || status !== 'playing' || isAnimating) return null

    const result = solve(gridState)
    if (!result.solvable || result.moves.length === 0) return null

    const hintArrowId = result.moves[0]
    set({
      selectedArrowId: hintArrowId,
      hintsUsed: get().hintsUsed + 1,
    })
    return hintArrowId
  },
}))
