import { create } from 'zustand'
import { canMove, executeMove } from '../engine/move'
import { solve } from '../engine/solver'
import type { GridState, Level } from '../engine/types'

export type GameStatus = 'idle' | 'playing' | 'won' | 'failed'

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

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
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
    })
  },

  selectArrow: (arrowId: string | null) => {
    set({ selectedArrowId: arrowId })
  },

  makeMove: (arrowId: string) => {
    const { gridState, status, heartsRemaining, moveHistory } = get()
    if (!gridState || status !== 'playing') return

    if (!canMove(arrowId, gridState)) {
      // Invalid move - lose a heart
      const newHearts = heartsRemaining - 1
      set({
        heartsRemaining: newHearts,
        selectedArrowId: null,
        status: newHearts <= 0 ? 'failed' : 'playing',
      })
      return
    }

    const result = executeMove(arrowId, gridState)
    if (!result.success) return

    const newState = result.nextState
    const isWon = newState.arrows.length === 0

    set({
      gridState: newState,
      moveHistory: [...moveHistory, gridState],
      selectedArrowId: null,
      status: isWon ? 'won' : 'playing',
    })
  },

  undo: () => {
    const { moveHistory, status } = get()
    if (moveHistory.length === 0 || status !== 'playing') return

    const previous = moveHistory[moveHistory.length - 1]
    set({
      gridState: previous,
      moveHistory: moveHistory.slice(0, -1),
      selectedArrowId: null,
    })
  },

  restart: () => {
    const { initialGridState, level } = get()
    if (!initialGridState || !level) return

    set({
      gridState: initialGridState,
      moveHistory: [],
      heartsRemaining: INITIAL_HEARTS,
      hintsUsed: 0,
      status: 'playing',
      selectedArrowId: null,
    })
  },

  useHint: () => {
    const { gridState, status } = get()
    if (!gridState || status !== 'playing') return null

    // Use the solver to find the next best move
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
