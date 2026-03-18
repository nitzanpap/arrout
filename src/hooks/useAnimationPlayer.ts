import * as Haptics from 'expo-haptics'
import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/game.store'

const MIN_STEP_MS = 60
const TARGET_TOTAL_MS = 300

export function useAnimationPlayer() {
  const isAnimating = useGameStore((s) => s.isAnimating)
  const stepsCount = useGameStore((s) => s.animationSteps.length)
  const animationType = useGameStore((s) => s.animationType)
  const advanceAnimation = useGameStore((s) => s.advanceAnimation)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastAnimationType = useRef(animationType)

  // Track animation type before it resets to null on completion
  useEffect(() => {
    if (animationType !== null) {
      lastAnimationType.current = animationType
    }
  }, [animationType])

  // Drive animation steps
  useEffect(() => {
    if (!isAnimating || stepsCount === 0) return

    const stepMs = Math.max(MIN_STEP_MS, Math.floor(TARGET_TOTAL_MS / stepsCount))

    timerRef.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      advanceAnimation()
    }, stepMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isAnimating, stepsCount, advanceAnimation])

  // Error haptic when invalid animation finishes
  const wasAnimating = useRef(false)
  useEffect(() => {
    if (wasAnimating.current && !isAnimating && lastAnimationType.current === 'invalid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
    wasAnimating.current = isAnimating
  }, [isAnimating])
}
