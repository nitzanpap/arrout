import { Group, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import type { Arrow } from '../../engine/types'

interface ArrowPathProps {
  readonly arrow: Arrow
  readonly cellSize: number
  readonly offsetX: number
  readonly offsetY: number
  readonly isSelected: boolean
  readonly isError: boolean
}

const SELECTED_GLOW_ALPHA = 0.4
const STROKE_WIDTH_RATIO = 0.35
const ERROR_COLOR = '#FF4A6A'

export function ArrowPath({
  arrow,
  cellSize,
  offsetX,
  offsetY,
  isSelected,
  isError,
}: ArrowPathProps) {
  const strokeWidth = cellSize * STROKE_WIDTH_RATIO
  const color = isError ? ERROR_COLOR : arrow.color
  const opacity = isSelected ? 1 : 0.85

  const bodyPath = useMemo(() => {
    const path = Skia.Path.Make()
    if (arrow.cells.length < 2) return path

    // Draw a path through the centers of all cells
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
    const size = cellSize * 0.3

    return buildArrowHead(head.content.direction, cx, cy, size)
  }, [arrow.cells, cellSize, offsetX, offsetY])

  return (
    <Group opacity={opacity}>
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
          strokeWidth={strokeWidth + 8}
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
