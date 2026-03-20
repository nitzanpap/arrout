import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { useSettingsStore } from '../store/settings.store'
import { SOUND_ASSETS, type SoundName } from './sounds'

const players = new Map<SoundName, AudioPlayer>()
let initialized = false

const LOAD_TIMEOUT_MS = 3000
const POLL_INTERVAL_MS = 30

/**
 * Wait for a player to finish loading its audio data.
 * `createAudioPlayer` returns immediately but loads asynchronously —
 * calling play() before `isLoaded` is true silently does nothing.
 */
function waitForLoaded(player: AudioPlayer): Promise<void> {
  if (player.isLoaded) return Promise.resolve()

  return new Promise((resolve) => {
    const start = Date.now()

    const check = () => {
      if (player.isLoaded) {
        resolve()
      } else if (Date.now() - start > LOAD_TIMEOUT_MS) {
        if (__DEV__) {
          console.debug('[audio:sound-manager] Timed out waiting for player to load')
        }
        resolve()
      } else {
        setTimeout(check, POLL_INTERVAL_MS)
      }
    }
    check()
  })
}

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

    const loadPromises: Promise<void>[] = []

    for (const [name, source] of Object.entries(SOUND_ASSETS) as [SoundName, number][]) {
      try {
        const player = createAudioPlayer(source)
        players.set(name, player)
        loadPromises.push(waitForLoaded(player))
      } catch (error) {
        if (__DEV__) {
          console.debug('[audio:sound-manager] Failed to create player:', name, error)
        }
      }
    }

    await Promise.all(loadPromises)

    // Prime every player with a silent play cycle.
    // The first play() on a fresh expo-audio player initialises the native
    // audio session but swallows ~100ms of audio. By playing at volume 0 and
    // then pausing (without seeking back to 0), the player stays "primed" so
    // the next real play() produces sound immediately.
    for (const player of players.values()) {
      player.volume = 0
      player.play()
    }

    // Give the native audio pipeline time to initialise
    await new Promise((resolve) => setTimeout(resolve, 100))

    for (const player of players.values()) {
      player.pause()
      player.volume = 1
      // Intentionally NOT seeking back to 0 — the player must stay
      // at currentTime > 0 so the first real play() triggers a seek + play
      // on an already-primed audio session.
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
