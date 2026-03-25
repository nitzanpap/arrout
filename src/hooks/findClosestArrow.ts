import type { GridState } from '../engine/types'

/** Ratio of cellSize used as the hit detection radius. */
export const HIT_RADIUS_RATIO = 0.8

/**
 * Find the closest arrow within a hit radius of the given tap coordinates.
 *
 * Searches a 3×3 neighborhood of cells around the tap point. For each cell
 * containing an arrow, computes the Euclidean distance from the tap to the
 * cell center. Returns the arrowId of the closest cell within the hit radius,
 * or null if none is close enough.
 */
export function findClosestArrow(
  x: number,
  y: number,
  gridState: GridState,
  cellSize: number,
  offsetX: number,
  offsetY: number
): string | null {
  if (cellSize === 0) return null

  const hitRadius = cellSize * HIT_RADIUS_RATIO
  const hitRadiusSq = hitRadius * hitRadius

  const centerCol = Math.floor((x - offsetX) / cellSize)
  const centerRow = Math.floor((y - offsetY) / cellSize)

  let closestId: string | null = null
  let closestDistSq = hitRadiusSq + 1

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = centerRow + dr
      const c = centerCol + dc
      if (r < 0 || r >= gridState.height || c < 0 || c >= gridState.width) continue

      const arrowId = gridState.cells[r][c].arrowId
      if (!arrowId) continue

      const cellCenterX = offsetX + c * cellSize + cellSize / 2
      const cellCenterY = offsetY + r * cellSize + cellSize / 2
      const dx = x - cellCenterX
      const dy = y - cellCenterY
      const distSq = dx * dx + dy * dy

      if (distSq <= hitRadiusSq && distSq < closestDistSq) {
        closestDistSq = distSq
        closestId = arrowId
      }
    }
  }

  return closestId
}
