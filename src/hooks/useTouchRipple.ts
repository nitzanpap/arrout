import { useCallback } from 'react'
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated'

const INNER_FADE_DURATION = 300
const OUTER_EXPAND_DURATION = 500

interface UseTouchRippleOptions {
  readonly innerRadius: number
  readonly outerMaxRadius: number
}

export function useTouchRipple({ innerRadius, outerMaxRadius }: UseTouchRippleOptions) {
  const rippleX = useSharedValue(0)
  const rippleY = useSharedValue(0)
  const innerOpacity = useSharedValue(0)
  const outerOpacity = useSharedValue(0)
  const outerRadius = useSharedValue(0)

  const triggerRipple = useCallback(
    (x: number, y: number) => {
      // Cancel any in-progress animations
      cancelAnimation(innerOpacity)
      cancelAnimation(outerOpacity)
      cancelAnimation(outerRadius)

      // Set position
      rippleX.value = x
      rippleY.value = y

      // Inner circle: appear instantly, fade out
      innerOpacity.value = 1
      innerOpacity.value = withTiming(0, {
        duration: INNER_FADE_DURATION,
        easing: Easing.out(Easing.ease),
      })

      // Outer circle: appear at inner radius, expand + fade out
      outerRadius.value = innerRadius
      outerOpacity.value = 1
      outerRadius.value = withTiming(outerMaxRadius, {
        duration: OUTER_EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
      })
      outerOpacity.value = withTiming(0, {
        duration: OUTER_EXPAND_DURATION,
        easing: Easing.out(Easing.ease),
      })
    },
    [rippleX, rippleY, innerOpacity, outerOpacity, outerRadius, innerRadius, outerMaxRadius]
  )

  return {
    rippleX,
    rippleY,
    innerOpacity,
    outerOpacity,
    outerRadius,
    triggerRipple,
  }
}
