import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// React Native global — not defined in bun's test runner
// @ts-expect-error — __DEV__ is declared by RN's type definitions
globalThis.__DEV__ = true

// ── Mock .wav assets (must come before any import that touches sounds.ts) ──

mock.module('../../../assets/sounds/valid-move.wav', () => ({ default: 1 }))
mock.module('../../../assets/sounds/invalid-move.wav', () => ({ default: 2 }))
mock.module('../../../assets/sounds/tap.wav', () => ({ default: 3 }))
mock.module('../../../assets/sounds/level-complete.wav', () => ({ default: 4 }))

// ── Mock expo-audio ──────────────────────────────────────────────────────

function createMockPlayer() {
  return {
    play: mock(() => {}),
    pause: mock(() => {}),
    seekTo: mock(() => Promise.resolve()),
    remove: mock(() => {}),
    replace: mock(() => {}),
    isLoaded: true,
    currentTime: 0,
    volume: 1,
  }
}

const mockPlayers: ReturnType<typeof createMockPlayer>[] = []
const mockSetAudioModeAsync = mock(() => Promise.resolve())

mock.module('expo-audio', () => ({
  createAudioPlayer: mock(() => {
    const player = createMockPlayer()
    mockPlayers.push(player)
    return player
  }),
  setAudioModeAsync: mockSetAudioModeAsync,
}))

// ── Mock settings store ──────────────────────────────────────────────────

let soundEnabled = true

mock.module('../../store/settings.store', () => ({
  useSettingsStore: {
    getState: () => ({ soundEnabled }),
  },
}))

// ── Must import after mocks are registered ───────────────────────────────

const { SoundManager } = await import('../sound-manager')
const { SoundName } = await import('../sounds')

// ── Tests ────────────────────────────────────────────────────────────────

describe('SoundManager', () => {
  beforeEach(() => {
    SoundManager.unloadAll()
    mockPlayers.length = 0
    soundEnabled = true
  })

  afterEach(() => {
    SoundManager.unloadAll()
  })

  describe('preloadAll', () => {
    test('sets audio mode for silent-mode playback', async () => {
      await SoundManager.preloadAll()

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        playsInSilentMode: true,
      })
    })

    test('creates one player per sound asset', async () => {
      await SoundManager.preloadAll()

      expect(mockPlayers.length).toBe(4)
    })

    test('primes players with a silent play cycle', async () => {
      await SoundManager.preloadAll()

      for (const player of mockPlayers) {
        expect(player.play).toHaveBeenCalled()
        expect(player.pause).toHaveBeenCalled()
      }
    })

    test('restores volume to 1 after priming', async () => {
      await SoundManager.preloadAll()

      for (const player of mockPlayers) {
        expect(player.volume).toBe(1)
      }
    })

    test('only initialises once on repeated calls', async () => {
      await SoundManager.preloadAll()
      const countAfterFirst = mockPlayers.length

      await SoundManager.preloadAll()

      expect(mockPlayers.length).toBe(countAfterFirst)
    })
  })

  describe('play', () => {
    test('seeks to start and plays', async () => {
      await SoundManager.preloadAll()
      const player = mockPlayers[0]
      player.seekTo.mockClear()
      player.play.mockClear()

      SoundManager.play(SoundName.ValidMove)

      expect(player.seekTo).toHaveBeenCalledWith(0)
      expect(player.play).toHaveBeenCalled()
    })

    test('does not play when sound is disabled', async () => {
      await SoundManager.preloadAll()
      soundEnabled = false
      const player = mockPlayers[0]
      player.play.mockClear()

      SoundManager.play(SoundName.ValidMove)

      expect(player.play).not.toHaveBeenCalled()
    })

    test('does nothing when player does not exist', () => {
      // No preload — players map is empty
      expect(() => SoundManager.play(SoundName.Tap)).not.toThrow()
    })

    test('plays different sounds on the correct player', async () => {
      await SoundManager.preloadAll()

      // Players are created in SOUND_ASSETS iteration order:
      // validMove=0, invalidMove=1, tap=2, levelComplete=3
      for (const player of mockPlayers) {
        player.play.mockClear()
      }

      SoundManager.play(SoundName.InvalidMove)

      expect(mockPlayers[0].play).not.toHaveBeenCalled()
      expect(mockPlayers[1].play).toHaveBeenCalled()
      expect(mockPlayers[2].play).not.toHaveBeenCalled()
      expect(mockPlayers[3].play).not.toHaveBeenCalled()
    })
  })

  describe('unloadAll', () => {
    test('removes all players', async () => {
      await SoundManager.preloadAll()

      SoundManager.unloadAll()

      for (const player of mockPlayers) {
        expect(player.remove).toHaveBeenCalled()
      }
    })

    test('allows re-initialisation after unload', async () => {
      await SoundManager.preloadAll()
      const countAfterFirst = mockPlayers.length

      SoundManager.unloadAll()
      await SoundManager.preloadAll()

      expect(mockPlayers.length).toBe(countAfterFirst * 2)
    })

    test('does not throw when called without preload', () => {
      expect(() => SoundManager.unloadAll()).not.toThrow()
    })
  })
})
