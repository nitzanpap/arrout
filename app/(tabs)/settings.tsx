import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { version as appVersion } from '../../package.json'
import type { ThemePreference } from '../../src/store/settings.store'
import { useSettingsStore } from '../../src/store/settings.store'
import { useThemeColors } from '../../src/theme/colors'

function ToggleRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string
  value: boolean
  onToggle: () => void
  colors: { textPrimary: string; accent: string; buttonBg: string; textSecondary: string }
}) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[styles.toggle, { backgroundColor: value ? colors.accent : colors.buttonBg }]}>
        <View
          style={[
            styles.toggleKnob,
            {
              backgroundColor: value ? colors.textPrimary : colors.textSecondary,
              alignSelf: value ? 'flex-end' : 'flex-start',
            },
          ]}
        />
      </View>
    </Pressable>
  )
}

const THEME_OPTIONS: readonly { readonly value: ThemePreference; readonly label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

function ThemeSelector({
  value,
  onSelect,
  colors,
}: {
  value: ThemePreference
  onSelect: (theme: ThemePreference) => void
  colors: { accent: string; textPrimary: string; buttonBg: string; textSecondary: string }
}) {
  return (
    <View style={styles.themeSelector}>
      {THEME_OPTIONS.map((option) => {
        const isActive = option.value === value
        return (
          <Pressable
            key={option.value}
            style={[
              styles.themeButton,
              { backgroundColor: isActive ? colors.accent : colors.buttonBg },
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.themeButtonText,
                { color: isActive ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function SettingsScreen() {
  const colors = useThemeColors()
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled)
  const theme = useSettingsStore((s) => s.theme)
  const toggleSound = useSettingsStore((s) => s.toggleSound)
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const d = useMemo(
    () => ({
      title: { color: colors.textPrimary },
      section: { backgroundColor: colors.headerBand },
      sectionTitle: { color: colors.textSecondary },
      aboutText: { color: colors.textSecondary },
    }),
    [colors]
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.title, d.title]}>Settings</Text>

        <View style={[styles.section, d.section]}>
          <ToggleRow label="Sound" value={soundEnabled} onToggle={toggleSound} colors={colors} />
          <ToggleRow
            label="Haptics"
            value={hapticsEnabled}
            onToggle={toggleHaptics}
            colors={colors}
          />
        </View>

        <View style={[styles.section, d.section]}>
          <Text style={[styles.sectionTitle, d.sectionTitle]}>Theme</Text>
          <ThemeSelector value={theme} onSelect={setTheme} colors={colors} />
        </View>

        <View style={[styles.section, d.section]}>
          <Text style={[styles.sectionTitle, d.sectionTitle]}>About</Text>
          <Text style={[styles.aboutText, d.aboutText]}>Arrout v{appVersion}</Text>
          <Text style={[styles.aboutText, d.aboutText]}>A minimalist arrow puzzle game</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  aboutText: {
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  themeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
})
