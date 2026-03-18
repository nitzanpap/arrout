import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import {
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated'
import type { ThemeColors } from '../../theme/colors'

const DIRS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const
type Dir = (typeof DIRS)[number]

interface GhostArrow {
  readonly dir: Dir
  readonly lane: number
  readonly len: number
  readonly spd: number
  readonly cycle: number
  readonly off: number
  readonly layer: 0 | 1 | 2
}

const CELL = 28
const ARROW_COUNT = 36
const LEN_MIN = 2
const LEN_MAX = 5
const SPD_MIN = 0.6
const SPD_MAX = 3.5
const HEAD_SIZE = CELL * 0.15
const STROKE_W = Math.max(2, CELL * 0.06)
const DOT_R = 0.75

const LAYER_OPACITY = [0.05, 0.1, 0.17]

const BURST_SPEED = 8
const BURST_LEN = 2
const BURST_DUR = 0.7
const BURST_ALPHA = 0.35
const RING_SPEED = 250
const RING_DUR = 0.5
const RING_ALPHA = 0.12

export interface RippleEvent {
  readonly x: number
  readonly y: number
  readonly id: number
}

interface Props {
  readonly colors: ThemeColors
  readonly ripple: SharedValue<RippleEvent>
}

export function ArrowFieldBackground({ colors, ripple }: Props) {
  const { width, height } = useWindowDimensions()
  const cols = Math.ceil(width / CELL) + 1
  const rows = Math.ceil(height / CELL) + 1

  const arrows = useMemo(() => {
    const out: GhostArrow[] = []
    for (let i = 0; i < ARROW_COUNT; i++) {
      const dir = DIRS[i % 4]
      const horiz = dir === 'LEFT' || dir === 'RIGHT'
      const lane = Math.floor(Math.random() * (horiz ? rows : cols))
      const len = LEN_MIN + Math.floor(Math.random() * (LEN_MAX - LEN_MIN + 1))
      const spd = SPD_MIN + Math.random() * (SPD_MAX - SPD_MIN)
      const dim = horiz ? cols : rows
      const cycle = dim + len * 2 + 2
      const off = Math.random() * cycle
      out.push({
        dir,
        lane,
        len,
        spd,
        cycle,
        off,
        layer: (i % 3) as 0 | 1 | 2,
      })
    }
    return out
  }, [cols, rows])

  const arrowsSV = useSharedValue(arrows)
  useEffect(() => {
    arrowsSV.value = arrows
  }, [arrows, arrowsSV])

  const clock = useSharedValue(0)
  const rippleState = useSharedValue({ x: 0, y: 0, startTime: -10 })
  const lastRippleId = useSharedValue(0)

  useFrameCallback((info) => {
    clock.value = info.timeSinceFirstFrame / 1000
    if (ripple.value.id !== lastRippleId.value) {
      lastRippleId.value = ripple.value.id
      rippleState.value = {
        x: ripple.value.x,
        y: ripple.value.y,
        startTime: clock.value,
      }
    }
  })

  const dotsPath = useMemo(() => {
    const p = Skia.Path.Make()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        p.addCircle(c * CELL + CELL / 2, r * CELL + CELL / 2, DOT_R)
      }
    }
    return p
  }, [cols, rows])

  const body0 = useDerivedValue(() => makeBodyPath(arrowsSV.value, clock.value, 0, cols, rows))
  const body1 = useDerivedValue(() => makeBodyPath(arrowsSV.value, clock.value, 1, cols, rows))
  const body2 = useDerivedValue(() => makeBodyPath(arrowsSV.value, clock.value, 2, cols, rows))

  const head0 = useDerivedValue(() => makeHeadPath(arrowsSV.value, clock.value, 0, cols, rows))
  const head1 = useDerivedValue(() => makeHeadPath(arrowsSV.value, clock.value, 1, cols, rows))
  const head2 = useDerivedValue(() => makeHeadPath(arrowsSV.value, clock.value, 2, cols, rows))

  const burstBody = useDerivedValue(() => {
    const elapsed = clock.value - rippleState.value.startTime
    if (elapsed < 0 || elapsed > BURST_DUR) return Skia.Path.Make()
    return makeBurstBody(rippleState.value.x, rippleState.value.y, elapsed)
  })

  const burstHead = useDerivedValue(() => {
    const elapsed = clock.value - rippleState.value.startTime
    if (elapsed < 0 || elapsed > BURST_DUR) return Skia.Path.Make()
    return makeBurstHead(rippleState.value.x, rippleState.value.y, elapsed)
  })

  const burstOpacity = useDerivedValue(() => {
    const elapsed = clock.value - rippleState.value.startTime
    if (elapsed < 0 || elapsed > BURST_DUR) return 0
    return BURST_ALPHA * (1 - elapsed / BURST_DUR)
  })

  const ringR = useDerivedValue(() => {
    const elapsed = clock.value - rippleState.value.startTime
    if (elapsed < 0 || elapsed > RING_DUR) return 0
    return elapsed * RING_SPEED
  })

  const ringAlpha = useDerivedValue(() => {
    const elapsed = clock.value - rippleState.value.startTime
    if (elapsed < 0 || elapsed > RING_DUR) return 0
    return RING_ALPHA * (1 - elapsed / RING_DUR)
  })

  const ringCx = useDerivedValue(() => rippleState.value.x)
  const ringCy = useDerivedValue(() => rippleState.value.y)

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path path={dotsPath} color={colors.arrowColor} opacity={0.04} style="fill" />

      <Group opacity={LAYER_OPACITY[0]}>
        <Path
          path={body0}
          color={colors.arrowColor}
          style="stroke"
          strokeWidth={STROKE_W}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={head0} color={colors.arrowColor} style="fill" />
      </Group>

      <Group opacity={LAYER_OPACITY[1]}>
        <Path
          path={body1}
          color={colors.arrowColor}
          style="stroke"
          strokeWidth={STROKE_W}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={head1} color={colors.arrowColor} style="fill" />
      </Group>

      <Group opacity={LAYER_OPACITY[2]}>
        <Path
          path={body2}
          color={colors.accent}
          style="stroke"
          strokeWidth={STROKE_W}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={head2} color={colors.accent} style="fill" />
      </Group>

      <Circle
        cx={ringCx}
        cy={ringCy}
        r={ringR}
        color={colors.accent}
        style="stroke"
        strokeWidth={1.5}
        opacity={ringAlpha}
      />

      <Group opacity={burstOpacity}>
        <Path
          path={burstBody}
          color={colors.accent}
          style="stroke"
          strokeWidth={STROKE_W * 1.5}
          strokeCap="round"
          strokeJoin="round"
        />
        <Path path={burstHead} color={colors.accent} style="fill" />
      </Group>
    </Canvas>
  )
}

