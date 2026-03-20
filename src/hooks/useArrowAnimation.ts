import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef } from 'react'
import { Easing, runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'
import type { ArrowTrack } from '../engine/moveSteps'
import type { AnimationEntry } from '../store/game.store'
import { useGameStore } from '../store/game.store'

const DURATION_PER_STEP_MS = 45
const SLIDE_TO_BLOCKER_MS = 150
const SLIDE_BACK_MS = 150

export interface ArrowAnimationState {
  readonly translateX: { value: number }
  readonly translateY: { value: number }
  readonly progress: { value: number }
  readonly track: ArrowTrack | null
  readonly isTrackAnimating: boolean
}

export function useArrowAnimation(arrowId: string, cellSize: number): ArrowAnimationState {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const progress = useSharedValue(0)

  const animEntry = useGameStore(
    (s) => s.activeAnimations.get(arrowId) ?? null
  ) as AnimationEntry | null

  const completeValidAnimation = useGameStore((s) => s.completeValidAnimation)
  const completeInvalidAnimation = useGameStore((s) => s.completeInvalidAnimation)

  const hasTriggered = useRef(false)
  const prevEntryRef = useRef<AnimationEntry | null>(null)

  // Derive track directly from animEntry — no extra render cycle
  const track = animEntry?.track ?? null
  const isTrackAnimating = animEntry !== null && track !== null

  const onValidComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    completeValidAnimation(arrowId)
  }, [completeValidAnimation, arrowId])

  const onInvalidComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    completeInvalidAnimation(arrowId)
  }, [completeInvalidAnimation, arrowId])

  useEffect(() => {
    if (!animEntry) {
      hasTriggered.current = false
      prevEntryRef.current = null
      return
    }

    if (hasTriggered.current && prevEntryRef.current === animEntry) return
    hasTriggered.current = true
    prevEntryRef.current = animEntry

    if (cellSize === 0) return

    if (animEntry.type === 'valid') {
      if (animEntry.track && animEntry.maxProgress > 0) {
        progress.value = 0
        translateX.value = 0
        translateY.value = 0

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        progress.value = withTiming(
          animEntry.maxProgress,
          {
            duration: animEntry.maxProgress * DURATION_PER_STEP_MS,
            easing: Easing.linear,
          },
          (finished) => {
            if (finished) runOnJS(onValidComplete)()
          }
        )
      } else {
        onValidComplete()
      }
    } else if (animEntry.type === 'invalid') {
      if (animEntry.track) {
        progress.value = 0
        translateX.value = 0
        translateY.value = 0

        progress.value = withSequence(
          withTiming(animEntry.maxProgress, {
            duration: SLIDE_TO_BLOCKER_MS,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(
            0,
            { duration: SLIDE_BACK_MS, easing: Easing.in(Easing.cubic) },
            (finished) => {
              if (finished) runOnJS(onInvalidComplete)()
            }
          )
        )
      } else {
        onInvalidComplete()
      }
    }
  }, [animEntry, cellSize, translateX, translateY, progress, onValidComplete, onInvalidComplete])

  return { translateX, translateY, progress, track, isTrackAnimating }
}
