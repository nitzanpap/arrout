import { useCallback } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import type { GridState } from '../../engine/types'

interface GridOverlayProps {
  readonly gridState: GridState
  readonly cellSize: number
  readonly offsetX: number
  readonly onArrowTap: (arrowId: string) => void
}

export function GridOverlay({ gridState, cellSize, offsetX, onArrowTap }: GridOverlayProps) {
  const handlePress = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = event.nativeEvent
      const col = Math.floor((locationX - offsetX) / cellSize)
      const row = Math.floor(locationY / cellSize)

      if (row < 0 || row >= gridState.height || col < 0 || col >= gridState.width) return

      const cell = gridState.cells[row][col]
      if (cell.arrowId) {
        onArrowTap(cell.arrowId)
      }
    },
    [gridState, cellSize, offsetX, onArrowTap]
  )

  return <Pressable style={styles.overlay} onPress={handlePress} />
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
})
