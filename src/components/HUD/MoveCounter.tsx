import { StyleSheet, Text, View } from 'react-native'

interface MoveCounterProps {
  readonly moves: number
  readonly optimal?: number
}

export function MoveCounter({ moves, optimal }: MoveCounterProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Moves</Text>
      <Text style={styles.count}>
        {moves}
        {optimal != null && <Text style={styles.optimal}> / {optimal}</Text>}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    color: '#6C7099',
    fontSize: 11,
  },
  count: {
    color: '#EEF0FF',
    fontSize: 18,
    fontWeight: '700',
  },
  optimal: {
    color: '#6C7099',
    fontSize: 14,
    fontWeight: '400',
  },
})
