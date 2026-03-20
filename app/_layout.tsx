import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SoundManager } from '../src/audio'
import { useResolvedScheme, useThemeColors } from '../src/theme/colors'

export default function RootLayout() {
  const colors = useThemeColors()
  const scheme = useResolvedScheme()
  const statusBarStyle = scheme === 'light' ? 'dark' : 'light'

  useEffect(() => {
    SoundManager.preloadAll()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  )
}
