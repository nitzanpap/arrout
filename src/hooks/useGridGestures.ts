import { useEffect, useMemo, useRef } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import type { GridState } from '../engine/types'

const DEBUG = typeof __DEV__ !== 'undefined' && __DEV__

function debugLog(tag: string, ...args: unknown[]) {
  if (DEBUG) {
    console.debug(`[gestures:${tag}]`, ...args)
  }
}

const MIN_SCALE = 1.0
const MAX_SCALE = 3.0
const PAN_ACTIVATE_OFFSET = 10
const PAN_OVERSHOOT_RATIO = 0.5

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
  readonly onPreviewArrow: (arrowId: string | null) => void
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
  onPreviewArrow,
}: UseGridGesturesOptions) {
  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const savedScale = useSharedValue(1)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  // Refs for values that change during gameplay — keeps gesture objects stable
  // so RNGH doesn't tear down and re-register native handlers on every arrow move
  const gridStateRef = useRef(gridState)
  gridStateRef.current = gridState
  const onArrowTapRef = useRef(onArrowTap)
  onArrowTapRef.current = onArrowTap
  const onPreviewArrowRef = useRef(onPreviewArrow)
  onPreviewArrowRef.current = onPreviewArrow

  // Track the arrow that was long-pressed so we can cancel if finger drifts
  const longPressArrowRef = useRef<string | null>(null)
  const longPressStartRef = useRef<{ col: number; row: number } | null>(null)

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

  // Helper: find arrow ID at canvas coordinates
  const findArrowAt = useRef((x: number, y: number): string | null => {
    const gs = gridStateRef.current
    if (!gs || cellSize === 0) return null
    const col = Math.floor((x - offsetX) / cellSize)
    const row = Math.floor(y / cellSize)
    if (row < 0 || row >= gs.height || col < 0 || col >= gs.width) return null
    return gs.cells[row][col].arrowId
  })
  findArrowAt.current = (x: number, y: number): string | null => {
    const gs = gridStateRef.current
    if (!gs || cellSize === 0) return null
    const col = Math.floor((x - offsetX) / cellSize)
    const row = Math.floor(y / cellSize)
    if (row < 0 || row >= gs.height || col < 0 || col >= gs.width) return null
    return gs.cells[row][col].arrowId
  }

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .hitSlop(HIT_SLOP)
        .runOnJS(true)
        .onEnd((e) => {
          const gs = gridStateRef.current
          if (!gs || cellSize === 0) return

          // RNGH coordinates already account for Reanimated transforms on the Animated.View,
          // so e.x/e.y map directly to canvas-space positions — no inversion needed.
          const col = Math.floor((e.x - offsetX) / cellSize)
          const row = Math.floor(e.y / cellSize)

          if (row >= 0 && row < gs.height && col >= 0 && col < gs.width) {
            const cell = gs.cells[row][col]
            debugLog(
              'tap',
              `e=(${e.x.toFixed(1)},${e.y.toFixed(1)}) cell=(${col},${row}) arrow=${cell.arrowId ?? 'none'}`
            )
            if (cell.arrowId) {
              onArrowTapRef.current(cell.arrowId)
            }
          } else {
            debugLog(
              'tap',
              `e=(${e.x.toFixed(1)},${e.y.toFixed(1)}) cell=(${col},${row}) out of bounds`
            )
          }
        }),
    // Stable deps — gridState and onArrowTap are read from refs, not closures
    [cellSize, offsetX]
  )

  // Long-press: show direction preview, drag-to-cancel, release-to-fire
  const longPress = useMemo(
    () =>
      Gesture.LongPress()
        .hitSlop(HIT_SLOP)
        .minDuration(250)
        .runOnJS(true)
        .onStart((e) => {
          const arrowId = findArrowAt.current(e.x, e.y)
          if (!arrowId) return
          longPressArrowRef.current = arrowId
          const col = Math.floor((e.x - offsetX) / cellSize)
          const row = Math.floor(e.y / cellSize)
          longPressStartRef.current = { col, row }
          onPreviewArrowRef.current(arrowId)
          debugLog('longPress', `preview arrow ${arrowId}`)
        })
        .onEnd((e, success) => {
          const arrowId = longPressArrowRef.current
          if (!arrowId) return

          // Check if finger is still over the same arrow
          const currentArrow = findArrowAt.current(e.x, e.y)
          if (success && currentArrow === arrowId) {
            debugLog('longPress', `fire move ${arrowId}`)
            onArrowTapRef.current(arrowId)
          } else {
            debugLog('longPress', `cancelled — finger moved away`)
          }

          longPressArrowRef.current = null
          longPressStartRef.current = null
          onPreviewArrowRef.current(null)
        })
        .onFinalize(() => {
          // Ensure cleanup on any interruption
          if (longPressArrowRef.current) {
            longPressArrowRef.current = null
            longPressStartRef.current = null
            onPreviewArrowRef.current(null)
          }
        }),
    [cellSize, offsetX]
  )

  const gesture = useMemo(
    () => Gesture.Race(Gesture.Simultaneous(pinch, pan), Gesture.Exclusive(longPress, tap)),
    [pinch, pan, longPress, tap]
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
