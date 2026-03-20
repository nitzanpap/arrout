import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import type { Difficulty } from '../../engine/types'
import type { ThemeColors } from '../../theme/colors'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  superHard: 'Super Hard',
}

const PARTICLE_COUNT = 24
const PARTICLE_COLORS = ['#FF6B8A', '#7B77FF', '#60A5FA', '#FBBF24', '#34D399', '#F472B6']

interface Particle {
  readonly id: number
  readonly x: number
  readonly delay: number
  readonly color: string
  readonly size: number
  readonly drift: number
}

function CelebrationParticle({ particle }: { readonly particle: Particle }) {
  const translateY = useSharedValue(-20)
  const translateX = useSharedValue(0)
  const opacity = useSharedValue(0)
  const rotate = useSharedValue(0)
  const scale = useSharedValue(0)

  useEffect(() => {
    opacity.value = withDelay(
      particle.delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(800, withTiming(0, { duration: 600 }))
      )
    )
    translateY.value = withDelay(
      particle.delay,
      withTiming(400 + Math.random() * 200, {
        duration: 1600,
        easing: Easing.out(Easing.quad),
      })
    )
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.drift, {
        duration: 1600,
        easing: Easing.out(Easing.quad),
      })
    )
    rotate.value = withDelay(
      particle.delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1), { duration: 1600 })
    )
    scale.value = withDelay(particle.delay, withSpring(1, { damping: 8 }))
  }, [opacity, translateY, translateX, rotate, scale, particle.delay, particle.drift])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: particle.x,
          top: 0,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  )
}

interface CelebrationOverlayProps {
  readonly moveCount: number
  readonly isPerfect: boolean
  readonly nextLevelNumber: number
  readonly nextDifficulty: Difficulty | null
  readonly colors: ThemeColors
  readonly onNextLevel: () => void
}

export function CelebrationOverlay({
  moveCount,
  isPerfect,
  nextLevelNumber,
  nextDifficulty,
  colors,
  onNextLevel,
}: CelebrationOverlayProps) {
  const hasPlayedHaptic = useRef(false)
  const buttonScale = useSharedValue(1)

  const particles = useMemo<readonly Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50 + 50, // percent-ish spread
      delay: Math.random() * 400,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      size: 6 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 120,
    }))
  }, [])

  useEffect(() => {
    if (!hasPlayedHaptic.current) {
      hasPlayedHaptic.current = true
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
  }, [])

  const handleNextPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    buttonScale.value = withSequence(
      withTiming(0.92, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    )
    // Small delay so the user sees/feels the press before navigating
    setTimeout(onNextLevel, 120)
  }, [onNextLevel, buttonScale])

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  // Gentle pulse on the button to draw attention
  const pulseScale = useSharedValue(1)
  useEffect(() => {
    pulseScale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.04, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    )
  }, [pulseScale])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }))

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.overlay, { backgroundColor: colors.overlayBg }]}
    >
      {/* Confetti particles */}
      <View style={styles.particleContainer} pointerEvents="none">
        {particles.map((p) => (
          <CelebrationParticle key={p.id} particle={p} />
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.overlayCard }]}>
        <Animated.Text
          entering={FadeInDown.duration(400).delay(100)}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Level Complete!
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(200)}
          style={[styles.subtitle, { color: colors.textSecondary }]}
        >
          {moveCount} moves{isPerfect ? ' — Perfect!' : ''}
        </Animated.Text>

        {/* Next level info */}
        {nextDifficulty && (
          <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.nextLevelInfo}>
            <Text style={[styles.nextLevelLabel, { color: colors.textSecondary }]}>Next up</Text>
            <Text style={[styles.nextLevelNumber, { color: colors.textPrimary }]}>
              Level {nextLevelNumber}
            </Text>
            <Text style={[styles.nextLevelDifficulty, { color: colors.difficultyLabel }]}>
              {DIFFICULTY_LABELS[nextDifficulty]}
            </Text>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          style={[buttonAnimStyle, pulseStyle]}
        >
          <Pressable
            style={[styles.nextButton, { backgroundColor: colors.accent }]}
            onPress={handleNextPress}
          >
            <Text style={styles.nextButtonText}>Next Level</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '30%',
    overflow: 'hidden',
  },
  card: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
    minWidth: 260,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  nextLevelInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
  },
  nextLevelLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextLevelNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  nextLevelDifficulty: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
})
