import { Canvas, Circle } from '@shopify/react-native-skia'
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
}

export function GridCanvas({
  gridState,
  selectedArrowId,
  errorArrowIds,
  canvasWidth,
  cellSize,
  offsetX,
  colors,
}: GridCanvasProps) {
  const gridHeight = cellSize * gridState.height
  const offsetY = 0

  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight }}>
      {/* Grid dots at cell centers */}
      {Array.from({ length: gridState.width * gridState.height }, (_, idx) => {
        const col = idx % gridState.width
        const row = Math.floor(idx / gridState.width)
        return (
          <Circle
            key={`d${idx}`}
            cx={offsetX + col * cellSize + cellSize / 2}
            cy={offsetY + row * cellSize + cellSize / 2}
            r={1.5}
            color={colors.gridLine}
          />
        )
      })}

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
          colors={colors}
        />
      ))}
    </Canvas>
  )
}
