import { create } from 'zustand'
import { canMove, executeMove } from '../engine/move'
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

  // Animation (smooth model — no intermediate steps)
  readonly isAnimating: boolean
  readonly animationType: AnimationType
  readonly animatingArrowId: string | null
  readonly preAnimationState: GridState | null
  readonly pendingFinalState: GridState | null
  readonly errorArrowIds: readonly string[]

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
  completeValidAnimation: () => void
  completeInvalidAnimation: () => void
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

  isAnimating: false,
  animationType: null,
  animatingArrowId: null,
  preAnimationState: null,
  pendingFinalState: null,
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
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
      pendingFinalState: null,
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

    if (canMove(arrowId, gridState)) {
      // Valid move — compute final state, let Reanimated handle the visual slide
      const result = executeMove(arrowId, gridState)
      debugLog('makeMove', `valid move, arrowRemoved=${result.arrowRemoved}`)

      set({
        isAnimating: true,
        animationType: 'valid',
        animatingArrowId: arrowId,
        preAnimationState: gridState,
        pendingFinalState: result.nextState,
        selectedArrowId: null,
      })
    } else {
      // Invalid move — Reanimated will do a bump + spring back
      debugLog('makeMove', `invalid move for arrow=${arrowId}`)

      set({
        isAnimating: true,
        animationType: 'invalid',
        animatingArrowId: arrowId,
        preAnimationState: gridState,
        pendingFinalState: null,
        selectedArrowId: null,
      })
    }
  },

  completeValidAnimation: () => {
    const { pendingFinalState, preAnimationState, moveHistory, animatingArrowId, errorArrowIds } =
      get()

    if (!pendingFinalState) return

    const isWon = pendingFinalState.arrows.length === 0
    debugLog('completeValidAnimation', `isWon=${isWon}`)

    const updatedErrorIds = animatingArrowId
      ? errorArrowIds.filter((id) => id !== animatingArrowId)
      : errorArrowIds

    set({
      gridState: pendingFinalState,
      moveHistory: preAnimationState ? [...moveHistory, preAnimationState] : moveHistory,
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
      pendingFinalState: null,
      status: isWon ? 'won' : 'playing',
      errorArrowIds: updatedErrorIds,
    })
  },

  completeInvalidAnimation: () => {
    const { heartsRemaining, animatingArrowId, errorArrowIds } = get()

    const newHearts = heartsRemaining - 1
    debugLog('completeInvalidAnimation', `arrow=${animatingArrowId}, hearts=${newHearts}`)

    const updatedErrorIds = animatingArrowId
      ? [...errorArrowIds.filter((id) => id !== animatingArrowId), animatingArrowId]
      : errorArrowIds

    set({
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
      pendingFinalState: null,
      heartsRemaining: newHearts,
      status: newHearts <= 0 ? 'failed' : 'playing',
      errorArrowIds: updatedErrorIds,
    })
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
      isAnimating: false,
      animationType: null,
      animatingArrowId: null,
      preAnimationState: null,
      pendingFinalState: null,
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
