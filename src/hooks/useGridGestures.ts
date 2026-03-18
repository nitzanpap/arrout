import { useEffect, useMemo } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import type { GridState } from '../engine/types'

const MIN_SCALE = 1.0
const MAX_SCALE = 3.0
const PAN_ACTIVATE_OFFSET = 10
const PAN_OVERSHOOT_RATIO = 0.25

function clamp(value: number, min: number, max: number): number {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

interface UseGridGesturesOptions {
  readonly gridState: GridState | null
  readonly cellSize: number
  readonly offsetX: number
  readonly contentWidth: number
  readonly contentHeight: number
  readonly containerWidth: number
  readonly containerHeight: number
  readonly onArrowTap: (arrowId: string) => void
}

export function useGridGestures({
  gridState,
  cellSize,
  offsetX,
  contentWidth,
  contentHeight,
  containerWidth,
  containerHeight,
  onArrowTap,
}: UseGridGesturesOptions) {
  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const savedScale = useSharedValue(1)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  const overshootX = containerWidth * PAN_OVERSHOOT_RATIO
  const overshootY = containerHeight * PAN_OVERSHOOT_RATIO

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scale.value
          savedTranslateX.value = translateX.value
          savedTranslateY.value = translateY.value
        })
        .onUpdate((e) => {
          const s = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE)
          scale.value = s

          const maxTx = Math.max(0, (contentWidth * s - containerWidth) / 2) + overshootX
          const maxTy = Math.max(0, (contentHeight * s - containerHeight) / 2) + overshootY
          translateX.value = clamp(savedTranslateX.value, -maxTx, maxTx)
          translateY.value = clamp(savedTranslateY.value, -maxTy, maxTy)
        }),
    [
      scale,
      translateX,
      translateY,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      contentWidth,
      contentHeight,
      containerWidth,
      containerHeight,
      overshootX,
      overshootY,
    ]
  )

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .activeOffsetX([-PAN_ACTIVATE_OFFSET, PAN_ACTIVATE_OFFSET])
        .activeOffsetY([-PAN_ACTIVATE_OFFSET, PAN_ACTIVATE_OFFSET])
        .onStart(() => {
          savedTranslateX.value = translateX.value
          savedTranslateY.value = translateY.value
        })
        .onUpdate((e) => {
          const s = scale.value
          const maxTx = Math.max(0, (contentWidth * s - containerWidth) / 2) + overshootX
          const maxTy = Math.max(0, (contentHeight * s - containerHeight) / 2) + overshootY
          translateX.value = clamp(savedTranslateX.value + e.translationX, -maxTx, maxTx)
          translateY.value = clamp(savedTranslateY.value + e.translationY, -maxTy, maxTy)
        }),
    [
      scale,
      translateX,
      translateY,
      savedTranslateX,
      savedTranslateY,
      contentWidth,
      contentHeight,
      containerWidth,
      containerHeight,
      overshootX,
      overshootY,
    ]
  )

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(300)
        .runOnJS(true)
        .onEnd((e) => {
          if (!gridState || cellSize === 0) return

          // e.x/e.y are relative to the gesture container (full-size wrapper).
          // The content (Animated.View) is centered in the container.
          // Transform [tx, ty, scale] with origin at content center.
          // Inversion: canvasPoint = (gesturePoint - containerCenter - translate) / scale + contentCenter
          const s = scale.value
          const tx = translateX.value
          const ty = translateY.value
          const canvasX = (e.x - containerWidth / 2 - tx) / s + contentWidth / 2
          const canvasY = (e.y - containerHeight / 2 - ty) / s + contentHeight / 2

          const col = Math.floor((canvasX - offsetX) / cellSize)
          const row = Math.floor(canvasY / cellSize)

          if (row < 0 || row >= gridState.height || col < 0 || col >= gridState.width) return

          const cell = gridState.cells[row][col]
          if (cell.arrowId) {
            onArrowTap(cell.arrowId)
          }
        }),
    [
      gridState,
      cellSize,
      offsetX,
      translateX,
      translateY,
      scale,
      onArrowTap,
      containerWidth,
      containerHeight,
      contentWidth,
      contentHeight,
    ]
  )

  const gesture = useMemo(() => Gesture.Simultaneous(pinch, pan, tap), [pinch, pan, tap])

  // Reset pan/zoom when content dimensions change (new level)
  const contentKey = `${contentWidth}x${contentHeight}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentKey intentionally triggers reset on level change
  useEffect(() => {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }, [contentKey, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return { gesture, animatedStyle }
}
