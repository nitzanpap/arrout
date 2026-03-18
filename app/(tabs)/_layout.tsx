import { Tabs } from 'expo-router'
import { Text } from 'react-native'

const SURFACE = '#161929'
const ACCENT = '#5B5FEF'
const TEXT_SECONDARY = '#6C7099'

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '\u25B6',
    Challenge: '\u2605',
    Collection: '\u2606',
    Settings: '\u2699',
  }
  return (
    <Text style={{ fontSize: 20, color: focused ? ACCENT : TEXT_SECONDARY }}>
      {icons[label] ?? '\u25CF'}
    </Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SURFACE,
          borderTopColor: 'rgba(200, 206, 255, 0.08)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: TEXT_SECONDARY,
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
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="challenge"
        options={{
          title: 'Challenge',
          tabBarIcon: ({ focused }) => <TabIcon label="Challenge" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ focused }) => <TabIcon label="Collection" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
