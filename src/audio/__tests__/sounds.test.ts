import { describe, expect, mock, test } from 'bun:test'

// Mock require() calls for .wav files — bun can't parse binary assets
mock.module('../../../assets/sounds/valid-move.wav', () => ({ default: 1 }))
mock.module('../../../assets/sounds/invalid-move.wav', () => ({ default: 2 }))
mock.module('../../../assets/sounds/tap.wav', () => ({ default: 3 }))
mock.module('../../../assets/sounds/level-complete.wav', () => ({ default: 4 }))

const { SoundName, SOUND_ASSETS } = await import('../sounds')

describe('SoundName', () => {
  test('defines all expected sound names', () => {
    expect(SoundName.ValidMove).toBe('validMove')
    expect(SoundName.InvalidMove).toBe('invalidMove')
    expect(SoundName.Tap).toBe('tap')
    expect(SoundName.LevelComplete).toBe('levelComplete')
  })

  test('has exactly 4 sound names', () => {
    const names = Object.values(SoundName)
    expect(names.length).toBe(4)
  })
})

describe('SOUND_ASSETS', () => {
  test('has an asset for every sound name', () => {
    for (const name of Object.values(SoundName)) {
      expect(SOUND_ASSETS[name]).toBeDefined()
    }
  })

  test('has no extra entries beyond defined sound names', () => {
    const assetKeys = Object.keys(SOUND_ASSETS)
    const soundNames = Object.values(SoundName)
    expect(assetKeys.length).toBe(soundNames.length)
  })
})
