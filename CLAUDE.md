# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Arrout?

Arrout is a puzzle game built with React Native (Expo). Players tap arrows on a grid to slide them off the board in the correct order. Arrows move like snakes — the head advances and the body follows. The challenge is figuring out which arrow to move first, since arrows block each other.

## Commands

```bash
bun install              # install dependencies
expo start               # start dev server (press i/a/w for platform)
expo start --ios         # iOS simulator
expo start --android     # Android emulator
expo start --web         # web browser

bun test                 # run all tests
bun test --watch         # watch mode
bun test src/engine      # run engine tests only
bun test src/generator   # run generator tests only

biome check .            # lint
biome check --write .    # lint + autofix
biome format --write .   # format
tsc --noEmit             # typecheck
```

## Architecture

### Layered design with strict dependency direction

```tree
app/ (screens, routing)
  └── src/components/  (React Native + Skia UI)
        └── src/hooks/       (bridge between store and UI)
              └── src/store/       (Zustand state management)
                    └── src/engine/      (pure TS game logic)
                          src/generator/   (pure TS level generation)
```

**Critical constraint:** `engine/` and `generator/` have zero React/RN imports. They are pure TypeScript modules testable with `bun test` alone.

### Engine (`src/engine/`)

Pure game logic. All functions are immutable — they return new `GridState` objects, never mutate.

- **types.ts** — Core types: `GridState`, `Arrow`, `GridCell`, `CellContent` (empty/head/straight/curve), `Direction`, `MoveResult`
- **grid.ts** — Grid creation, cell accessors, immutable cell/arrow placement and removal
- **arrow.ts** — Arrow construction, head/tail accessors, segment connectivity checks
- **move.ts** — `canMove()` validates full path to board edge; `executeMoveSteps()` returns per-step grid states for animation; `stepSnakeForward()` implements the snake mechanic (head advances, body follows, tail drops)
- **moveSteps.ts** — `extractStepPositions()` computes per-cell positions including off-board positions for smooth exit animation
- **solver.ts** — BFS solver that finds a move sequence to clear all arrows; used for hint system and generator validation
- **validator.ts** — Structural validation, facing-heads deadlock detection, circular dependency detection via DFS

### Generator (`src/generator/`)

Procedural level generation using reverse construction. Deterministic: same seed + difficulty = same level.

- **reverse-builder.ts** — Core algorithm: places arrows one-by-one on an empty grid, verifying each entry trajectory is clear and no deadlocks are created. Placement order reversed = solution
- **shape-generator.ts** — Random walk to create arrow body shapes (straight + curves)
- **entry-trajectory.ts** — Simulates reverse snake entry to verify placement validity
- **dependency-graph.ts** — Builds blocker graph, detects cycles, computes freedom score
- **difficulty.ts** — `GeneratorConfig` per difficulty (grid size, arrow count, curve probability, freedom cap)
- **prng.ts** — Mulberry32 seedable PRNG with convenience methods (nextInt, pick, shuffle)

### State Management (`src/store/`)

Three Zustand stores:

- **game.store.ts** — Active puzzle session. Manages grid state, move history (for undo), hearts, animation entries (concurrent per-arrow), `projectedGridState` (optimistic state for allowing concurrent moves). Resets on each level load.
- **progress.store.ts** — Persisted via AsyncStorage. Tracks completed/perfect levels, streaks, daily challenges, award tiers.
- **settings.store.ts** — Persisted. Sound, haptics, theme (dark only currently).

### Animation System

Two-phase animation: the store computes the move outcome immediately (updating `projectedGridState`), while the visual animation plays asynchronously.

- `useArrowAnimation` hook drives Reanimated shared values for each arrow
- Valid moves: snake-style animation using `extractStepPositions()` — progress shared value interpolates between step positions on the UI thread
- Invalid moves: slide-to-blocker-and-back bounce using `withSequence`
- `ArrowPath` component rebuilds Skia paths each frame via `useDerivedValue` worklets during snake animation

### Rendering

- Grid rendered as a single Skia `<Canvas>` (not per-cell Views) — critical for performance on 18x18 grids
- `GridOverlay` is a transparent `Pressable` covering the canvas for touch detection
- Layout sizing computed in `game.tsx` and passed as props; canvas doesn't self-size

### Navigation

Expo Router with file-based routing:

- `app/(tabs)/` — Home, Challenge, Collection, Settings tabs
- `app/game.tsx` — Full-screen modal pushed over tabs. Receives `level` param.

## Path Aliases

Defined in `tsconfig.json`:

```tree
@components/* → src/components/*
@engine/*     → src/engine/*
@generator/*  → src/generator/*
@store/*      → src/store/*
@hooks/*      → src/hooks/*
@levels/*     → src/levels/*
@persistence/* → src/persistence/*
```

## Code Style

- Biome for linting and formatting (single quotes, no semicolons, 2-space indent, 100 char line width)
- All engine/generator types use `readonly` properties
- Immutable patterns throughout — never mutate state objects
- Tests co-located in `__tests__/` directories next to source files
- Debug logging gated behind `__DEV__` using `console.debug` with `[module:tag]` prefix
