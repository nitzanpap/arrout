import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface SettingsState {
  readonly soundEnabled: boolean
  readonly hapticsEnabled: boolean
  readonly theme: 'dark'

  toggleSound: () => void
  toggleHaptics: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      theme: 'dark',

      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      toggleHaptics: () => set({ hapticsEnabled: !get().hapticsEnabled }),
    }),
    {
      name: 'arrout-settings',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
)
