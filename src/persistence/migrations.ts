export function migrateProgress(persistedState: unknown, version: number): unknown {
  if (version === 0) {
    return {
      ...(persistedState as Record<string, unknown>),
      dailyChallenges: {},
    }
  }
  return persistedState
}

export function migrateSettings(persistedState: unknown, version: number): unknown {
  if (version === 1) {
    return {
      ...(persistedState as Record<string, unknown>),
      theme: 'system',
    }
  }
  return persistedState
}
