import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useThemeColors } from '../../src/theme/colors'

function TabIcon({
  label,
  focused,
  colors,
}: {
  label: string
  focused: boolean
  colors: { accent: string; textSecondary: string }
}) {
  const icons: Record<string, string> = {
    Home: '\u25B6',
    Challenge: '\u2605',
    Collection: '\u2606',
    Settings: '\u2699',
  }
  return (
    <Text style={{ fontSize: 20, color: focused ? colors.accent : colors.textSecondary }}>
      {icons[label] ?? '\u25CF'}
    </Text>
  )
}

export default function TabLayout() {
  const colors = useThemeColors()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.headerBand,
          borderTopColor: colors.gridLine,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} colors={colors} />,
        }}
      />
      <Tabs.Screen
        name="challenge"
        options={{
          title: 'Challenge',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Challenge" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Collection" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Settings" focused={focused} colors={colors} />
          ),
        }}
      />
    </Tabs>
  )
}
