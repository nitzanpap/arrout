import { Canvas, Circle, Line, vec } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import type { GridState } from '../../engine/types'
import type { ThemeColors } from '../../theme/colors'
import { ArrowPath } from './ArrowPath'

interface GridCanvasProps {
  readonly gridState: GridState
  readonly selectedArrowId: string | null
  readonly errorArrowIds: readonly string[]
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

  // Full grid lines through cell centers (not borders)
  const lineElements = useMemo(() => {
    if (!showGridLines) return null
    const lines: { key: string; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = []
    const gridW = cellSize * gridState.width
    const gridH = cellSize * gridState.height

    for (let row = 0; row < gridState.height; row++) {
      const y = offsetY + row * cellSize + cellSize / 2
      lines.push({
        key: `h${row}`,
        p1: { x: offsetX, y },
        p2: { x: offsetX + gridW, y },
      })
    }
    for (let col = 0; col < gridState.width; col++) {
      const x = offsetX + col * cellSize + cellSize / 2
      lines.push({
        key: `v${col}`,
        p1: { x, y: offsetY },
        p2: { x, y: offsetY + gridH },
      })
    }
    return lines
  }, [showGridLines, gridState.width, gridState.height, cellSize, offsetX])

  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight }}>
      {dotElements.map((dot) => (
        <Circle key={dot.key} cx={dot.cx} cy={dot.cy} r={1.5} color={colors.gridLine} />
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
    </Canvas>
  )
}
