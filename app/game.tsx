import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GridCanvas } from '../src/components/Grid/GridCanvas'
import { GridOverlay } from '../src/components/Grid/GridOverlay'
import { Hearts } from '../src/components/HUD/Hearts'
import { HintButton } from '../src/components/HUD/HintButton'
import { MoveCounter } from '../src/components/HUD/MoveCounter'
import { useLevelLoader } from '../src/hooks/useLevelLoader'
import { useGameStore } from '../src/store/game.store'
import { useProgressStore } from '../src/store/progress.store'

const BG = '#0F1120'
const SURFACE = '#161929'
const TEXT_PRIMARY = '#EEF0FF'
const TEXT_SECONDARY = '#6C7099'
const ACCENT = '#5B5FEF'
const DIFFICULTY_COLOR = '#7B77FF'

export default function GameScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ level: string }>()
  const levelNumber = Number(params.level) || 1

  const { isLoading, error } = useLevelLoader(levelNumber)

  const gridState = useGameStore((s) => s.gridState)
  const heartsRemaining = useGameStore((s) => s.heartsRemaining)
  const status = useGameStore((s) => s.status)
  const selectedArrowId = useGameStore((s) => s.selectedArrowId)
  const moveHistory = useGameStore((s) => s.moveHistory)
  const solution = useGameStore((s) => s.solution)
  const level = useGameStore((s) => s.level)

  const makeMove = useGameStore((s) => s.makeMove)
  const selectArrow = useGameStore((s) => s.selectArrow)
  const undo = useGameStore((s) => s.undo)
  const restart = useGameStore((s) => s.restart)
  const useHint = useGameStore((s) => s.useHint)

  const recordComplete = useProgressStore((s) => s.recordLevelComplete)

  const { width: screenWidth } = useWindowDimensions()
  const padding = 20

  const cellSize = useMemo(() => {
    if (!gridState) return 0
    const available = screenWidth - padding * 2
    const maxW = available / gridState.width
    const maxH = available / gridState.height
    return Math.floor(Math.min(maxW, maxH))
  }, [gridState, screenWidth])

  const offsetX = useMemo(() => {
    if (!gridState) return 0
    const canvasWidth = screenWidth - padding * 2
    return (canvasWidth - cellSize * gridState.width) / 2
  }, [gridState, cellSize, screenWidth])

  const handleArrowTap = useCallback(
    (arrowId: string) => {
      if (status !== 'playing') return

      if (selectedArrowId === arrowId) {
        // Double tap = execute move
        makeMove(arrowId)
      } else {
        selectArrow(arrowId)
      }
    },
    [selectedArrowId, status, makeMove, selectArrow]
  )

  const handleMoveSelected = useCallback(() => {
    if (selectedArrowId && status === 'playing') {
      makeMove(selectedArrowId)
    }
  }, [selectedArrowId, status, makeMove])

  const handleNextLevel = useCallback(() => {
    if (level) {
      const perfect = heartsRemaining === 3
      recordComplete(level.id, perfect)
    }
    router.replace({ pathname: '/game', params: { level: (levelNumber + 1).toString() } })
  }, [level, heartsRemaining, levelNumber, recordComplete, router])

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Generating puzzle...</Text>
      </SafeAreaView>
    )
  }

  if (error || !gridState) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error ?? 'Failed to load level'}</Text>
        <Pressable style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </Pressable>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Level {levelNumber}</Text>
          <Text style={styles.difficultyText}>{level?.difficulty}</Text>
        </View>
        <Hearts remaining={heartsRemaining} />
      </View>

      {/* Game grid */}
      <View style={styles.gridContainer}>
        <GridCanvas gridState={gridState} selectedArrowId={selectedArrowId} padding={padding} />
        <GridOverlay
          gridState={gridState}
          cellSize={cellSize}
          offsetX={offsetX}
          padding={padding}
          onArrowTap={handleArrowTap}
        />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <MoveCounter moves={moveHistory.length} optimal={solution.length} />

        <View style={styles.controls}>
          <Pressable
            style={[styles.controlButton, moveHistory.length === 0 && styles.controlDisabled]}
            onPress={undo}
            disabled={moveHistory.length === 0}
          >
            <Text style={styles.controlText}>{'\u21B6'} Undo</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={restart}>
            <Text style={styles.controlText}>{'\u21BB'} Restart</Text>
          </Pressable>
          <HintButton onPress={useHint} />
        </View>

        {selectedArrowId && status === 'playing' && (
          <Pressable style={styles.moveButton} onPress={handleMoveSelected}>
            <Text style={styles.moveButtonText}>Move Arrow</Text>
          </Pressable>
        )}
      </View>

      {/* Win overlay */}
      {status === 'won' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Level Complete!</Text>
            <Text style={styles.overlaySubtitle}>
              {moveHistory.length} moves {heartsRemaining === 3 ? '(Perfect!)' : ''}
            </Text>
            <Pressable style={styles.nextButton} onPress={handleNextLevel}>
              <Text style={styles.nextButtonText}>Next Level</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Fail overlay */}
      {status === 'failed' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Out of Hearts</Text>
            <Pressable style={styles.nextButton} onPress={restart}>
              <Text style={styles.nextButtonText}>Try Again</Text>
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
    backgroundColor: BG,
  },
  loadingText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#FF4A6A',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  retryButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  retryText: {
    color: ACCENT,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: TEXT_PRIMARY,
    fontSize: 24,
  },
  levelBadge: {
    alignItems: 'center',
  },
  levelText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  difficultyText: {
    color: DIFFICULTY_COLOR,
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  controlDisabled: {
    opacity: 0.4,
  },
  controlText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  moveButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  moveButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 17, 32, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCard: {
    backgroundColor: SURFACE,
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  overlayTitle: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '800',
  },
  overlaySubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  nextButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
})
