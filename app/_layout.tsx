import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { useResolvedScheme, useThemeColors } from '../src/theme/colors'

export default function RootLayout() {
  const colors = useThemeColors()
  const scheme = useResolvedScheme()
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
