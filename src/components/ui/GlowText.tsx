import type { ComponentProps, ReactNode } from 'react'
import { StyleSheet, type TextStyle } from 'react-native'
import Animated from 'react-native-reanimated'

interface GlowTextProps {
  readonly children: ReactNode
  readonly style?: TextStyle | readonly (TextStyle | undefined | false)[]
  readonly glowColor: string
  readonly glowRadius?: number
  readonly entering?: ComponentProps<typeof Animated.Text>['entering']
}

export function GlowText({ children, style, glowColor, glowRadius = 20, entering }: GlowTextProps) {
  const glowStyle: TextStyle = {
    textShadowColor: glowColor,
    textShadowRadius: glowRadius,
    textShadowOffset: { width: 0, height: 0 },
  }

  return (
    <Animated.View entering={entering} style={styles.wrapper}>
      <Animated.Text
        style={[styles.shadowLayer, style, glowStyle, { left: -glowRadius, right: -glowRadius }]}
      >
        {children}
      </Animated.Text>
      <Animated.Text style={[styles.mainLayer, style]}>{children}</Animated.Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowLayer: {
    position: 'absolute',
    textAlign: 'center',
  },
  mainLayer: {
    textAlign: 'center',
  },
})
