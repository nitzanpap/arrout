import { Canvas, Circle, DashPathEffect, Line, vec } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { getHead, getHeadDirection } from '../../engine/arrow'
import type { GridState } from '../../engine/types'
import { directionDelta } from '../../engine/types'
import type { ThemeColors } from '../../theme/colors'
import { ArrowPath } from './ArrowPath'

interface GridCanvasProps {
  readonly gridState: GridState
  readonly selectedArrowId: string | null
  readonly errorArrowIds: readonly string[]
  readonly previewArrowId: string | null
  readonly canvasWidth: number
  readonly cellSize: number
  readonly offsetX: number
  readonly colors: ThemeColors
  readonly showGridLines: boolean
}

export function GridCanvas({
  gridState,
  selectedArrowId,
  errorArrowIds,
  previewArrowId,
  canvasWidth,
  cellSize,
  offsetX,
  colors,
  showGridLines,
}: GridCanvasProps) {
  const gridHeight = cellSize * gridState.height
  const offsetY = 0

  // Dots at cell centers — always visible as subtle grid reference
  const dotElements = useMemo(() => {
    return Array.from({ length: gridState.width * gridState.height }, (_, idx) => ({
      key: `d${idx}`,
      cx: offsetX + (idx % gridState.width) * cellSize + cellSize / 2,
      cy: offsetY + Math.floor(idx / gridState.width) * cellSize + cellSize / 2,
    }))
  }, [gridState.width, gridState.height, cellSize, offsetX])

  // Full grid lines through cell centers — extend past puzzle bounds to canvas edges
  const lineElements = useMemo(() => {
    if (!showGridLines) return null
    const lines: { key: string; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = []

    for (let row = 0; row < gridState.height; row++) {
      const y = offsetY + row * cellSize + cellSize / 2
      lines.push({
        key: `h${row}`,
        p1: { x: 0, y },
        p2: { x: canvasWidth, y },
      })
    }
    for (let col = 0; col < gridState.width; col++) {
      const x = offsetX + col * cellSize + cellSize / 2
      lines.push({
        key: `v${col}`,
        p1: { x, y: 0 },
        p2: { x, y: gridHeight },
      })
    }
    return lines
  }, [showGridLines, gridState.width, gridState.height, cellSize, offsetX, canvasWidth, gridHeight])

  // Direction preview line: from arrow head to board edge in the head's direction
  const previewLine = useMemo(() => {
    if (!previewArrowId) return null
    const arrow = gridState.arrows.find((a) => a.id === previewArrowId)
    if (!arrow) return null

    const head = getHead(arrow)
    const direction = getHeadDirection(arrow)
    const delta = directionDelta(direction)

    const headCx = offsetX + head.col * cellSize + cellSize / 2
    const headCy = offsetY + head.row * cellSize + cellSize / 2

    // Extend the line from the head to the canvas edge
    let endX = headCx
    let endY = headCy
    if (delta.col !== 0) {
      endX = delta.col > 0 ? canvasWidth : 0
      endY = headCy
    }
    if (delta.row !== 0) {
      endY = delta.row > 0 ? gridHeight : 0
      endX = headCx
    }

    return { p1: { x: headCx, y: headCy }, p2: { x: endX, y: endY } }
  }, [previewArrowId, gridState.arrows, cellSize, offsetX, canvasWidth, gridHeight])

  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight }}>
      {dotElements.map((dot) => (
        <Circle key={dot.key} cx={dot.cx} cy={dot.cy} r={2} color={colors.gridLine} />
      ))}

      {lineElements?.map((line) => (
        <Line
          key={line.key}
          p1={vec(line.p1.x, line.p1.y)}
          p2={vec(line.p2.x, line.p2.y)}
          color={colors.gridLinesFull}
          strokeWidth={1}
        />
      ))}

      {gridState.arrows.map((arrow) => (
        <ArrowPath
          key={arrow.id}
          arrow={arrow}
          cellSize={cellSize}
          offsetX={offsetX}
          offsetY={offsetY}
          isSelected={arrow.id === selectedArrowId}
          isError={errorArrowIds.includes(arrow.id)}
          colors={colors}
        />
      ))}

      {previewLine && (
        <Line
          p1={vec(previewLine.p1.x, previewLine.p1.y)}
          p2={vec(previewLine.p2.x, previewLine.p2.y)}
          color={colors.directionPreview}
          strokeWidth={2}
        >
          <DashPathEffect intervals={[6, 4]} />
        </Line>
      )}
    </Canvas>
  )
}
