import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { useSettingsStore } from '../store/settings.store'
import { SOUND_ASSETS, type SoundName } from './sounds'

const players = new Map<SoundName, AudioPlayer>()
let initialized = false

export const SoundManager = {
  async preloadAll(): Promise<void> {
    if (initialized) return
    initialized = true

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      })
    } catch (error) {
      if (__DEV__) {
        console.debug('[audio:sound-manager] Failed to set audio mode:', error)
      }
    }

    for (const [name, source] of Object.entries(SOUND_ASSETS) as [SoundName, number][]) {
      try {
        const player = createAudioPlayer(source)
        players.set(name, player)
      } catch (error) {
        if (__DEV__) {
          console.debug('[audio:sound-manager] Failed to load sound:', name, error)
        }
      }
    }
  },

  play(name: SoundName): void {
    if (!useSettingsStore.getState().soundEnabled) return

    const player = players.get(name)
    if (!player) return

    try {
      player.seekTo(0)
      player.play()
    } catch (error) {
      if (__DEV__) {
        console.debug('[audio:sound-manager] Failed to play sound:', name, error)
      }
    }
  },

  unloadAll(): void {
    for (const player of players.values()) {
      try {
        player.remove()
      } catch {
        // already removed
      }
    }
    players.clear()
    initialized = false
  },
} as const
