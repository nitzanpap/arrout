import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProgressStore } from '../../src/store/progress.store'
import { useThemeColors } from '../../src/theme/colors'

function getDifficultyLabel(level: number): string {
  if (level <= 50) return 'Easy'
  if (level <= 100) return 'Medium'
  if (level <= 150) return 'Hard'
  return 'Super Hard'
}

export default function HomeScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const currentLevel = useProgressStore((s) => s.currentLevel)
  const streak = useProgressStore((s) => s.streak)

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      logo: { color: colors.textPrimary },
      subtitle: { color: colors.textSecondary },
      levelNumber: { color: colors.textPrimary },
      difficulty: { color: colors.accent },
      streakBg: { backgroundColor: colors.headerBand },
      streakLabel: { color: colors.textSecondary },
      playButton: { backgroundColor: colors.accent },
      playButtonText: { color: '#FFFFFF' },
    }),
    [colors]
  )

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={styles.content}>
        <Text style={[styles.logo, dynamicStyles.logo]}>Arrout</Text>
        <Text style={[styles.subtitle, dynamicStyles.subtitle]}>Slide the arrows</Text>

        <View style={styles.levelInfo}>
          <Text style={[styles.levelNumber, dynamicStyles.levelNumber]}>Level {currentLevel}</Text>
          <Text style={[styles.difficulty, dynamicStyles.difficulty]}>
            {getDifficultyLabel(currentLevel)}
          </Text>
        </View>

        {streak > 0 && (
          <View style={[styles.streakContainer, dynamicStyles.streakBg]}>
            <Text style={[styles.streakLabel, dynamicStyles.streakLabel]}>Streak</Text>
            <Text style={styles.streakValue}>{streak}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            dynamicStyles.playButton,
            pressed && styles.playButtonPressed,
          ]}
          onPress={() =>
            router.push({ pathname: '/game', params: { level: currentLevel.toString() } })
          }
        >
          <Text style={[styles.playButtonText, dynamicStyles.playButtonText]}>Play</Text>
        </Pressable>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  levelInfo: {
    alignItems: 'center',
    marginTop: 60,
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  difficulty: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakLabel: {
    fontSize: 13,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFEAA7',
  },
  playButton: {
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
  },
})
