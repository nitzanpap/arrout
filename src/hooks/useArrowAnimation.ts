import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Easing, runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'
import { getHeadDirection } from '../engine/arrow'
import { computeDistanceToBlocker } from '../engine/move'
import type { ArrowTrack } from '../engine/moveSteps'
import { extractTrack } from '../engine/moveSteps'
import type { Direction } from '../engine/types'
import { directionDelta } from '../engine/types'
import type { AnimationEntry } from '../store/game.store'
import { useGameStore } from '../store/game.store'

const DURATION_PER_STEP_MS = 60
const SLIDE_TO_BLOCKER_MS = 200
const SLIDE_BACK_MS = 200
const MIN_BUMP_RATIO = 0.3

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

  const [track, setTrack] = useState<ArrowTrack | null>(null)
  const [isTrackAnimating, setIsTrackAnimating] = useState(false)

  const animEntry = useGameStore(
    (s) => s.activeAnimations.get(arrowId) ?? null
  ) as AnimationEntry | null

  const gridState = useGameStore((s) => s.gridState)
  const completeValidAnimation = useGameStore((s) => s.completeValidAnimation)
  const completeInvalidAnimation = useGameStore((s) => s.completeInvalidAnimation)

  const hasTriggered = useRef(false)
  const prevEntryRef = useRef<AnimationEntry | null>(null)

  const onValidComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setIsTrackAnimating(false)
    setTrack(null)
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

    if (!gridState || cellSize === 0) return

    const arrow = gridState.arrows.find((a) => a.id === arrowId)
    if (!arrow) return

    const direction = getHeadDirection(arrow)
    const delta = directionDelta(direction)

    if (animEntry.type === 'valid') {
      const arrowTrack = extractTrack(arrowId, gridState)

      if (arrowTrack && arrowTrack.positions.length > arrowTrack.arrowLength) {
        const numSteps = arrowTrack.positions.length - arrowTrack.arrowLength

        setTrack(arrowTrack)
        setIsTrackAnimating(true)

        progress.value = 0
        translateX.value = 0
        translateY.value = 0

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        progress.value = withTiming(
          numSteps,
          {
            duration: numSteps * DURATION_PER_STEP_MS,
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
      const blockerCells = computeDistanceToBlocker(arrowId, gridState)
      const blockerPx = blockerCells > 0 ? blockerCells * cellSize : cellSize * MIN_BUMP_RATIO
      const targetX = delta.col * blockerPx
      const targetY = delta.row * blockerPx

      translateX.value = 0
      translateY.value = 0

      startSlideToBlockerAndBack(
        translateX,
        translateY,
        targetX,
        targetY,
        direction,
        onInvalidComplete
      )
    }
  }, [
    animEntry,
    arrowId,
    gridState,
    cellSize,
    translateX,
    translateY,
    progress,
    onValidComplete,
    onInvalidComplete,
  ])

  return { translateX, translateY, progress, track, isTrackAnimating }
}

function startSlideToBlockerAndBack(
  translateX: { value: number },
  translateY: { value: number },
  targetX: number,
  targetY: number,
  direction: Direction,
  onComplete: () => void
) {
  const isHorizontal = direction === 'LEFT' || direction === 'RIGHT'

  if (isHorizontal) {
    translateX.value = withSequence(
      withTiming(targetX, {
        duration: SLIDE_TO_BLOCKER_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, { duration: SLIDE_BACK_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onComplete)()
      })
    )
  } else {
    translateY.value = withSequence(
      withTiming(targetY, {
        duration: SLIDE_TO_BLOCKER_MS,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, { duration: SLIDE_BACK_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onComplete)()
      })
    )
  }
}
