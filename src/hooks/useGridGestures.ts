import { useEffect, useMemo, useRef } from 'react'
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

  // Refs for values that change during gameplay — keeps gesture objects stable
  // so RNGH doesn't tear down and re-register native handlers on every arrow move
  const gridStateRef = useRef(gridState)
  gridStateRef.current = gridState
  const onArrowTapRef = useRef(onArrowTap)
  onArrowTapRef.current = onArrowTap

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
          const gs = gridStateRef.current
          if (!gs || cellSize === 0) return

          // RN transform [translateX, translateY, scale] with center origin
          // applies scale first, then translate: visual = s*(p - center) + translate + center
          // Inversion: canvas = (tap - center - translate) / scale + center
          const s = scale.value
          const tx = translateX.value
          const ty = translateY.value
          const canvasX = (e.x - contentWidth / 2 - tx) / s + contentWidth / 2
          const canvasY = (e.y - contentHeight / 2 - ty) / s + contentHeight / 2

          const col = Math.floor((canvasX - offsetX) / cellSize)
          const row = Math.floor(canvasY / cellSize)

          if (__DEV__) {
            const hitCell =
              row >= 0 && row < gs.height && col >= 0 && col < gs.width ? gs.cells[row][col] : null
            const ox = contentWidth / 2
            const oy = contentHeight / 2
            const arrowVisuals = gs.arrows.map((a) => {
              const head = a.cells[0]
              const cx = offsetX + head.col * cellSize + cellSize / 2
              const cy = head.row * cellSize + cellSize / 2
              const vx = s * (cx - ox) + tx + ox
              const vy = s * (cy - oy) + ty + oy
              return `${a.id}@visual(${vx.toFixed(0)},${vy.toFixed(0)})`
            })
            console.debug(
              '[tap] e=(%s,%s) s=%s tx=%s ty=%s → canvas=(%s,%s) cell=(%s,%s) hit=%s | arrows: %s',
              e.x.toFixed(1),
              e.y.toFixed(1),
              s.toFixed(2),
              tx.toFixed(1),
              ty.toFixed(1),
              canvasX.toFixed(1),
              canvasY.toFixed(1),
              col,
              row,
              hitCell?.arrowId ?? 'none',
              arrowVisuals.join(' ')
            )
          }

          if (row < 0 || row >= gs.height || col < 0 || col >= gs.width) return

          const cell = gs.cells[row][col]
          if (cell.arrowId) {
            onArrowTapRef.current(cell.arrowId)
          }
        }),
    // Stable deps — gridState and onArrowTap are read from refs, not closures
    [cellSize, offsetX, translateX, translateY, scale, contentWidth, contentHeight]
  )

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
