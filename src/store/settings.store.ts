import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { migrateSettings } from '../persistence/migrations'

export type ThemePreference = 'system' | 'light' | 'dark'

interface SettingsState {
  readonly soundEnabled: boolean
  readonly hapticsEnabled: boolean
  readonly theme: ThemePreference

  toggleSound: () => void
  toggleHaptics: () => void
  setTheme: (theme: ThemePreference) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      theme: 'system',

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      toggleHaptics: () => set({ hapticsEnabled: !get().hapticsEnabled }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'arrout-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: migrateSettings,
    }
  )
)
