import { Pressable, StyleSheet, Text } from 'react-native'

interface HintButtonProps {
  readonly onPress: () => void
  readonly disabled?: boolean
}

export function HintButton({ onPress, disabled = false }: HintButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>Hint</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#5B5FEF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabled: {
    backgroundColor: '#2A2D42',
  },
  text: {
    color: '#EEF0FF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledText: {
    color: '#6C7099',
  },
})
