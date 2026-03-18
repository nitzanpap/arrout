import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Easing, runOnJS, useSharedValue, withSequence, withTiming } from 'react-native-reanimated'
import { getHeadDirection } from '../engine/arrow'
import { computeDistanceToBlocker, executeMoveSteps } from '../engine/move'
import type { StepPositions } from '../engine/moveSteps'
import { extractStepPositions } from '../engine/moveSteps'
import type { Direction } from '../engine/types'
import { directionDelta } from '../engine/types'
import type { AnimationEntry } from '../store/game.store'
import { useGameStore } from '../store/game.store'

const DURATION_PER_STEP_MS = 100
const SLIDE_TO_BLOCKER_MS = 200
const SLIDE_BACK_MS = 200
const MIN_BUMP_RATIO = 0.3

export interface ArrowAnimationState {
  readonly translateX: { value: number }
  readonly translateY: { value: number }
  readonly progress: { value: number }
  readonly stepPositions: readonly StepPositions[] | null
  readonly isSnakeAnimating: boolean
}

export function useArrowAnimation(arrowId: string, cellSize: number): ArrowAnimationState {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const progress = useSharedValue(0)

  const [stepPositions, setStepPositions] = useState<readonly StepPositions[] | null>(null)
  const [isSnakeAnimating, setIsSnakeAnimating] = useState(false)

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
    setIsSnakeAnimating(false)
    setStepPositions(null)
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
      // Compute snake step positions for smooth per-cell animation
      const moveResult = executeMoveSteps(arrowId, gridState)
      const positions = extractStepPositions(arrowId, gridState, moveResult.steps)

      if (positions.length > 1) {
        // Use snake animation
        const numSteps = positions.length - 1

        setStepPositions(positions)
        setIsSnakeAnimating(true)

        progress.value = 0
        translateX.value = 0
        translateY.value = 0

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

        progress.value = withTiming(
          numSteps,
          {
            duration: numSteps * DURATION_PER_STEP_MS,
            easing: Easing.inOut(Easing.cubic),
          },
          (finished) => {
            if (finished) runOnJS(onValidComplete)()
          }
        )
      } else {
        // Fallback: no steps (shouldn't happen for valid moves)
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

  return { translateX, translateY, progress, stepPositions, isSnakeAnimating }
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
