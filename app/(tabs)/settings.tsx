import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useSettingsStore } from '../../src/store/settings.store'

const BG = '#0F1120'
const SURFACE = '#161929'
const TEXT_PRIMARY = '#EEF0FF'
const TEXT_SECONDARY = '#6C7099'
const ACCENT = '#5B5FEF'

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <Pressable style={styles.row} onPress={onToggle}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </Pressable>
  )
}

export default function SettingsScreen() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled)
  const toggleSound = useSettingsStore((s) => s.toggleSound)
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <ToggleRow label="Sound" value={soundEnabled} onToggle={toggleSound} />
          <ToggleRow label="Haptics" value={hapticsEnabled} onToggle={toggleHaptics} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>Arrout v1.0.0</Text>
          <Text style={styles.aboutText}>A minimalist arrow puzzle game</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  section: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
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
    color: TEXT_PRIMARY,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2D42',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: ACCENT,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6C7099',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: TEXT_PRIMARY,
  },
  aboutText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
})
