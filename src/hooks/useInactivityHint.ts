import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameStatus } from '../store/game.store'

const INACTIVITY_DELAY_MS = 3000
const HINT_GLOW_DURATION_MS = 2000

export function useInactivityHint(
  status: GameStatus,
  triggerStoreHint: () => string | null,
  selectArrow: (arrowId: string | null) => void
) {
  const [showFab, setShowFab] = useState(false)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAllTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
      inactivityTimer.current = null
    }
    if (glowTimer.current) {
      clearTimeout(glowTimer.current)
      glowTimer.current = null
    }
  }, [])

  const startInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    inactivityTimer.current = setTimeout(() => {
      setShowFab(true)
    }, INACTIVITY_DELAY_MS)
  }, [])

  const resetInactivityTimer = useCallback(() => {
    setShowFab(false)
    if (glowTimer.current) {
      clearTimeout(glowTimer.current)
      glowTimer.current = null
    }
    startInactivityTimer()
  }, [startInactivityTimer])

  const triggerHint = useCallback(() => {
    const hintArrowId = triggerStoreHint()
    if (!hintArrowId) return

    setShowFab(false)

    if (glowTimer.current) {
      clearTimeout(glowTimer.current)
    }
    glowTimer.current = setTimeout(() => {
      selectArrow(null)
      startInactivityTimer()
    }, HINT_GLOW_DURATION_MS)
  }, [triggerStoreHint, selectArrow, startInactivityTimer])

  useEffect(() => {
    if (status === 'playing') {
      startInactivityTimer()
    } else {
      setShowFab(false)
      clearAllTimers()
    }
    return clearAllTimers
  }, [status, startInactivityTimer, clearAllTimers])

  return {
    showHintFab: showFab,
    resetInactivityTimer,
    triggerHint,
  }
}
