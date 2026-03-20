export const SoundName = {
  ValidMove: 'validMove',
  InvalidMove: 'invalidMove',
  Tap: 'tap',
  LevelComplete: 'levelComplete',
} as const

export type SoundName = (typeof SoundName)[keyof typeof SoundName]

// Static require() calls — Metro bundler needs these at compile time
export const SOUND_ASSETS: Record<SoundName, number> = {
  [SoundName.ValidMove]: require('../../assets/sounds/valid-move.wav'),
  [SoundName.InvalidMove]: require('../../assets/sounds/invalid-move.wav'),
  [SoundName.Tap]: require('../../assets/sounds/tap.wav'),
  [SoundName.LevelComplete]: require('../../assets/sounds/level-complete.wav'),
}
