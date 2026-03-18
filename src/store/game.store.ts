import { create } from 'zustand'
import { removeArrow } from '../engine/grid'
import { canMove, executeMove } from '../engine/move'
import type { GridState, Level } from '../engine/types'

const DEBUG = typeof __DEV__ !== 'undefined' && __DEV__

function debugLog(tag: string, ...args: unknown[]) {
  if (DEBUG) {
    console.debug(`[store:${tag}]`, ...args)
  }
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'failed'

export interface AnimationEntry {
  readonly type: 'valid' | 'invalid'
  readonly pendingFinalState: GridState | null // only for valid
}

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

  // Animation (concurrent — per-arrow)
  readonly activeAnimations: ReadonlyMap<string, AnimationEntry>
  readonly projectedGridState: GridState | null
  readonly errorArrowIds: readonly string[]

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
  completeValidAnimation: (arrowId: string) => void
  completeInvalidAnimation: (arrowId: string) => void
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

  activeAnimations: new Map(),
  projectedGridState: null,
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
      activeAnimations: new Map(),
      projectedGridState: level.grid,
      errorArrowIds: [],
    })
  },

  selectArrow: (arrowId: string | null) => {
    set({ selectedArrowId: arrowId })
  },

  makeMove: (arrowId: string) => {
    const { projectedGridState, status, activeAnimations } = get()
    if (!projectedGridState || status !== 'playing') {
      debugLog('makeMove', `ignored: status=${status}`)
      return
    }

    // Don't allow a move for an arrow already animating
    if (activeAnimations.has(arrowId)) {
      debugLog('makeMove', `ignored: arrow ${arrowId} already animating`)
      return
    }

    // Check if this arrow exists in the projected state
    const arrowExists = projectedGridState.arrows.some((a) => a.id === arrowId)
    if (!arrowExists) {
      debugLog('makeMove', `ignored: arrow ${arrowId} not in projected state`)
      return
    }

    debugLog('makeMove', `arrow=${arrowId}, arrows on board=${projectedGridState.arrows.length}`)

    if (canMove(arrowId, projectedGridState)) {
      const result = executeMove(arrowId, projectedGridState)
      debugLog('makeMove', `valid move, arrowRemoved=${result.arrowRemoved}`)

      const newAnimations = new Map(activeAnimations)
      newAnimations.set(arrowId, {
        type: 'valid',
        pendingFinalState: result.nextState,
      })

      set({
        activeAnimations: newAnimations,
        projectedGridState: result.nextState,
        selectedArrowId: null,
      })
    } else {
      debugLog('makeMove', `invalid move for arrow=${arrowId}`)

      const newAnimations = new Map(activeAnimations)
      newAnimations.set(arrowId, {
        type: 'invalid',
        pendingFinalState: null,
      })

      set({
        activeAnimations: newAnimations,
        selectedArrowId: null,
      })
    }
  },

  completeValidAnimation: (arrowId: string) => {
    const { activeAnimations, gridState, moveHistory, errorArrowIds } = get()
    const entry = activeAnimations.get(arrowId)
    if (!entry || entry.type !== 'valid' || !gridState) return

    const newGridState = removeArrow(gridState, arrowId)

    const newAnimations = new Map(activeAnimations)
    newAnimations.delete(arrowId)

    const isWon = newGridState.arrows.length === 0 && newAnimations.size === 0
    debugLog('completeValidAnimation', `arrow=${arrowId}, isWon=${isWon}`)

    set({
      gridState: newGridState,
      moveHistory: [...moveHistory, gridState],
      activeAnimations: newAnimations,
      status: isWon ? 'won' : 'playing',
      errorArrowIds: errorArrowIds.filter((id) => id !== arrowId),
    })
  },

  completeInvalidAnimation: (arrowId: string) => {
    const { heartsRemaining, activeAnimations, errorArrowIds } = get()

    const newHearts = heartsRemaining - 1
    debugLog('completeInvalidAnimation', `arrow=${arrowId}, hearts=${newHearts}`)

    const newAnimations = new Map(activeAnimations)
    newAnimations.delete(arrowId)

    set({
      activeAnimations: newAnimations,
      heartsRemaining: newHearts,
      status: newHearts <= 0 ? 'failed' : 'playing',
      errorArrowIds: [...errorArrowIds.filter((id) => id !== arrowId), arrowId],
    })
  },

  undo: () => {
    const { moveHistory, status, activeAnimations } = get()
    if (moveHistory.length === 0 || status !== 'playing' || activeAnimations.size > 0) return

    const previous = moveHistory[moveHistory.length - 1]
    set({
      gridState: previous,
      projectedGridState: previous,
      moveHistory: moveHistory.slice(0, -1),
      selectedArrowId: null,
    })
  },

  restart: () => {
    const { initialGridState, level, activeAnimations } = get()
    if (!initialGridState || !level || activeAnimations.size > 0) return

    set({
      gridState: initialGridState,
      projectedGridState: initialGridState,
      moveHistory: [],
      heartsRemaining: INITIAL_HEARTS,
      hintsUsed: 0,
      status: 'playing',
      selectedArrowId: null,
      errorArrowIds: [],
      activeAnimations: new Map(),
    })
  },

  useHint: () => {
    const { projectedGridState, status, activeAnimations, solution } = get()
    if (!projectedGridState || status !== 'playing' || activeAnimations.size > 0) return null

    const remainingIds = new Set(projectedGridState.arrows.map((a) => a.id))
    const hintArrowId = solution.find((id) => remainingIds.has(id)) ?? null
    if (!hintArrowId) return null

    set({
      selectedArrowId: hintArrowId,
      hintsUsed: get().hintsUsed + 1,
    })
    return hintArrowId
  },
}))
