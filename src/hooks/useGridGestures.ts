import { useEffect, useMemo } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import type { GridState } from '../engine/types'

const MIN_SCALE = 1.0
const MAX_SCALE = 3.0
const PAN_ACTIVATE_OFFSET = 10

function clamp(value: number, min: number, max: number): number {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

interface UseGridGesturesOptions {
  readonly gridState: GridState | null
  readonly cellSize: number
  readonly offsetX: number
  readonly containerWidth: number
  readonly containerHeight: number
  readonly onArrowTap: (arrowId: string) => void
}

export function useGridGestures({
  gridState,
  cellSize,
  offsetX,
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

  const gridWidth = gridState ? cellSize * gridState.width : 0
  const gridHeight = gridState ? cellSize * gridState.height : 0

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          savedScale.value = scale.value
          savedTranslateX.value = translateX.value
          savedTranslateY.value = translateY.value
        })
        .onUpdate((e) => {
          const newScale = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE)
          scale.value = newScale

          // Clamp translation after scale change
          const maxTx = Math.max(0, (gridWidth * newScale - containerWidth) / 2)
          const maxTy = Math.max(0, (gridHeight * newScale - containerHeight) / 2)
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
      gridWidth,
      gridHeight,
      containerWidth,
      containerHeight,
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
          const maxTx = Math.max(0, (gridWidth * s - containerWidth) / 2)
          const maxTy = Math.max(0, (gridHeight * s - containerHeight) / 2)
          translateX.value = clamp(savedTranslateX.value + e.translationX, -maxTx, maxTx)
          translateY.value = clamp(savedTranslateY.value + e.translationY, -maxTy, maxTy)
        }),
    [
      scale,
      translateX,
      translateY,
      savedTranslateX,
      savedTranslateY,
      gridWidth,
      gridHeight,
      containerWidth,
      containerHeight,
    ]
  )

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(300)
        .runOnJS(true)
        .onEnd((e) => {
          if (!gridState || cellSize === 0) return

          // Invert the transform to get canvas-space coordinates
          const canvasX = (e.x - translateX.value) / scale.value
          const canvasY = (e.y - translateY.value) / scale.value

          const col = Math.floor((canvasX - offsetX) / cellSize)
          const row = Math.floor(canvasY / cellSize)

          if (row < 0 || row >= gridState.height || col < 0 || col >= gridState.width) return

          const cell = gridState.cells[row][col]
          if (cell.arrowId) {
            onArrowTap(cell.arrowId)
          }
        }),
    [gridState, cellSize, offsetX, translateX, translateY, scale, onArrowTap]
  )

  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onEnd(() => {
          scale.value = withSpring(1, { damping: 15 })
          translateX.value = withSpring(0, { damping: 15 })
          translateY.value = withSpring(0, { damping: 15 })
        }),
    [scale, translateX, translateY]
  )

  const gesture = useMemo(
    () => Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(doubleTap, tap)),
    [pinch, pan, doubleTap, tap]
  )

  // Reset pan/zoom when grid dimensions change (new level)
  const gridKey = `${gridWidth}x${gridHeight}`
  // biome-ignore lint/correctness/useExhaustiveDependencies: gridKey intentionally triggers reset on level change
  useEffect(() => {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }, [gridKey, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return { gesture, animatedStyle }
}
