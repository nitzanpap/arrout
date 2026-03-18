import * as Haptics from 'expo-haptics'
import { useCallback, useEffect, useRef } from 'react'
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { getHeadDirection } from '../engine/arrow'
import { computeSlideDistanceCells } from '../engine/move'
import type { Direction } from '../engine/types'
import { directionDelta } from '../engine/types'
import { useGameStore } from '../store/game.store'

const SLIDE_DURATION_MS = 350
const BUMP_DURATION_MS = 100
const BUMP_DISTANCE_RATIO = 0.3

export function useArrowAnimation(cellSize: number) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const isAnimating = useGameStore((s) => s.isAnimating)
  const animationType = useGameStore((s) => s.animationType)
  const animatingArrowId = useGameStore((s) => s.animatingArrowId)
  const gridState = useGameStore((s) => s.gridState)
  const completeValidAnimation = useGameStore((s) => s.completeValidAnimation)
  const completeInvalidAnimation = useGameStore((s) => s.completeInvalidAnimation)

  const hasTriggered = useRef(false)

  const onValidComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    translateX.value = 0
    translateY.value = 0
    completeValidAnimation()
  }, [completeValidAnimation, translateX, translateY])

  const onInvalidComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    translateX.value = 0
    translateY.value = 0
    completeInvalidAnimation()
  }, [completeInvalidAnimation, translateX, translateY])

  useEffect(() => {
    if (!isAnimating || !animatingArrowId || !gridState || cellSize === 0) {
      hasTriggered.current = false
      return
    }

    if (hasTriggered.current) return
    hasTriggered.current = true

    const arrow = gridState.arrows.find((a) => a.id === animatingArrowId)
    if (!arrow) {
      hasTriggered.current = false
      return
    }

    const direction = getHeadDirection(arrow)
    const delta = directionDelta(direction)

    if (animationType === 'valid') {
      const distanceCells = computeSlideDistanceCells(animatingArrowId, gridState)
      const distancePx = distanceCells * cellSize

      const targetX = delta.col * distancePx
      const targetY = delta.row * distancePx

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      translateX.value = 0
      translateY.value = 0

      startSlideOff(translateX, translateY, targetX, targetY, direction, onValidComplete)
    } else if (animationType === 'invalid') {
      const bumpPx = cellSize * BUMP_DISTANCE_RATIO
      const bumpX = delta.col * bumpPx
      const bumpY = delta.row * bumpPx

      translateX.value = 0
      translateY.value = 0

      startShake(translateX, translateY, bumpX, bumpY, direction, onInvalidComplete)
    }
  }, [
    isAnimating,
    animationType,
    animatingArrowId,
    gridState,
    cellSize,
    translateX,
    translateY,
    onValidComplete,
    onInvalidComplete,
  ])

  const resetAll = useCallback(() => {
    cancelAnimation(translateX)
    cancelAnimation(translateY)
    translateX.value = 0
    translateY.value = 0
  }, [translateX, translateY])

  return { translateX, translateY, resetAll }
}

function startSlideOff(
  translateX: { value: number },
  translateY: { value: number },
  targetX: number,
  targetY: number,
  direction: Direction,
  onComplete: () => void
) {
  const isHorizontal = direction === 'LEFT' || direction === 'RIGHT'

  if (isHorizontal) {
    translateX.value = withTiming(
      targetX,
      { duration: SLIDE_DURATION_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onComplete)()
      }
    )
  } else {
    translateY.value = withTiming(
      targetY,
      { duration: SLIDE_DURATION_MS, easing: Easing.inOut(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(onComplete)()
      }
    )
  }
}

function startShake(
  translateX: { value: number },
  translateY: { value: number },
  bumpX: number,
  bumpY: number,
  direction: Direction,
  onComplete: () => void
) {
  const isHorizontal = direction === 'LEFT' || direction === 'RIGHT'

  if (isHorizontal) {
    translateX.value = withSequence(
      withTiming(bumpX, { duration: BUMP_DURATION_MS }),
      withSpring(0, { damping: 12, stiffness: 200 }, (finished) => {
        if (finished) runOnJS(onComplete)()
      })
    )
  } else {
    translateY.value = withSequence(
      withTiming(bumpY, { duration: BUMP_DURATION_MS }),
      withSpring(0, { damping: 12, stiffness: 200 }, (finished) => {
        if (finished) runOnJS(onComplete)()
      })
    )
  }
}
