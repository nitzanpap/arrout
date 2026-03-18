import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useProgressStore } from '../../src/store/progress.store'
import { useThemeColors } from '../../src/theme/colors'

function AwardBadge({
  label,
  tier,
  maxTier,
  colors,
}: {
  label: string
  tier: number
  maxTier: number
  colors: {
    textPrimary: string
    textSecondary: string
    headerBand: string
    accent: string
    buttonBg: string
  }
}) {
  return (
    <View style={[styles.awardCard, { backgroundColor: colors.headerBand }]}>
      <Text style={[styles.awardEmoji, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[styles.tierBar, { backgroundColor: colors.buttonBg }]}>
        <View
          style={[
            styles.tierFill,
            { width: `${(tier / maxTier) * 100}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>
      <Text style={[styles.tierText, { color: colors.textSecondary }]}>
        Tier {tier} / {maxTier}
      </Text>
    </View>
  )
}

function StatCard({
  label,
  value,
  colors,
}: {
  label: string
  value: number
  colors: { textPrimary: string; textSecondary: string; headerBand: string }
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.headerBand }]}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  )
}

export default function CollectionScreen() {
  const colors = useThemeColors()
  const streak = useProgressStore((s) => s.streak)
  const longestStreak = useProgressStore((s) => s.longestStreak)
  const highestWinStreak = useProgressStore((s) => s.highestWinStreak)
  const completedLevels = useProgressStore((s) => s.completedLevels)
  const perfectLevels = useProgressStore((s) => s.perfectLevels)
  const levelLegendTier = useProgressStore((s) => s.levelLegendTier)
  const perfectPlayTier = useProgressStore((s) => s.perfectPlayTier)
  const unstoppableTier = useProgressStore((s) => s.unstoppableTier)

  const d = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      title: { color: colors.textPrimary },
      sectionTitle: { color: colors.textPrimary },
    }),
    [colors]
  )

  return (
    <SafeAreaView style={[styles.container, d.container]}>
      <View style={styles.content}>
        <Text style={[styles.title, d.title]}>Collection</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Current Streak" value={streak} colors={colors} />
          <StatCard label="Best Streak" value={longestStreak} colors={colors} />
          <StatCard label="Win Streak" value={highestWinStreak} colors={colors} />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Levels" value={completedLevels.length} colors={colors} />
          <StatCard label="Perfect" value={perfectLevels.length} colors={colors} />
        </View>

        {/* Awards */}
        <Text style={[styles.sectionTitle, d.sectionTitle]}>Awards</Text>
        <AwardBadge label="Level Legend" tier={levelLegendTier} maxTier={10} colors={colors} />
        <AwardBadge label="Perfect Play" tier={perfectPlayTier} maxTier={10} colors={colors} />
        <AwardBadge label="Unstoppable" tier={unstoppableTier} maxTier={10} colors={colors} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
  },
  awardCard: {
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  awardEmoji: {
    fontSize: 14,
    fontWeight: '700',
  },
  tierBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierFill: {
    height: '100%',
    borderRadius: 3,
  },
  tierText: {
    fontSize: 12,
  },
})
