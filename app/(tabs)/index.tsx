import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProgressStore } from '../../src/store/progress.store'

const BG = '#0F1120'
const ACCENT = '#5B5FEF'
const TEXT_PRIMARY = '#EEF0FF'
const TEXT_SECONDARY = '#6C7099'
const DIFFICULTY_COLOR = '#7B77FF'

function getDifficultyLabel(level: number): string {
  if (level <= 50) return 'Easy'
  if (level <= 100) return 'Medium'
  if (level <= 150) return 'Hard'
  return 'Super Hard'
}

export default function HomeScreen() {
  const router = useRouter()
  const currentLevel = useProgressStore((s) => s.currentLevel)
  const streak = useProgressStore((s) => s.streak)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Arrout</Text>
        <Text style={styles.subtitle}>Slide the arrows</Text>

        <View style={styles.levelInfo}>
          <Text style={styles.levelNumber}>Level {currentLevel}</Text>
          <Text style={styles.difficulty}>{getDifficultyLabel(currentLevel)}</Text>
        </View>

        {streak > 0 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakLabel}>Streak</Text>
            <Text style={styles.streakValue}>{streak}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
          onPress={() =>
            router.push({ pathname: '/game', params: { level: currentLevel.toString() } })
          }
        >
          <Text style={styles.playButtonText}>Play</Text>
        </Pressable>
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
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  levelInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  difficulty: {
    fontSize: 14,
    fontWeight: '600',
    color: DIFFICULTY_COLOR,
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#161929',
    borderRadius: 12,
  },
  streakLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFEAA7',
  },
  playButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 80,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 40,
  },
  playButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  playButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
})
