import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GridCanvas } from '../src/components/Grid/GridCanvas'
import { GridOverlay } from '../src/components/Grid/GridOverlay'
import { Hearts } from '../src/components/HUD/Hearts'
import { useLevelLoader } from '../src/hooks/useLevelLoader'
import { useGameStore } from '../src/store/game.store'
import { useProgressStore } from '../src/store/progress.store'
import { useThemeColors } from '../src/theme/colors'

export default function GameScreen() {
  const colors = useThemeColors()
  const router = useRouter()
  const params = useLocalSearchParams<{ level: string }>()
  const levelNumber = Number(params.level) || 1

  const { isLoading, error } = useLevelLoader(levelNumber)

  const gridState = useGameStore((s) => s.gridState)
  const heartsRemaining = useGameStore((s) => s.heartsRemaining)
  const status = useGameStore((s) => s.status)
  const selectedArrowId = useGameStore((s) => s.selectedArrowId)
  const moveHistory = useGameStore((s) => s.moveHistory)
  const level = useGameStore((s) => s.level)
  const activeAnimations = useGameStore((s) => s.activeAnimations)
  const errorArrowIds = useGameStore((s) => s.errorArrowIds)

  const makeMove = useGameStore((s) => s.makeMove)
  const restart = useGameStore((s) => s.restart)

  const recordComplete = useProgressStore((s) => s.recordLevelComplete)

  const { width: screenWidth } = useWindowDimensions()
  const padding = 20

  const canvasWidth = screenWidth - padding * 2

  const cellSize = useMemo(() => {
    if (!gridState) return 0
    const maxW = canvasWidth / gridState.width
    const maxH = canvasWidth / gridState.height
    return Math.floor(Math.min(maxW, maxH))
  }, [gridState, canvasWidth])

  const offsetX = useMemo(() => {
    if (!gridState) return 0
    return (canvasWidth - cellSize * gridState.width) / 2
  }, [gridState, cellSize, canvasWidth])

  const gridHeight = gridState ? cellSize * gridState.height : 0

  const hasActiveAnimations = activeAnimations.size > 0

  const handleArrowTap = useCallback(
    (arrowId: string) => {
      if (status !== 'playing') return
      makeMove(arrowId)
    },
    [status, makeMove]
  )

  const handleNextLevel = useCallback(() => {
    if (level) {
      const perfect = heartsRemaining === 3
      recordComplete(level.id, perfect)
    }
    router.replace({ pathname: '/game', params: { level: (levelNumber + 1).toString() } })
  }, [level, heartsRemaining, levelNumber, recordComplete, router])

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      headerBand: { backgroundColor: colors.headerBand },
      buttonBg: { backgroundColor: colors.buttonBg },
      buttonIcon: { color: colors.buttonIcon },
      levelText: { color: colors.accent },
      loadingText: { color: colors.textSecondary },
      errorText: { color: colors.arrowError },
      retryText: { color: colors.accent },
      overlayBg: { backgroundColor: colors.overlayBg },
      overlayCard: { backgroundColor: colors.overlayCard },
      overlayTitle: { color: colors.textPrimary },
      overlaySubtitle: { color: colors.textSecondary },
      nextButton: { backgroundColor: colors.accent },
      nextButtonText: { color: '#FFFFFF' },
    }),
    [colors]
  )

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Generating puzzle...</Text>
      </SafeAreaView>
    )
  }

  if (error || !gridState) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <Text style={[styles.errorText, dynamicStyles.errorText]}>
          {error ?? 'Failed to load level'}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={[styles.retryText, dynamicStyles.retryText]}>Back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      {/* Header band */}
      <View style={[styles.headerBand, dynamicStyles.headerBand]}>
        <View style={styles.topBar}>
          {/* Left: back + restart buttons */}
          <View style={styles.leftButtons}>
            <Pressable
              style={[styles.circleButton, dynamicStyles.buttonBg]}
              onPress={() => router.back()}
            >
              <Text style={[styles.circleButtonIcon, dynamicStyles.buttonIcon]}>{'\u25C0'}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.circleButton,
                dynamicStyles.buttonBg,
                hasActiveAnimations && styles.disabled,
              ]}
              onPress={restart}
              disabled={hasActiveAnimations}
            >
              <Text style={[styles.circleButtonIcon, dynamicStyles.buttonIcon]}>{'\u21BA'}</Text>
            </Pressable>
          </View>

          {/* Center: level label + hearts */}
          <View style={styles.centerInfo}>
            <Text style={[styles.levelText, dynamicStyles.levelText]}>
              {level?.difficulty === 'easy'
                ? `Level ${levelNumber}`
                : (level?.difficulty ?? `Level ${levelNumber}`)}
            </Text>
            <Hearts remaining={heartsRemaining} colors={colors} />
          </View>

          {/* Right: spacer to balance layout */}
          <View style={styles.leftButtons} />
        </View>
      </View>

      {/* Game grid */}
      <View style={styles.gridContainer}>
        <View style={{ width: canvasWidth, height: gridHeight }}>
          <GridCanvas
            gridState={gridState}
            selectedArrowId={selectedArrowId}
            errorArrowIds={errorArrowIds}
            canvasWidth={canvasWidth}
            cellSize={cellSize}
            offsetX={offsetX}
            colors={colors}
          />
          <GridOverlay
            gridState={gridState}
            cellSize={cellSize}
            offsetX={offsetX}
            onArrowTap={handleArrowTap}
          />
        </View>
      </View>

      {/* Win overlay */}
      {status === 'won' && (
        <View style={[styles.overlay, dynamicStyles.overlayBg]}>
          <View style={[styles.overlayCard, dynamicStyles.overlayCard]}>
            <Text style={[styles.overlayTitle, dynamicStyles.overlayTitle]}>Level Complete!</Text>
            <Text style={[styles.overlaySubtitle, dynamicStyles.overlaySubtitle]}>
              {moveHistory.length} moves {heartsRemaining === 3 ? '(Perfect!)' : ''}
            </Text>
            <Pressable
              style={[styles.nextButton, dynamicStyles.nextButton]}
              onPress={handleNextLevel}
            >
              <Text style={[styles.nextButtonText, dynamicStyles.nextButtonText]}>Next Level</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Fail overlay */}
      {status === 'failed' && (
        <View style={[styles.overlay, dynamicStyles.overlayBg]}>
          <View style={[styles.overlayCard, dynamicStyles.overlayCard]}>
            <Text style={[styles.overlayTitle, dynamicStyles.overlayTitle]}>Out of Hearts</Text>
            <Pressable style={[styles.nextButton, dynamicStyles.nextButton]} onPress={restart}>
              <Text style={[styles.nextButtonText, dynamicStyles.nextButtonText]}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  retryButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  retryText: {
    fontSize: 16,
  },
  headerBand: {
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  leftButtons: {
    flexDirection: 'row',
    gap: 8,
    width: 88,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonIcon: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  centerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  overlaySubtitle: {
    fontSize: 16,
  },
  nextButton: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
})
