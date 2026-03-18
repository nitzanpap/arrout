import { Group, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { type SharedValue, useDerivedValue } from 'react-native-reanimated'
import type { Arrow } from '../../engine/types'
import type { ThemeColors } from '../../theme/colors'

interface ArrowPathProps {
  readonly arrow: Arrow
  readonly cellSize: number
  readonly offsetX: number
  readonly offsetY: number
  readonly isSelected: boolean
  readonly isError: boolean
  readonly colors: ThemeColors
  readonly isAnimating?: boolean
  readonly animTranslateX?: SharedValue<number>
  readonly animTranslateY?: SharedValue<number>
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
  isAnimating = false,
  animTranslateX,
  animTranslateY,
}: ArrowPathProps) {
  const strokeWidth = Math.max(MIN_STROKE_WIDTH, cellSize * STROKE_WIDTH_RATIO)
  const color = isError ? colors.arrowError : colors.arrowColor
  const opacity = isSelected ? 1 : 0.95

  const bodyPath = useMemo(() => {
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

  const headPath = useMemo(() => {
    const head = arrow.cells[0]
    if (head.content.type !== 'head') return null

    const cx = offsetX + head.col * cellSize + cellSize / 2
    const cy = offsetY + head.row * cellSize + cellSize / 2
    const size = cellSize * HEAD_SIZE_RATIO

    return buildArrowHead(head.content.direction, cx, cy, size)
  }, [arrow.cells, cellSize, offsetX, offsetY])

  // Derive transform from shared values — Skia consumes SharedValue<Transforms3d>
  const animatedTransform = useDerivedValue(() => {
    if (!isAnimating || !animTranslateX || !animTranslateY) {
      return [{ translateX: 0 }, { translateY: 0 }]
    }
    return [{ translateX: animTranslateX.value }, { translateY: animTranslateY.value }]
  })

  return (
    <Group opacity={opacity} transform={animatedTransform}>
      {/* Body stroke */}
      <Path
        path={bodyPath}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
      />
      {/* Arrowhead */}
      {headPath && <Path path={headPath} color={color} style="fill" />}
      {/* Selection glow */}
      {isSelected && (
        <Path
          path={bodyPath}
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
