import { SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useProgressStore } from '../../src/store/progress.store'

const BG = '#0F1120'
const SURFACE = '#161929'
const TEXT_PRIMARY = '#EEF0FF'
const TEXT_SECONDARY = '#6C7099'
const ACCENT = '#7B77FF'

function AwardBadge({ label, tier, maxTier }: { label: string; tier: number; maxTier: number }) {
  return (
    <View style={styles.awardCard}>
      <Text style={styles.awardEmoji}>{label}</Text>
      <View style={styles.tierBar}>
        <View style={[styles.tierFill, { width: `${(tier / maxTier) * 100}%` }]} />
      </View>
      <Text style={styles.tierText}>
        Tier {tier} / {maxTier}
      </Text>
    </View>
  )
}

export default function CollectionScreen() {
  const streak = useProgressStore((s) => s.streak)
  const longestStreak = useProgressStore((s) => s.longestStreak)
  const highestWinStreak = useProgressStore((s) => s.highestWinStreak)
  const completedLevels = useProgressStore((s) => s.completedLevels)
  const perfectLevels = useProgressStore((s) => s.perfectLevels)
  const levelLegendTier = useProgressStore((s) => s.levelLegendTier)
  const perfectPlayTier = useProgressStore((s) => s.perfectPlayTier)
  const unstoppableTier = useProgressStore((s) => s.unstoppableTier)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Collection</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Current Streak" value={streak} />
          <StatCard label="Best Streak" value={longestStreak} />
          <StatCard label="Win Streak" value={highestWinStreak} />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Levels" value={completedLevels.length} />
          <StatCard label="Perfect" value={perfectLevels.length} />
        </View>

        {/* Awards */}
        <Text style={styles.sectionTitle}>Awards</Text>
        <AwardBadge label="Level Legend" tier={levelLegendTier} maxTier={10} />
        <AwardBadge label="Perfect Play" tier={perfectPlayTier} maxTier={10} />
        <AwardBadge label="Unstoppable" tier={unstoppableTier} maxTier={10} />
      </View>
    </SafeAreaView>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  awardCard: {
    backgroundColor: SURFACE,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  awardEmoji: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  tierBar: {
    height: 6,
    backgroundColor: '#2A2D42',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 3,
  },
  tierText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
})
