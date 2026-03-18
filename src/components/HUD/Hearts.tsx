import { StyleSheet, Text, View } from 'react-native'
import type { ThemeColors } from '../../theme/colors'

interface HeartsProps {
  readonly remaining: number
  readonly total?: number
  readonly colors: ThemeColors
}

export function Hearts({ remaining, total = 3, colors }: HeartsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <Text
          key={`heart-${i}`}
          style={[styles.heart, { color: i < remaining ? colors.heartFilled : colors.heartEmpty }]}
        >
          {i < remaining ? '\u2665' : '\u2661'}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  heart: {
    fontSize: 24,
  },
})
