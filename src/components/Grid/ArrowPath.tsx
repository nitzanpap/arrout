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

const SELECTED_GLOW_ALPHA = 0.4
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
  const { translateX, translateY, progress, stepPositions, isSnakeAnimating } = useArrowAnimation(
    arrow.id,
    cellSize
  )

  const strokeWidth = Math.max(MIN_STROKE_WIDTH, cellSize * STROKE_WIDTH_RATIO)
  const color = isError ? colors.arrowError : colors.arrowColor
  const opacity = isSelected ? 1 : 0.95

  // Static body path (used when NOT snake-animating)
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

  // Static head path (used when NOT snake-animating)
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
    if (isSnakeAnimating) {
      return [{ translateX: 0 }, { translateY: 0 }]
    }
    return [{ translateX: translateX.value }, { translateY: translateY.value }]
  })

  // Snake-animated body path — rebuilt each frame from interpolated positions
  const snakeBodyPath = useDerivedValue(() => {
    if (!isSnakeAnimating || !stepPositions || stepPositions.length < 2) {
      return staticBodyPath
    }

    const numSteps = stepPositions.length - 1
    const p = Math.min(Math.max(progress.value, 0), numSteps)
    const stepIndex = Math.min(Math.floor(p), numSteps - 1)
    const fraction = p - stepIndex

    const currentStep = stepPositions[stepIndex]
    const nextStep = stepPositions[Math.min(stepIndex + 1, numSteps)]

    // Determine how many cells to render (use the max of both steps)
    const cellCount = Math.max(currentStep.positions.length, nextStep.positions.length)
    if (cellCount < 2) return staticBodyPath

    const path = Skia.Path.Make()

    for (let i = 0; i < cellCount; i++) {
      const curr = currentStep.positions[Math.min(i, currentStep.positions.length - 1)]
      const next = nextStep.positions[Math.min(i, nextStep.positions.length - 1)]

      const x = offsetX + (curr.col + (next.col - curr.col) * fraction) * cellSize + cellSize / 2
      const y = offsetY + (curr.row + (next.row - curr.row) * fraction) * cellSize + cellSize / 2

      if (i === 0) {
        path.moveTo(x, y)
      } else {
        path.lineTo(x, y)
      }
    }

    return path
  })

  // Snake-animated arrowhead path
  const emptyPath = useMemo(() => Skia.Path.Make(), [])

  const snakeHeadPath = useDerivedValue(() => {
    if (!isSnakeAnimating || !stepPositions || stepPositions.length < 2) {
      return staticHeadPath ?? emptyPath
    }

    const head = arrow.cells[0]
    if (head.content.type !== 'head') return emptyPath

    const numSteps = stepPositions.length - 1
    const p = Math.min(Math.max(progress.value, 0), numSteps)
    const stepIndex = Math.min(Math.floor(p), numSteps - 1)
    const fraction = p - stepIndex

    const currentStep = stepPositions[stepIndex]
    const nextStep = stepPositions[Math.min(stepIndex + 1, numSteps)]

    const curr = currentStep.positions[0]
    const next = nextStep.positions[0]

    const cx = offsetX + (curr.col + (next.col - curr.col) * fraction) * cellSize + cellSize / 2
    const cy = offsetY + (curr.row + (next.row - curr.row) * fraction) * cellSize + cellSize / 2
    const size = cellSize * HEAD_SIZE_RATIO

    return buildArrowHead(head.content.direction, cx, cy, size)
  })

  if (isSnakeAnimating) {
    return (
      <Group opacity={opacity}>
        <Path
          path={snakeBodyPath}
          color={color}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={snakeHeadPath} color={color} style="fill" />
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
          color={color}
          style="stroke"
          strokeWidth={strokeWidth + 3}
          strokeCap="round"
          strokeJoin="round"
          opacity={SELECTED_GLOW_ALPHA}
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
