import { useEffect, useState } from 'react'
import { getLevel } from '../levels'
import { useGameStore } from '../store/game.store'

interface LevelLoaderResult {
  readonly isLoading: boolean
  readonly error: string | null
}

export function useLevelLoader(levelNumber: number): LevelLoaderResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadLevel = useGameStore((s) => s.loadLevel)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    try {
      const level = getLevel(levelNumber)
      loadLevel(level)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load level')
      setIsLoading(false)
    }
  }, [levelNumber, loadLevel])

  return { isLoading, error }
}
