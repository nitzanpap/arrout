import { useEffect, useMemo } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import type { GridState } from '../engine/types'

const MIN_SCALE = 1.0
const MAX_SCALE = 3.0
const PAN_ACTIVATE_OFFSET = 10
const PAN_OVERSHOOT_RATIO = 0.25

// Stable object — extends gesture touch area so zoomed-in content is tappable
const HIT_SLOP = { left: 500, right: 500, top: 500, bottom: 500 }

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
        .hitSlop(HIT_SLOP)
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
        .hitSlop(HIT_SLOP)
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
        .hitSlop(HIT_SLOP)
        .runOnJS(true)
        .onEnd((e) => {
          if (__DEV__) {
            console.debug(
              '[tap] raw e.x=%s e.y=%s scale=%s tx=%s ty=%s',
              e.x.toFixed(1),
              e.y.toFixed(1),
              scale.value.toFixed(2),
              translateX.value.toFixed(1),
              translateY.value.toFixed(1)
            )
          }
          if (!gridState || cellSize === 0) return

          // e.x/e.y are relative to the Animated.View's native frame.
          // Transform [tx, ty, scale] has origin at the view's center.
          // Inversion: canvasPoint = (tapPoint - center) / scale - translate + center
          const s = scale.value
          const tx = translateX.value
          const ty = translateY.value
          const canvasX = (e.x - contentWidth / 2) / s - tx + contentWidth / 2
          const canvasY = (e.y - contentHeight / 2) / s - ty + contentHeight / 2

          const col = Math.floor((canvasX - offsetX) / cellSize)
          const row = Math.floor(canvasY / cellSize)

          if (__DEV__) {
            const cell =
              row >= 0 && row < gridState.height && col >= 0 && col < gridState.width
                ? gridState.cells[row][col]
                : null
            console.debug(
              '[tap] canvas=(%s,%s) cell=(%s,%s) arrowId=%s',
              canvasX.toFixed(1),
              canvasY.toFixed(1),
              col,
              row,
              cell?.arrowId ?? 'none'
            )
          }

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
      contentWidth,
      contentHeight,
    ]
  )

  // Race: tap goes ACTIVE on finger-up, pan goes ACTIVE on movement > threshold.
  // Whichever reaches ACTIVE first wins — no delay, no conflict.
  // Simultaneous(pinch, pan) allows concurrent pan+zoom with two fingers.
  const gesture = useMemo(
    () => Gesture.Race(Gesture.Simultaneous(pinch, pan), tap),
    [pinch, pan, tap]
  )

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
