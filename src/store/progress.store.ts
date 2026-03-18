import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { migrateProgress } from '../persistence/migrations'

// Award tier thresholds
const LEVEL_LEGEND_THRESHOLDS = [5, 15, 30, 50, 75, 100, 150, 200, 300, 500]
const PERFECT_PLAY_THRESHOLDS = [3, 10, 25, 50, 75, 100, 150, 200, 300, 500]
const UNSTOPPABLE_THRESHOLDS = [3, 7, 14, 21, 30, 45, 60, 90, 120, 180]

interface ProgressState {
  readonly currentLevel: number
  readonly completedLevels: readonly number[]
  readonly perfectLevels: readonly number[]
  readonly hintsAvailable: number
  readonly streak: number
  readonly longestStreak: number
  readonly lastPlayedDate: string
  readonly currentWinStreak: number
  readonly highestWinStreak: number
  readonly dailyChallenges: Record<string, 'completed' | 'failed' | 'skipped'>
  readonly levelLegendTier: number
  readonly perfectPlayTier: number
  readonly unstoppableTier: number

  // Actions
  recordLevelComplete: (levelId: number, perfect: boolean) => void
  recordDailyChallenge: (date: string, status: 'completed' | 'failed') => void
  consumeHint: () => boolean
  addHints: (count: number) => void
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function computeTier(value: number, thresholds: readonly number[]): number {
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i]) return i + 1
  }
  return 0
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      currentLevel: 1,
      completedLevels: [],
      perfectLevels: [],
      hintsAvailable: 3,
      streak: 0,
      longestStreak: 0,
      lastPlayedDate: '',
      currentWinStreak: 0,
      highestWinStreak: 0,
      dailyChallenges: {},
      levelLegendTier: 0,
      perfectPlayTier: 0,
      unstoppableTier: 0,

      recordLevelComplete: (levelId: number, perfect: boolean) => {
        const state = get()
        const today = getTodayDate()
        const isNewLevel = !state.completedLevels.includes(levelId)

        const completedLevels = isNewLevel
          ? [...state.completedLevels, levelId]
          : state.completedLevels

        const perfectLevels =
          perfect && !state.perfectLevels.includes(levelId)
            ? [...state.perfectLevels, levelId]
            : state.perfectLevels

        // Update streak
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        let newStreak = state.streak
        if (state.lastPlayedDate === yesterdayStr) {
          newStreak = state.streak + 1
        } else if (state.lastPlayedDate !== today) {
          newStreak = 1
        }

        // Win streak (consecutive levels without heart loss)
        const newWinStreak = perfect ? state.currentWinStreak + 1 : 0
        const highestWinStreak = Math.max(state.highestWinStreak, newWinStreak)

        // Advance to next level
        const nextLevel = Math.max(state.currentLevel, levelId + 1)

        set({
          currentLevel: nextLevel,
          completedLevels,
          perfectLevels,
          streak: newStreak,
          longestStreak: Math.max(state.longestStreak, newStreak),
          lastPlayedDate: today,
          currentWinStreak: newWinStreak,
          highestWinStreak,
          levelLegendTier: computeTier(completedLevels.length, LEVEL_LEGEND_THRESHOLDS),
          perfectPlayTier: computeTier(perfectLevels.length, PERFECT_PLAY_THRESHOLDS),
        })
      },

      recordDailyChallenge: (date: string, status: 'completed' | 'failed') => {
        const state = get()
        const challenges = { ...state.dailyChallenges, [date]: status }

        // Count consecutive daily completions for unstoppable tier
        let consecutiveDays = 0
        const d = new Date()
        while (true) {
          const dateStr = d.toISOString().split('T')[0]
          if (challenges[dateStr] === 'completed') {
            consecutiveDays++
            d.setDate(d.getDate() - 1)
          } else {
            break
          }
        }

        set({
          dailyChallenges: challenges,
          unstoppableTier: computeTier(consecutiveDays, UNSTOPPABLE_THRESHOLDS),
        })
      },

      consumeHint: () => {
        const { hintsAvailable } = get()
        if (hintsAvailable <= 0) return false
        set({ hintsAvailable: hintsAvailable - 1 })
        return true
      },

      addHints: (count: number) => {
        set({ hintsAvailable: get().hintsAvailable + count })
      },
    }),
    {
      name: 'arrout-progress',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: migrateProgress as (state: unknown, version: number) => ProgressState,
    }
  )
)
