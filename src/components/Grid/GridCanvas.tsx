import { Canvas, Circle, DashPathEffect, Line, vec } from '@shopify/react-native-skia'
import { useMemo } from 'react'
import type { SharedValue } from 'react-native-reanimated'
import { getHead, getHeadDirection } from '../../engine/arrow'
import type { GridState } from '../../engine/types'
import { directionDelta } from '../../engine/types'
import type { ThemeColors } from '../../theme/colors'
import { ArrowPath } from './ArrowPath'
import { TouchRipple } from './TouchRipple'

// Lines extend far beyond the canvas so they appear infinite even when zoomed/panned
const LINE_EXTENT = 10000

interface RippleSharedValues {
  readonly rippleX: SharedValue<number>
  readonly rippleY: SharedValue<number>
  readonly innerOpacity: SharedValue<number>
  readonly outerOpacity: SharedValue<number>
  readonly outerRadius: SharedValue<number>
}

interface GridCanvasProps {
  readonly gridState: GridState
  readonly selectedArrowId: string | null
  readonly errorArrowIds: readonly string[]
  readonly previewArrowId: string | null
  readonly canvasWidth: number
  readonly canvasHeight: number
  readonly cellSize: number
  readonly offsetX: number
  readonly offsetY: number
  readonly canvasMarginLeft?: number
  readonly canvasMarginTop?: number
  readonly colors: ThemeColors
  readonly showGridLines: boolean
  readonly ripple?: RippleSharedValues
}

export function GridCanvas({
  gridState,
  selectedArrowId,
  errorArrowIds,
  previewArrowId,
  canvasWidth,
  canvasHeight,
  cellSize,
  offsetX,
  offsetY,
  canvasMarginLeft = 0,
  canvasMarginTop = 0,
  colors,
  showGridLines,
  ripple,
}: GridCanvasProps) {
  // Dots at cell centers — always visible as subtle grid reference
  const dotElements = useMemo(() => {
    return Array.from({ length: gridState.width * gridState.height }, (_, idx) => ({
      key: `d${idx}`,
      cx: offsetX + (idx % gridState.width) * cellSize + cellSize / 2,
      cy: offsetY + Math.floor(idx / gridState.width) * cellSize + cellSize / 2,
    }))
  }, [gridState.width, gridState.height, cellSize, offsetX, offsetY])

  // Grid lines through cell centers — extend far beyond puzzle for infinite appearance
  const lineElements = useMemo(() => {
    if (!showGridLines) return null
    const lines: { key: string; p1: { x: number; y: number }; p2: { x: number; y: number } }[] = []

    for (let row = 0; row < gridState.height; row++) {
      const y = offsetY + row * cellSize + cellSize / 2
      lines.push({
        key: `h${row}`,
        p1: { x: -LINE_EXTENT, y },
        p2: { x: LINE_EXTENT, y },
      })
    }
    for (let col = 0; col < gridState.width; col++) {
      const x = offsetX + col * cellSize + cellSize / 2
      lines.push({
        key: `v${col}`,
        p1: { x, y: -LINE_EXTENT },
        p2: { x, y: LINE_EXTENT },
      })
    }
    return lines
  }, [showGridLines, gridState.width, gridState.height, cellSize, offsetX, offsetY])

  // Direction preview line: from arrow head extending infinitely in head direction
  const previewLine = useMemo(() => {
    if (!previewArrowId) return null
    const arrow = gridState.arrows.find((a) => a.id === previewArrowId)
    if (!arrow) return null

    const head = getHead(arrow)
    const direction = getHeadDirection(arrow)
    const delta = directionDelta(direction)

    const headCx = offsetX + head.col * cellSize + cellSize / 2
    const headCy = offsetY + head.row * cellSize + cellSize / 2

    const endX = headCx + delta.col * LINE_EXTENT
    const endY = headCy + delta.row * LINE_EXTENT

    return { p1: { x: headCx, y: headCy }, p2: { x: endX, y: endY } }
  }, [previewArrowId, gridState.arrows, cellSize, offsetX, offsetY])

  return (
    <Canvas
      style={{
        width: canvasWidth,
        height: canvasHeight,
        marginLeft: canvasMarginLeft,
        marginTop: canvasMarginTop,
      }}
    >
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
        <>
          {/* Neon glow behind direction preview */}
          <Line
            p1={vec(previewLine.p1.x, previewLine.p1.y)}
            p2={vec(previewLine.p2.x, previewLine.p2.y)}
            color={colors.arrowHint}
            strokeWidth={8}
            opacity={0.1}
          />
          <Line
            p1={vec(previewLine.p1.x, previewLine.p1.y)}
            p2={vec(previewLine.p2.x, previewLine.p2.y)}
            color={colors.arrowHint}
            strokeWidth={4}
            opacity={0.25}
          />
          <Line
            p1={vec(previewLine.p1.x, previewLine.p1.y)}
            p2={vec(previewLine.p2.x, previewLine.p2.y)}
            color="#FFFFFF"
            strokeWidth={1.5}
            opacity={0.6}
          >
            <DashPathEffect intervals={[6, 4]} />
          </Line>
        </>
      )}

      {ripple && (
        <TouchRipple
          rippleX={ripple.rippleX}
          rippleY={ripple.rippleY}
          innerOpacity={ripple.innerOpacity}
          outerOpacity={ripple.outerOpacity}
          outerRadius={ripple.outerRadius}
          innerRadius={cellSize * 0.8}
          innerColor={colors.touchRipple}
          outerColor={colors.touchRippleOuter}
        />
      )}
    </Canvas>
  )
}
