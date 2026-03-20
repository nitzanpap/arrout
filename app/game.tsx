import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GridCanvas } from '../src/components/Grid/GridCanvas'
import { CelebrationOverlay } from '../src/components/HUD/CelebrationOverlay'
import { Hearts } from '../src/components/HUD/Hearts'
import { ChevronLeftIcon, GridIcon, LightbulbIcon, UndoIcon } from '../src/components/HUD/Icons'
import type { Difficulty } from '../src/engine/types'
import { useGridGestures } from '../src/hooks/useGridGestures'
import { useInactivityHint } from '../src/hooks/useInactivityHint'
import { useLevelLoader } from '../src/hooks/useLevelLoader'
import { getLevel } from '../src/levels'
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
  const initialGridState = useGameStore((s) => s.initialGridState)
  const heartsRemaining = useGameStore((s) => s.heartsRemaining)
  const status = useGameStore((s) => s.status)
  const selectedArrowId = useGameStore((s) => s.selectedArrowId)
  const moveHistory = useGameStore((s) => s.moveHistory)
  const level = useGameStore((s) => s.level)
  const activeAnimations = useGameStore((s) => s.activeAnimations)
  const errorArrowIds = useGameStore((s) => s.errorArrowIds)

  const makeMove = useGameStore((s) => s.makeMove)
  const undo = useGameStore((s) => s.undo)
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
  const [showGridLines, setShowGridLines] = useState(false)
  const [previewArrowId, setPreviewArrowId] = useState<string | null>(null)

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setContainerLayout({ width, height })
  }, [])

  const hasActiveAnimations = activeAnimations.size > 0
  const canUndo = moveHistory.length > 0 && !hasActiveAnimations

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

  const handlePreviewArrow = useCallback((arrowId: string | null) => {
    setPreviewArrowId(arrowId)
  }, [])

  const { gesture, animatedStyle } = useGridGestures({
    gridState,
    cellSize,
    offsetX,
    contentWidth: canvasWidth,
    contentHeight: gridHeight,
    containerWidth: containerLayout.width,
    containerHeight: containerLayout.height || gridHeight,
    onArrowTap: handleArrowTap,
    onPreviewArrow: handlePreviewArrow,
  })

  const handleUndo = useCallback(() => {
    undo()
    resetInactivityTimer()
  }, [undo, resetInactivityTimer])

  const handleNextLevel = useCallback(() => {
    if (level) {
      const perfect = heartsRemaining === 3
      recordComplete(level.id, perfect)
    }
    router.replace({ pathname: '/game', params: { level: (levelNumber + 1).toString() } })
  }, [level, heartsRemaining, levelNumber, recordComplete, router])

  const toggleGridLines = useCallback(() => {
    setShowGridLines((prev) => !prev)
  }, [])

  // Next level info for celebration screen
  const nextLevelDifficulty = useMemo<Difficulty | null>(() => {
    try {
      const next = getLevel(levelNumber + 1)
      return next.difficulty
    } catch {
      return null
    }
  }, [levelNumber])

  // Progress bar
  const totalArrows = initialGridState?.arrows.length ?? 0
  const remainingArrows = gridState?.arrows.length ?? 0
  const progress = totalArrows > 0 ? (totalArrows - remainingArrows) / totalArrows : 0

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress * 100}%`, { duration: 300 }),
  }))

  const dynamicStyles = useMemo(
    () => ({
      container: { backgroundColor: colors.background },
      headerBand: { backgroundColor: colors.headerBand },
      buttonBg: { backgroundColor: colors.buttonBg },
      loadingText: { color: colors.textSecondary },
      errorText: { color: colors.arrowError },
      retryText: { color: colors.accent },
      overlayBg: { backgroundColor: colors.overlayBg },
      overlayCard: { backgroundColor: colors.overlayCard },
      overlayTitle: { color: colors.textPrimary },
      overlaySubtitle: { color: colors.textSecondary },
      nextButton: { backgroundColor: colors.accent },
      nextButtonText: { color: '#FFFFFF' },
      difficultyText: { color: colors.difficultyLabel },
      progressBarTrack: { backgroundColor: colors.progressBarTrack },
      progressBarFill: { backgroundColor: colors.progressBar },
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
      {/* Header */}
      <View style={[styles.headerBand, dynamicStyles.headerBand]}>
        <View style={styles.topBar}>
          {/* Left: back + undo buttons */}
          <View style={styles.leftButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.circleButton,
                dynamicStyles.buttonBg,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <ChevronLeftIcon size={20} color={colors.buttonIcon} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.circleButton,
                dynamicStyles.buttonBg,
                !canUndo && styles.disabled,
                pressed && canUndo && styles.buttonPressed,
              ]}
              onPress={handleUndo}
              disabled={!canUndo}
            >
              <UndoIcon size={20} color={colors.buttonIcon} />
            </Pressable>
          </View>

          {/* Center: difficulty + hearts */}
          <View style={styles.centerInfo}>
            {level?.difficulty && (
              <Text style={[styles.difficultyText, dynamicStyles.difficultyText]}>
                {DIFFICULTY_LABELS[level.difficulty]}
              </Text>
            )}
            <Hearts remaining={heartsRemaining} colors={colors} />
          </View>

          {/* Right: hint button */}
          <View style={styles.rightButtons}>
            {showHintFab && status === 'playing' ? (
              <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.circleButton,
                    dynamicStyles.buttonBg,
                    hasActiveAnimations && styles.disabled,
                    pressed && !hasActiveAnimations && styles.buttonPressed,
                  ]}
                  onPress={triggerHint}
                  disabled={hasActiveAnimations}
                >
                  <LightbulbIcon size={20} color={colors.buttonIcon} />
                </Pressable>
              </Animated.View>
            ) : (
              <View style={styles.circleButton} />
            )}
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarTrack, dynamicStyles.progressBarTrack]}>
          <Animated.View
            style={[styles.progressBarFill, dynamicStyles.progressBarFill, progressAnimatedStyle]}
          />
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
              previewArrowId={previewArrowId}
              canvasWidth={canvasWidth}
              cellSize={cellSize}
              offsetX={offsetX}
              colors={colors}
              showGridLines={showGridLines}
            />
          </Animated.View>
        </GestureDetector>

        {/* Grid toggle FAB */}
        <View style={styles.gridFab}>
          <Pressable
            style={({ pressed }) => [
              styles.gridFabButton,
              dynamicStyles.buttonBg,
              pressed && styles.buttonPressed,
            ]}
            onPress={toggleGridLines}
          >
            <GridIcon size={22} color={colors.buttonIcon} />
          </Pressable>
        </View>
      </View>

      {/* Win overlay */}
      {status === 'won' && (
        <CelebrationOverlay
          moveCount={moveHistory.length}
          isPerfect={heartsRemaining === 3}
          nextLevelNumber={levelNumber + 1}
          nextDifficulty={nextLevelDifficulty}
          colors={colors}
          onNextLevel={handleNextLevel}
        />
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
    paddingBottom: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  leftButtons: {
    flexDirection: 'row',
    gap: 10,
    width: 96,
  },
  rightButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 96,
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.4,
  },
  centerInfo: {
    alignItems: 'center',
    gap: 6,
  },
  difficultyText: {
    fontSize: 20,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 2,
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 1,
  },
  progressBarFill: {
    height: 2,
    borderRadius: 1,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridClip: {
    overflow: 'hidden',
  },
  gridFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  gridFabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
