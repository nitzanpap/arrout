import { StyleSheet, Text, View } from 'react-native'

export default function ChallengeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Challenge</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})
