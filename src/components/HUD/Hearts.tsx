import { StyleSheet, View } from 'react-native'
import type { ThemeColors } from '../../theme/colors'
import { HeartIcon } from './Icons'

interface HeartsProps {
  readonly remaining: number
  readonly total?: number
  readonly colors: ThemeColors
}

const HEART_SIZE = 22

export function Hearts({ remaining, total = 3, colors }: HeartsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <HeartIcon
          key={`heart-${i}`}
          size={HEART_SIZE}
          color={i < remaining ? colors.heartFilled : colors.heartEmpty}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
})
