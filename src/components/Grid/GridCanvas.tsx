import { Canvas, Line, vec } from '@shopify/react-native-skia'
import type { GridState } from '../../engine/types'
import { ArrowPath } from './ArrowPath'

interface GridCanvasProps {
  readonly gridState: GridState
  readonly selectedArrowId: string | null
  readonly errorArrowIds: readonly string[]
  readonly canvasWidth: number
  readonly cellSize: number
  readonly offsetX: number
}

const GRID_LINE_COLOR = 'rgba(200, 206, 255, 0.08)'

export function GridCanvas({
  gridState,
  selectedArrowId,
  errorArrowIds,
  canvasWidth,
  cellSize,
  offsetX,
}: GridCanvasProps) {
  const gridWidth = cellSize * gridState.width
  const gridHeight = cellSize * gridState.height
  const offsetY = 0

  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight }}>
      {/* Grid lines */}
      {Array.from({ length: gridState.width + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          p1={vec(offsetX + i * cellSize, offsetY)}
          p2={vec(offsetX + i * cellSize, offsetY + gridHeight)}
          color={GRID_LINE_COLOR}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: gridState.height + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          p1={vec(offsetX, offsetY + i * cellSize)}
          p2={vec(offsetX + gridWidth, offsetY + i * cellSize)}
          color={GRID_LINE_COLOR}
          strokeWidth={1}
        />
      ))}

      {/* Arrows */}
      {gridState.arrows.map((arrow) => (
        <ArrowPath
          key={arrow.id}
          arrow={arrow}
          cellSize={cellSize}
          offsetX={offsetX}
          offsetY={offsetY}
          isSelected={arrow.id === selectedArrowId}
          isError={errorArrowIds.includes(arrow.id)}
        />
      ))}
    </Canvas>
  )
}
