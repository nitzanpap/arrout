import { useColorScheme } from 'react-native'
import { useSettingsStore } from '../store/settings.store'

export interface ThemeColors {
  readonly background: string
  readonly headerBand: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly accent: string
  readonly arrowColor: string
  readonly arrowError: string
  readonly arrowHint: string
  readonly heartFilled: string
  readonly heartEmpty: string
  readonly buttonBg: string
  readonly buttonIcon: string
  readonly overlayBg: string
  readonly overlayCard: string
  readonly gridLine: string
  readonly difficultyLabel: string
  readonly progressBar: string
  readonly progressBarTrack: string
  readonly gridLinesFull: string
  readonly directionPreview: string
  readonly toggleKnob: string
  readonly toggleTrackOff: string
  readonly touchRipple: string
  readonly touchRippleOuter: string
  /** @deprecated dots are now always shown */
  readonly showGridDots?: boolean
}

export const lightColors: ThemeColors = {
  background: '#F5F3FA',
  headerBand: '#E6E1F2',
  textPrimary: '#1A1A2E',
  textSecondary: '#7B7D96',
  accent: '#6C5CE7',
  arrowColor: '#1A1A2E',
  arrowError: '#FF6B8A',
  arrowHint: '#3B82F6',
  heartFilled: '#FF4A6A',
  heartEmpty: '#C7C2E0',
  buttonBg: '#C8C0E0',
  buttonIcon: '#6C5CE7',
  overlayBg: 'rgba(245,243,250,0.92)',
  overlayCard: '#FFFFFF',
  gridLine: 'rgba(0,0,0,0.08)',
  difficultyLabel: '#E8457A',
  progressBar: '#6C5CE7',
  progressBarTrack: 'rgba(108, 92, 231, 0.32)',
  gridLinesFull: 'rgba(0, 0, 0, 0.10)',
  directionPreview: 'rgba(59, 130, 246, 0.35)',
  toggleKnob: '#FFFFFF',
  toggleTrackOff: '#C8C4D6',
  touchRipple: 'rgba(0, 0, 0, 0.12)',
  touchRippleOuter: 'rgba(0, 0, 0, 0.06)',
  showGridDots: true,
}

export const darkColors: ThemeColors = {
  background: '#141829',
  headerBand: '#141829',
  textPrimary: '#EEF0FF',
  textSecondary: '#6C7099',
  accent: '#7B77FF',
  arrowColor: '#A8ADDE',
  arrowError: '#FF4A6A',
  arrowHint: '#60A5FA',
  heartFilled: '#FF4A6A',
  heartEmpty: '#3A3D55',
  buttonBg: '#1E2238',
  buttonIcon: '#BFC3E0',
  overlayBg: 'rgba(15,17,32,0.9)',
  overlayCard: '#161929',
  gridLine: 'rgba(200,206,255,0.18)',
  difficultyLabel: '#FF6B8A',
  progressBar: '#7B77FF',
  progressBarTrack: 'rgba(123, 119, 255, 0.15)',
  gridLinesFull: 'rgba(200, 206, 255, 0.10)',
  directionPreview: 'rgba(96, 165, 250, 0.4)',
  toggleKnob: '#FFFFFF',
  toggleTrackOff: '#3A3D55',
  touchRipple: 'rgba(255, 255, 255, 0.15)',
  touchRippleOuter: 'rgba(255, 255, 255, 0.08)',
  showGridDots: false,
}

export function useResolvedScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme()
  const theme = useSettingsStore((s) => s.theme)
  const effective = theme === 'system' ? systemScheme : theme
  return effective === 'light' ? 'light' : 'dark'
}

export function useThemeColors(): ThemeColors {
  const scheme = useResolvedScheme()
  return scheme === 'light' ? lightColors : darkColors
}

export { NEON_PALETTE, pickNeonColor } from './neon'
