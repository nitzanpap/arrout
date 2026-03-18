import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme, View } from 'react-native'
import { darkColors, lightColors } from '../src/theme/colors'

export default function RootLayout() {
  const scheme = useColorScheme()
  const colors = scheme === 'light' ? lightColors : darkColors
  const statusBarStyle = scheme === 'light' ? 'dark' : 'light'

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game"
          options={{
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
      </Stack>
    </View>
  )
}