function arrowPos(
  a: GhostArrow,
  t: number,
  cols: number,
  rows: number
): { hx: number; hy: number; tx: number; ty: number } {
  'worklet'
  const progress = (t * a.spd + a.off) % a.cycle
  const horiz = a.dir === 'LEFT' || a.dir === 'RIGHT'
  const rev = a.dir === 'LEFT' || a.dir === 'UP'
  const dim = horiz ? cols : rows

  let hc = progress - a.len
  if (rev) hc = dim - 1 - hc

  const tc = rev ? hc + (a.len - 1) : hc - (a.len - 1)
  const half = CELL / 2
  const lp = a.lane * CELL + half

  return horiz
    ? { hx: hc * CELL + half, hy: lp, tx: tc * CELL + half, ty: lp }
    : { hx: lp, hy: hc * CELL + half, tx: lp, ty: tc * CELL + half }
}

function makeBodyPath(arrows: GhostArrow[], t: number, layer: number, cols: number, rows: number) {
  'worklet'
  const p = Skia.Path.Make()
  for (let i = 0; i < arrows.length; i++) {
    if (arrows[i].layer !== layer) continue
    const { hx, hy, tx, ty } = arrowPos(arrows[i], t, cols, rows)
    p.moveTo(tx, ty)
    p.lineTo(hx, hy)
  }
  return p
}

function makeHeadPath(arrows: GhostArrow[], t: number, layer: number, cols: number, rows: number) {
  'worklet'
  const p = Skia.Path.Make()
  const s = HEAD_SIZE
  for (let i = 0; i < arrows.length; i++) {
    const a = arrows[i]
    if (a.layer !== layer) continue
    const { hx, hy } = arrowPos(a, t, cols, rows)
    switch (a.dir) {
      case 'UP':
        p.moveTo(hx, hy - s)
        p.lineTo(hx - s, hy + s * 0.5)
        p.lineTo(hx + s, hy + s * 0.5)
        p.close()
        break
      case 'DOWN':
        p.moveTo(hx, hy + s)
        p.lineTo(hx - s, hy - s * 0.5)
        p.lineTo(hx + s, hy - s * 0.5)
        p.close()
        break
      case 'LEFT':
        p.moveTo(hx - s, hy)
        p.lineTo(hx + s * 0.5, hy - s)
        p.lineTo(hx + s * 0.5, hy + s)
        p.close()
        break
      case 'RIGHT':
        p.moveTo(hx + s, hy)
        p.lineTo(hx - s * 0.5, hy - s)
        p.lineTo(hx - s * 0.5, hy + s)
        p.close()
        break
    }
  }
  return p
}

function makeBurstBody(rx: number, ry: number, elapsed: number) {
  'worklet'
  const p = Skia.Path.Make()
  const hd = elapsed * BURST_SPEED * CELL
  const td = Math.max(0, hd - BURST_LEN * CELL)

  // UP
  p.moveTo(rx, ry - td)
  p.lineTo(rx, ry - hd)
  // DOWN
  p.moveTo(rx, ry + td)
  p.lineTo(rx, ry + hd)
  // LEFT
  p.moveTo(rx - td, ry)
  p.lineTo(rx - hd, ry)
  // RIGHT
  p.moveTo(rx + td, ry)
  p.lineTo(rx + hd, ry)

  return p
}

function makeBurstHead(rx: number, ry: number, elapsed: number) {
  'worklet'
  const p = Skia.Path.Make()
  const dist = elapsed * BURST_SPEED * CELL
  const s = HEAD_SIZE * 1.3

  // UP
  p.moveTo(rx, ry - dist - s)
  p.lineTo(rx - s, ry - dist + s * 0.5)
  p.lineTo(rx + s, ry - dist + s * 0.5)
  p.close()

  // DOWN
  p.moveTo(rx, ry + dist + s)
  p.lineTo(rx - s, ry + dist - s * 0.5)
  p.lineTo(rx + s, ry + dist - s * 0.5)
  p.close()

  // LEFT
  p.moveTo(rx - dist - s, ry)
  p.lineTo(rx - dist + s * 0.5, ry - s)
  p.lineTo(rx - dist + s * 0.5, ry + s)
  p.close()

  // RIGHT
  p.moveTo(rx + dist + s, ry)
  p.lineTo(rx + dist - s * 0.5, ry - s)
  p.lineTo(rx + dist - s * 0.5, ry + s)
  p.close()

  return p
}
