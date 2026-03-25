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
const STROKE_WIDTH_RATIO = 0.16
const MIN_STROKE_WIDTH = 4
const HEAD_SIZE_RATIO = 0.24

/**
 * Build a smooth body path using quadratic bezier curves at direction changes.
 * At each 90-degree turn, instead of a sharp corner we draw:
 *   lineTo(midpoint before corner) → quadTo(corner, midpoint after corner)
 * This produces smooth quarter-circle-like arcs through every turn.
 */
function buildSmoothBodyPath(
  points: readonly { readonly x: number; readonly y: number }[]
): ReturnType<typeof Skia.Path.Make> {
  'worklet'
  const path = Skia.Path.Make()
  if (points.length < 2) return path

  path.moveTo(points[0].x, points[0].y)

  if (points.length === 2) {
    path.lineTo(points[1].x, points[1].y)
    return path
  }

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const next = points[i + 1]

    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y

    const isTurn = dx1 !== dx2 || dy1 !== dy2

    if (!isTurn) {
      path.lineTo(curr.x, curr.y)
    } else {
      const midBeforeX = (prev.x + curr.x) / 2
      const midBeforeY = (prev.y + curr.y) / 2
      const midAfterX = (curr.x + next.x) / 2
      const midAfterY = (curr.y + next.y) / 2

      path.lineTo(midBeforeX, midBeforeY)
      path.quadTo(curr.x, curr.y, midAfterX, midAfterY)
    }
  }

  const last = points[points.length - 1]
  path.lineTo(last.x, last.y)

  return path
}

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
  const opacity = 1

  // Static body path (used when NOT track-animating)
  const staticBodyPath = useMemo(() => {
    if (arrow.cells.length < 2) return Skia.Path.Make()

    const centers = arrow.cells.map((cell) => ({
      x: offsetX + cell.col * cellSize + cellSize / 2,
      y: offsetY + cell.row * cellSize + cellSize / 2,
    }))

    return buildSmoothBodyPath(centers)
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

  // Track-animated body path — sliding window over the track with smooth bezier corners
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

    // Collect all points, then build smooth path
    const points: { x: number; y: number }[] = []

    // Start point: interpolated tail position
    const tailA = track.positions[tailFloor]
    const tailB = track.positions[tailCeil]
    points.push({
      x: offsetX + (tailA.col + (tailB.col - tailA.col) * tailFrac) * cellSize + cellSize / 2,
      y: offsetY + (tailA.row + (tailB.row - tailA.row) * tailFrac) * cellSize + cellSize / 2,
    })

    // Interior points: exact grid positions
    const firstInterior = tailCeil
    const lastInterior = headFloor

    for (let i = firstInterior; i <= lastInterior; i++) {
      const pos = track.positions[i]
      points.push({
        x: offsetX + pos.col * cellSize + cellSize / 2,
        y: offsetY + pos.row * cellSize + cellSize / 2,
      })
    }

    // End point: interpolated head position
    if (headFrac > 0 && headCeil > headFloor) {
      const headA = track.positions[headFloor]
      const headB = track.positions[headCeil]
      points.push({
        x: offsetX + (headA.col + (headB.col - headA.col) * headFrac) * cellSize + cellSize / 2,
        y: offsetY + (headA.row + (headB.row - headA.row) * headFrac) * cellSize + cellSize / 2,
      })
    }

    return buildSmoothBodyPath(points)
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
          strokeWidth={strokeWidth + 8}
          strokeCap="round"
          strokeJoin="round"
          opacity={HINT_GLOW_ALPHA}
        />
      )}
    </Group>
  )
}

/**
 * Build a rounded arrowhead using cubic bezier curves.
 * The tip is smoothly rounded instead of a sharp vertex.
 * Each side curves inward via cubicTo, creating a softer look.
 */
function buildArrowHead(
  direction: string,
  cx: number,
  cy: number,
  size: number
): ReturnType<typeof Skia.Path.Make> {
  'worklet'
  const path = Skia.Path.Make()

  // Tip rounding: the bezier control points pull ~15% short of the apex
  // and curve smoothly through, producing a rounded tip.
  const r = 0.15 // rounding factor
  const base = 0.5 // base offset ratio

  switch (direction) {
    case 'UP': {
      const tipY = cy - size
      const baseY = cy + size * base
      path.moveTo(cx - size, baseY)
      path.cubicTo(cx - size * 0.4, baseY - size * 0.3, cx - size * r, tipY + size * r, cx, tipY)
      path.cubicTo(
        cx + size * r,
        tipY + size * r,
        cx + size * 0.4,
        baseY - size * 0.3,
        cx + size,
        baseY
      )
      break
    }
    case 'DOWN': {
      const tipY = cy + size
      const baseY = cy - size * base
      path.moveTo(cx - size, baseY)
      path.cubicTo(cx - size * 0.4, baseY + size * 0.3, cx - size * r, tipY - size * r, cx, tipY)
      path.cubicTo(
        cx + size * r,
        tipY - size * r,
        cx + size * 0.4,
        baseY + size * 0.3,
        cx + size,
        baseY
      )
      break
    }
    case 'LEFT': {
      const tipX = cx - size
      const baseX = cx + size * base
      path.moveTo(baseX, cy - size)
      path.cubicTo(baseX - size * 0.3, cy - size * 0.4, tipX + size * r, cy - size * r, tipX, cy)
      path.cubicTo(
        tipX + size * r,
        cy + size * r,
        baseX - size * 0.3,
        cy + size * 0.4,
        baseX,
        cy + size
      )
      break
    }
    case 'RIGHT': {
      const tipX = cx + size
      const baseX = cx - size * base
      path.moveTo(baseX, cy - size)
      path.cubicTo(baseX + size * 0.3, cy - size * 0.4, tipX - size * r, cy - size * r, tipX, cy)
      path.cubicTo(
        tipX - size * r,
        cy + size * r,
        baseX + size * 0.3,
        cy + size * 0.4,
        baseX,
        cy + size
      )
      break
    }
  }

  path.close()
  return path
}
