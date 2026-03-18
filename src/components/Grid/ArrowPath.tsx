import { Group, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { useDerivedValue } from 'react-native-reanimated'
import type { Arrow } from '../../engine/types'
import { useArrowAnimation } from '../../hooks/useArrowAnimation'
import type { ThemeColors } from '../../theme/colors'

interface ArrowPathProps {
  readonly arrow: Arrow
  readonly cellSize: number
  readonly offsetX: number
  readonly offsetY: number
  readonly isSelected: boolean
  readonly isError: boolean
  readonly colors: ThemeColors
}

const HINT_GLOW_ALPHA = 0.6
const STROKE_WIDTH_RATIO = 0.06
const MIN_STROKE_WIDTH = 2
const HEAD_SIZE_RATIO = 0.15

export function ArrowPath({
  arrow,
  cellSize,
  offsetX,
  offsetY,
  isSelected,
  isError,
  colors,
}: ArrowPathProps) {
  const { translateX, translateY, progress, track, isTrackAnimating } = useArrowAnimation(
    arrow.id,
    cellSize
  )

  const strokeWidth = Math.max(MIN_STROKE_WIDTH, cellSize * STROKE_WIDTH_RATIO)
  const color = isError ? colors.arrowError : isSelected ? colors.arrowHint : colors.arrowColor
  const opacity = isSelected ? 1 : 0.95

  // Static body path (used when NOT track-animating)
  const staticBodyPath = useMemo(() => {
    const path = Skia.Path.Make()
    if (arrow.cells.length < 2) return path

    const centers = arrow.cells.map((cell) => ({
      x: offsetX + cell.col * cellSize + cellSize / 2,
      y: offsetY + cell.row * cellSize + cellSize / 2,
    }))

    path.moveTo(centers[0].x, centers[0].y)
    for (let i = 1; i < centers.length; i++) {
      path.lineTo(centers[i].x, centers[i].y)
    }

    return path
  }, [arrow.cells, cellSize, offsetX, offsetY])

  // Static head path (used when NOT track-animating)
  const staticHeadPath = useMemo(() => {
    const head = arrow.cells[0]
    if (head.content.type !== 'head') return null

    const cx = offsetX + head.col * cellSize + cellSize / 2
    const cy = offsetY + head.row * cellSize + cellSize / 2
    const size = cellSize * HEAD_SIZE_RATIO

    return buildArrowHead(head.content.direction, cx, cy, size)
  }, [arrow.cells, cellSize, offsetX, offsetY])

  // Transform for invalid animation (Group translate)
  const animatedTransform = useDerivedValue(() => {
    if (isTrackAnimating) {
      return [{ translateX: 0 }, { translateY: 0 }]
    }
    return [{ translateX: translateX.value }, { translateY: translateY.value }]
  })

  // Track-animated body path — sliding window over the track
  const trackBodyPath = useDerivedValue(() => {
    if (!isTrackAnimating || !track || track.positions.length <= track.arrowLength) {
      return staticBodyPath
    }

    const maxProgress = track.positions.length - track.arrowLength
    const p = Math.min(Math.max(progress.value, 0), maxProgress)

    const tailFloat = p
    const headFloat = p + track.arrowLength - 1

    const tailFloor = Math.floor(tailFloat)
    const tailCeil = Math.min(tailFloor + 1, track.positions.length - 1)
    const tailFrac = tailFloat - tailFloor

    const headFloor = Math.min(Math.floor(headFloat), track.positions.length - 1)
    const headCeil = Math.min(headFloor + 1, track.positions.length - 1)
    const headFrac = headFloat - Math.floor(headFloat)

    const path = Skia.Path.Make()

    // Start point: interpolated tail position
    const tailA = track.positions[tailFloor]
    const tailB = track.positions[tailCeil]
    const startX =
      offsetX + (tailA.col + (tailB.col - tailA.col) * tailFrac) * cellSize + cellSize / 2
    const startY =
      offsetY + (tailA.row + (tailB.row - tailA.row) * tailFrac) * cellSize + cellSize / 2

    path.moveTo(startX, startY)

    // Interior points: exact grid positions (no interpolation — no diagonal movement)
    const firstInterior = tailCeil
    const lastInterior = headFloor

    for (let i = firstInterior; i <= lastInterior; i++) {
      const pos = track.positions[i]
      const x = offsetX + pos.col * cellSize + cellSize / 2
      const y = offsetY + pos.row * cellSize + cellSize / 2
      path.lineTo(x, y)
    }

    // End point: interpolated head position
    if (headFrac > 0 && headCeil > headFloor) {
      const headA = track.positions[headFloor]
      const headB = track.positions[headCeil]
      const endX =
        offsetX + (headA.col + (headB.col - headA.col) * headFrac) * cellSize + cellSize / 2
      const endY =
        offsetY + (headA.row + (headB.row - headA.row) * headFrac) * cellSize + cellSize / 2
      path.lineTo(endX, endY)
    }

    return path
  })

  // Track-animated arrowhead path
  const emptyPath = useMemo(() => Skia.Path.Make(), [])

  const trackHeadPath = useDerivedValue(() => {
    if (!isTrackAnimating || !track || track.positions.length <= track.arrowLength) {
      return staticHeadPath ?? emptyPath
    }

    const head = arrow.cells[0]
    if (head.content.type !== 'head') return emptyPath

    const maxProgress = track.positions.length - track.arrowLength
    const p = Math.min(Math.max(progress.value, 0), maxProgress)

    const headFloat = p + track.arrowLength - 1
    const headFloor = Math.min(Math.floor(headFloat), track.positions.length - 1)
    const headCeil = Math.min(headFloor + 1, track.positions.length - 1)
    const headFrac = headFloat - Math.floor(headFloat)

    const posA = track.positions[headFloor]
    const posB = track.positions[headCeil]

    const cx = offsetX + (posA.col + (posB.col - posA.col) * headFrac) * cellSize + cellSize / 2
    const cy = offsetY + (posA.row + (posB.row - posA.row) * headFrac) * cellSize + cellSize / 2
    const size = cellSize * HEAD_SIZE_RATIO

    return buildArrowHead(head.content.direction, cx, cy, size)
  })

  if (isTrackAnimating) {
    return (
      <Group opacity={opacity}>
        <Path
          path={trackBodyPath}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={trackHeadPath} color={color} style="fill" />
      </Group>
    )
  }

  return (
    <Group opacity={opacity} transform={animatedTransform}>
      <Path
        path={staticBodyPath}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
      {staticHeadPath && <Path path={staticHeadPath} color={color} style="fill" />}
      {isSelected && (
        <Path
          path={staticBodyPath}
          color={colors.arrowHint}
          style="stroke"
          strokeWidth={strokeWidth + 6}
          strokeCap="round"
          strokeJoin="round"
          opacity={HINT_GLOW_ALPHA}
        />
      )}
    </Group>
  )
}

function buildArrowHead(
  direction: string,
  cx: number,
  cy: number,
  size: number
): ReturnType<typeof Skia.Path.Make> {
  'worklet'
  const path = Skia.Path.Make()

  switch (direction) {
    case 'UP':
      path.moveTo(cx, cy - size)
      path.lineTo(cx - size, cy + size * 0.5)
      path.lineTo(cx + size, cy + size * 0.5)
      break
    case 'DOWN':
      path.moveTo(cx, cy + size)
      path.lineTo(cx - size, cy - size * 0.5)
      path.lineTo(cx + size, cy - size * 0.5)
      break
    case 'LEFT':
      path.moveTo(cx - size, cy)
      path.lineTo(cx + size * 0.5, cy - size)
      path.lineTo(cx + size * 0.5, cy + size)
      break
    case 'RIGHT':
      path.moveTo(cx + size, cy)
      path.lineTo(cx - size * 0.5, cy - size)
      path.lineTo(cx - size * 0.5, cy + size)
      break
  }

  path.close()
  return path
}
