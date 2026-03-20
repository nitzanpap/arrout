import { Canvas, Path, Skia } from '@shopify/react-native-skia'
import { useMemo } from 'react'

interface IconProps {
  readonly size: number
  readonly color: string
}

export function ChevronLeftIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    const pad = size * 0.3
    const mid = size / 2
    p.moveTo(size - pad, pad)
    p.lineTo(pad, mid)
    p.lineTo(size - pad, size - pad)
    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={size * 0.12}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  )
}

export function RestartIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.34
    const toRad = Math.PI / 180

    const startDeg = -30
    const sweepDeg = 310
    const endDeg = startDeg + sweepDeg

    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg)

    const endRad = endDeg * toRad
    const ex = cx + r * Math.cos(endRad)
    const ey = cy + r * Math.sin(endRad)

    const backRad = (endDeg - 90) * toRad
    const bx = Math.cos(backRad)
    const by = Math.sin(backRad)

    const barbLen = size * 0.2
    const spread = 55 * toRad

    const barbs = [-1, 1].map((sign) => {
      const angle = spread * sign
      return {
        x: ex + barbLen * (bx * Math.cos(angle) - by * Math.sin(angle)),
        y: ey + barbLen * (bx * Math.sin(angle) + by * Math.cos(angle)),
      }
    })

    p.moveTo(barbs[0].x, barbs[0].y)
    p.lineTo(ex, ey)
    p.lineTo(barbs[1].x, barbs[1].y)

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={size * 0.07}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  )
}

export function UndoIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    const cx = size / 2
    const cy = size / 2
    const r = size * 0.34
    const toRad = Math.PI / 180

    // Counter-clockwise arc (mirrored from RestartIcon)
    const startDeg = 210
    const sweepDeg = -310
    const endDeg = startDeg + sweepDeg

    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg)

    const endRad = endDeg * toRad
    const ex = cx + r * Math.cos(endRad)
    const ey = cy + r * Math.sin(endRad)

    const backRad = (endDeg + 90) * toRad
    const bx = Math.cos(backRad)
    const by = Math.sin(backRad)

    const barbLen = size * 0.2
    const spread = 55 * toRad

    const barbs = [-1, 1].map((sign) => {
      const angle = spread * sign
      return {
        x: ex + barbLen * (bx * Math.cos(angle) - by * Math.sin(angle)),
        y: ey + barbLen * (bx * Math.sin(angle) + by * Math.cos(angle)),
      }
    })

    p.moveTo(barbs[0].x, barbs[0].y)
    p.lineTo(ex, ey)
    p.lineTo(barbs[1].x, barbs[1].y)

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={size * 0.07}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  )
}

export function GridIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    const pad = size * 0.25
    const third = (size - pad * 2) / 3

    // Two vertical lines
    p.moveTo(pad + third, pad)
    p.lineTo(pad + third, size - pad)
    p.moveTo(pad + third * 2, pad)
    p.lineTo(pad + third * 2, size - pad)

    // Two horizontal lines
    p.moveTo(pad, pad + third)
    p.lineTo(size - pad, pad + third)
    p.moveTo(pad, pad + third * 2)
    p.lineTo(size - pad, pad + third * 2)

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={size * 0.08}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  )
}

export function LightbulbIcon({ size, color }: IconProps) {
  const bulbPath = useMemo(() => {
    const p = Skia.Path.Make()
    const cx = size / 2
    const bulbR = size * 0.28
    const bulbCy = size * 0.34

    // Glass bulb — a full circle arc for the top ~270 degrees
    p.addArc({ x: cx - bulbR, y: bulbCy - bulbR, width: bulbR * 2, height: bulbR * 2 }, -210, 240)

    // Neck curves down from arc ends to the base
    const neckW = bulbR * 0.5
    const neckTop = bulbCy + bulbR * 0.52
    const neckBot = neckTop + size * 0.12

    // Right side neck
    p.lineTo(cx + neckW, neckTop)
    p.lineTo(cx + neckW, neckBot)

    // Base bottom
    p.moveTo(cx - neckW, neckBot)
    p.lineTo(cx - neckW, neckTop)

    // Left side connects back to arc start
    const arcStartRad = (-210 * Math.PI) / 180
    p.lineTo(cx + bulbR * Math.cos(arcStartRad), bulbCy + bulbR * Math.sin(arcStartRad))

    // Base lines (screw threads)
    p.moveTo(cx - neckW, neckBot)
    p.lineTo(cx + neckW, neckBot)

    p.moveTo(cx - neckW * 0.7, neckBot + size * 0.06)
    p.lineTo(cx + neckW * 0.7, neckBot + size * 0.06)

    return p
  }, [size])

  // Filament rays inside the bulb
  const filamentPath = useMemo(() => {
    const p = Skia.Path.Make()
    const cx = size / 2
    const cy = size * 0.34

    // Small vertical line as filament
    p.moveTo(cx, cy - size * 0.08)
    p.lineTo(cx, cy + size * 0.08)

    // Two small diagonal rays
    p.moveTo(cx - size * 0.06, cy - size * 0.04)
    p.lineTo(cx - size * 0.06, cy + size * 0.06)
    p.moveTo(cx + size * 0.06, cy - size * 0.04)
    p.lineTo(cx + size * 0.06, cy + size * 0.06)

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={bulbPath}
        color={color}
        style="stroke"
        strokeWidth={size * 0.07}
        strokeCap="round"
        strokeJoin="round"
      />
      <Path
        path={filamentPath}
        color={color}
        style="stroke"
        strokeWidth={size * 0.05}
        strokeCap="round"
      />
    </Canvas>
  )
}

export function HeartIcon({ size, color }: IconProps) {
  const path = useMemo(() => {
    const p = Skia.Path.Make()
    const w = size
    const h = size
    const cx = w / 2

    p.moveTo(cx, h * 0.85)
    p.cubicTo(w * -0.05, h * 0.45, w * 0.05, h * 0.05, cx, h * 0.32)
    p.cubicTo(w * 0.95, h * 0.05, w * 1.05, h * 0.45, cx, h * 0.85)
    p.close()

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path} color={color} style="fill" />
    </Canvas>
  )
}
