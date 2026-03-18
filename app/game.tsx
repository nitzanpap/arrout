import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GridCanvas } from '../src/components/Grid/GridCanvas'
import { Hearts } from '../src/components/HUD/Hearts'
import type { Difficulty } from '../src/engine/types'
import { useGridGestures } from '../src/hooks/useGridGestures'
import { useInactivityHint } from '../src/hooks/useInactivityHint'
import { useLevelLoader } from '../src/hooks/useLevelLoader'
import { useGameStore } from '../src/store/game.store'
import { useProgressStore } from '../src/store/progress.store'
import { useThemeColors } from '../src/theme/colors'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  superHard: 'Super Hard',
}

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
  const selectArrow = useGameStore((s) => s.selectArrow)
  const storeUseHint = useGameStore((s) => s.useHint)

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

  const [containerLayout, setContainerLayout] = useState({ width: canvasWidth, height: 0 })

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setContainerLayout({ width, height })
  }, [])

  const hasActiveAnimations = activeAnimations.size > 0

  const { showHintFab, resetInactivityTimer, triggerHint } = useInactivityHint(
    status,
    storeUseHint,
    selectArrow
  )

  const handleArrowTap = useCallback(
    (arrowId: string) => {
      if (status !== 'playing') return
      resetInactivityTimer()
      makeMove(arrowId)
    },
    [status, makeMove, resetInactivityTimer]
  )

  const { gesture, animatedStyle } = useGridGestures({
    gridState,
    cellSize,
    offsetX,
    contentWidth: canvasWidth,
    contentHeight: gridHeight,
    containerWidth: containerLayout.width,
    containerHeight: containerLayout.height || gridHeight,
    onArrowTap: handleArrowTap,
  })

  const handleRestart = useCallback(() => {
    restart()
    resetInactivityTimer()
  }, [restart, resetInactivityTimer])

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

  if (__DEV__ && selectedArrowId) console.debug('[game] selectedArrowId =', selectedArrowId)

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
              onPress={handleRestart}
              disabled={hasActiveAnimations}
            >
              <Text style={[styles.circleButtonIcon, dynamicStyles.buttonIcon]}>{'\u21BA'}</Text>
            </Pressable>
          </View>

          {/* Center: level label + difficulty + hearts */}
          <View style={styles.centerInfo}>
            <Text style={[styles.levelText, dynamicStyles.levelText]}>Level {levelNumber}</Text>
            {level?.difficulty && (
              <Text style={[styles.difficultyText, { color: colors.textSecondary }]}>
                {DIFFICULTY_LABELS[level.difficulty]}
              </Text>
            )}
            <Hearts remaining={heartsRemaining} colors={colors} />
          </View>

          {/* Right: spacer to balance layout */}
          <View style={styles.leftButtons} />
        </View>
      </View>

      {/* Game grid */}
      <View style={[styles.gridContainer, styles.gridClip]} onLayout={handleContainerLayout}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[{ width: canvasWidth, height: gridHeight }, animatedStyle]}>
            <GridCanvas
              gridState={gridState}
              selectedArrowId={selectedArrowId}
              errorArrowIds={errorArrowIds}
              canvasWidth={canvasWidth}
              cellSize={cellSize}
              offsetX={offsetX}
              colors={colors}
            />
          </Animated.View>
        </GestureDetector>
        {showHintFab && status === 'playing' && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.hintFab}
          >
            <Pressable
              style={[
                styles.hintFabButton,
                { backgroundColor: colors.accent },
                hasActiveAnimations && styles.disabled,
              ]}
              onPress={triggerHint}
              disabled={hasActiveAnimations}
            >
              <Text style={styles.hintFabText}>?</Text>
            </Pressable>
          </Animated.View>
        )}
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
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
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
  gridClip: {
    overflow: 'hidden',
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
  hintFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  hintFabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  hintFabText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
})
