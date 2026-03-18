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
  readonly heartFilled: string
  readonly heartEmpty: string
  readonly buttonBg: string
  readonly buttonIcon: string
  readonly overlayBg: string
  readonly overlayCard: string
  readonly gridLine: string
}

export const lightColors: ThemeColors = {
  background: '#FFFFFF',
  headerBand: '#EEEAF8',
  textPrimary: '#1A1A2E',
  textSecondary: '#8B8DA3',
  accent: '#6C5CE7',
  arrowColor: '#1A1A2E',
  arrowError: '#FF6B8A',
  heartFilled: '#FF4A6A',
  heartEmpty: '#C7C2E0',
  buttonBg: '#E8E3F8',
  buttonIcon: '#6C5CE7',
  overlayBg: 'rgba(255,255,255,0.92)',
  overlayCard: '#FFFFFF',
  gridLine: 'rgba(0,0,0,0.04)',
}

export const darkColors: ThemeColors = {
  background: '#0F1120',
  headerBand: '#161929',
  textPrimary: '#EEF0FF',
  textSecondary: '#6C7099',
  accent: '#7B77FF',
  arrowColor: '#8B8FC7',
  arrowError: '#FF4A6A',
  heartFilled: '#FF4A6A',
  heartEmpty: '#2A2D42',
  buttonBg: '#2A2D42',
  buttonIcon: '#A0A4C8',
  overlayBg: 'rgba(15,17,32,0.9)',
  overlayCard: '#161929',
  gridLine: 'rgba(200,206,255,0.08)',
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
