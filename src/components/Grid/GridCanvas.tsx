import { Canvas, Line, vec } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import type { GridState } from '../../engine/types'
import { ArrowPath } from './ArrowPath'

interface GridCanvasProps {
  readonly gridState: GridState
  readonly selectedArrowId: string | null
  readonly padding?: number
}

const GRID_LINE_COLOR = 'rgba(200, 206, 255, 0.08)'
const _CELL_BG_COLOR = '#161929'

export function GridCanvas({ gridState, selectedArrowId, padding = 20 }: GridCanvasProps) {
  const { width: screenWidth } = useWindowDimensions()
  const canvasWidth = screenWidth - padding * 2

  const cellSize = useMemo(() => {
    const maxCellW = canvasWidth / gridState.width
    const maxCellH = canvasWidth / gridState.height // keep square
    return Math.floor(Math.min(maxCellW, maxCellH))
  }, [canvasWidth, gridState.width, gridState.height])

  const gridWidth = cellSize * gridState.width
  const gridHeight = cellSize * gridState.height
  const offsetX = (canvasWidth - gridWidth) / 2
  const offsetY = 0

  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight + padding }}>
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
        />
      ))}
    </Canvas>
  )
}
