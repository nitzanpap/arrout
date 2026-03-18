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

    const startDeg = -20
    const sweepDeg = 300
    const endDeg = startDeg + sweepDeg

    p.addArc({ x: cx - r, y: cy - r, width: r * 2, height: r * 2 }, startDeg, sweepDeg)

    const endRad = endDeg * toRad
    const ex = cx + r * Math.cos(endRad)
    const ey = cy + r * Math.sin(endRad)

    const backRad = (endDeg - 90) * toRad
    const bx = Math.cos(backRad)
    const by = Math.sin(backRad)

    const barbLen = size * 0.16
    const spread = 35 * toRad

    for (const sign of [-1, 1]) {
      const angle = spread * sign
      const dx = bx * Math.cos(angle) - by * Math.sin(angle)
      const dy = bx * Math.sin(angle) + by * Math.cos(angle)
      p.moveTo(ex, ey)
      p.lineTo(ex + barbLen * dx, ey + barbLen * dy)
    }

    return p
  }, [size])

  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={size * 0.1}
        strokeCap="round"
        strokeJoin="round"
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
