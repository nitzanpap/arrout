import { useRouter } from 'expo-router'
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useProgressStore } from '../../src/store/progress.store'

const BG = '#0F1120'
const SURFACE = '#161929'
const ACCENT = '#5B5FEF'
const TEXT_PRIMARY = '#EEF0FF'
const TEXT_SECONDARY = '#6C7099'

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

function getMonthLabel(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getCompletedThisMonth(challenges: Record<string, string>): number {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return Object.entries(challenges).filter(
    ([date, status]) => date.startsWith(prefix) && status === 'completed'
  ).length
}

function getDaysInMonth(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

export default function ChallengeScreen() {
  const router = useRouter()
  const dailyChallenges = useProgressStore((s) => s.dailyChallenges)
  const today = getTodayDate()
  const todayStatus = dailyChallenges[today]
  const completedThisMonth = getCompletedThisMonth(dailyChallenges)
  const daysInMonth = getDaysInMonth()

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Daily Challenge</Text>
        <Text style={styles.date}>{today}</Text>

        <View style={styles.monthCard}>
          <Text style={styles.monthLabel}>{getMonthLabel()}</Text>
          <Text style={styles.monthProgress}>
            {completedThisMonth} / {daysInMonth}
          </Text>
        </View>

        {todayStatus === 'completed' ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed today!</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/game', params: { level: 'daily' } })}
          >
            <Text style={styles.playText}>Play Today's Challenge</Text>
          </Pressable>
        )}
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  date: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontFamily: 'monospace',
  },
  monthCard: {
    backgroundColor: SURFACE,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  monthLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
  },
  monthProgress: {
    color: TEXT_PRIMARY,
    fontSize: 32,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: '#1A3A2A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  completedText: {
    color: '#82E0AA',
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  playText: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
})
