export function migrateProgress(persistedState: unknown, version: number): unknown {
  if (version === 0) {
    return {
      ...(persistedState as Record<string, unknown>),
      dailyChallenges: {},
    }
  }
  return persistedState
}

export function migrateSettings(persistedState: unknown, _version: number): unknown {
  return persistedState
}
