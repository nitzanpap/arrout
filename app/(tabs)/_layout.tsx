import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import { useThemeColors } from '../../src/theme/colors'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const TAB_ICONS: Record<string, IoniconsName> = {
  Home: 'play',
  Challenge: 'star',
  Collection: 'trophy',
  Settings: 'settings-sharp',
}

function TabIcon({
  label,
  focused,
  colors,
}: {
  label: string
  focused: boolean
  colors: { accent: string; textSecondary: string }
}) {
  const name = TAB_ICONS[label] ?? 'ellipse'
  return <Ionicons name={name} size={26} color={focused ? colors.accent : colors.textSecondary} />
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
