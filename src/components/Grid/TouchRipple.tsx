import { Circle } from '@shopify/react-native-skia'
import { type SharedValue, useDerivedValue } from 'react-native-reanimated'

interface TouchRippleProps {
  readonly rippleX: SharedValue<number>
  readonly rippleY: SharedValue<number>
  readonly innerOpacity: SharedValue<number>
  readonly outerOpacity: SharedValue<number>
  readonly outerRadius: SharedValue<number>
  readonly innerRadius: number
  readonly innerColor: string
  readonly outerColor: string
}

export function TouchRipple({
  rippleX,
  rippleY,
  innerOpacity,
  outerOpacity,
  outerRadius,
  innerRadius,
  innerColor,
  outerColor,
}: TouchRippleProps) {
  const cx = useDerivedValue(() => rippleX.value)
  const cy = useDerivedValue(() => rippleY.value)
  const iOpacity = useDerivedValue(() => innerOpacity.value)
  const oOpacity = useDerivedValue(() => outerOpacity.value)
  const oRadius = useDerivedValue(() => outerRadius.value)

  return (
    <>
      <Circle cx={cx} cy={cy} r={oRadius} color={outerColor} opacity={oOpacity} />
      <Circle cx={cx} cy={cy} r={innerRadius} color={innerColor} opacity={iOpacity} />
    </>
  )
}
