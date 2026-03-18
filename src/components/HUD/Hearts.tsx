import { StyleSheet, Text, View } from 'react-native'

interface HeartsProps {
  readonly remaining: number
  readonly total?: number
}

const DANGER_COLOR = '#FF4A6A'
const EMPTY_COLOR = '#2A2D42'

export function Hearts({ remaining, total = 3 }: HeartsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <Text
          key={`heart-${i}`}
          style={[styles.heart, { color: i < remaining ? DANGER_COLOR : EMPTY_COLOR }]}
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
