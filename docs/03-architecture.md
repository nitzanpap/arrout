# Arrout – Architecture & Implementation
## Design Document · v1.0

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Project Structure](#2-project-structure)
3. [Engine Layer](#3-engine-layer)
4. [Generator Layer](#4-generator-layer)
5. [State Management](#5-state-management)
6. [Persistence Layer](#6-persistence-layer)
7. [Level Resolution](#7-level-resolution)
8. [Navigation & Screens](#8-navigation--screens)
9. [Rendering & Animation](#9-rendering--animation)
10. [Testing Strategy](#10-testing-strategy)

---

## 1. Technology Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React Native (Expo SDK 52) | Single codebase for Android, iOS, web |
| Web target | React Native Web | Shares all logic and components with mobile |
| Language | TypeScript (strict) | Type safety across engine, generator, UI |
| Runtime | Bun | Fast installs, built-in test runner, TypeScript-native |
| State management | Zustand | Minimal boilerplate, easy persistence middleware |
| Persistence | AsyncStorage + Zustand persist | Built-in, no server required |
| Navigation | Expo Router | File-based routing; wraps React Navigation under the hood |
| Animation | Reanimated 3 | Native-thread animations for smooth 60fps |
| Canvas / rendering | React Native Skia | Hardware-accelerated 2D for the grid canvas |
| Linting & formatting | Biome | Single fast tool replacing ESLint + Prettier |
| Testing | Bun test + React Native Testing Library | Built-in test runner for engine; RNTL for components |
| PRNG | mulberry32 | Lightweight seedable PRNG for deterministic generation |

### Why Skia for Rendering

The puzzle grid is a custom drawn canvas — not a list of View components. Each arrow segment needs to be drawn as a path (lines, curves, arrowheads) and animated along its snake trajectory. React Native Skia gives us a hardware-accelerated canvas with a React-friendly API, and it runs on Android, iOS, and web.

---

## 2. Project Structure

```
src/
├── engine/                   # Pure TypeScript — zero UI/RN dependencies
│   ├── types.ts              # All shared types and interfaces
│   ├── grid.ts               # Grid creation and cell accessors
│   ├── arrow.ts              # Arrow construction and segment logic
│   ├── move.ts               # Move validation and execution (snake logic)
│   ├── solver.ts             # BFS solver for validation
│   └── validator.ts          # Full structural + deadlock validation checks
│
├── generator/                # Pure TypeScript — depends only on engine/types
│   ├── index.ts              # Public API: generateLevel(seed, difficulty)
│   ├── reverse-builder.ts    # Core reverse construction loop
│   ├── shape-generator.ts    # Random walk body generation
│   ├── entry-trajectory.ts   # Entry path simulation for reverse placement
│   ├── dependency-graph.ts   # Build graph, detect cycles, compute freedom score
│   └── difficulty.ts         # Difficulty configs and tuning constants
│
├── levels/
│   ├── static/               # Handcrafted JSON levels 1–50
│   │   ├── 001.json
│   │   └── ...
│   └── index.ts              # getLevel(n): static for ≤50, generated for >50
│
├── store/
│   ├── game.store.ts         # Active puzzle session state
│   ├── progress.store.ts     # Player progress, streaks, awards (persisted)
│   └── settings.store.ts     # Audio, haptics, theme (persisted)
│
├── screens/
│   ├── HomeScreen.tsx
│   ├── GameScreen.tsx
│   ├── CollectionScreen.tsx
│   ├── ChallengeScreen.tsx
│   └── SettingsScreen.tsx
│
├── components/
│   ├── Grid/
│   │   ├── GridCanvas.tsx    # Skia canvas — draws all cells and arrows
│   │   ├── ArrowPath.tsx     # Draws a single arrow as a Skia path
│   │   └── GridOverlay.tsx   # Touch handling layer over the canvas
│   ├── HUD/
│   │   ├── Hearts.tsx
│   │   ├── HintButton.tsx
│   │   └── MoveCounter.tsx
│   └── ui/                   # Generic reusable components
│
├── hooks/
│   ├── useGameGestures.ts    # Pan gesture → arrow selection + move trigger
│   ├── useArrowAnimation.ts  # Drives the snake animation for a moving arrow
│   └── useLevelLoader.ts     # Loads/generates level, initializes game store
│
└── persistence/
    ├── storage.ts            # AsyncStorage wrapper (typed get/set/clear)
    └── migrations.ts         # Versioned schema migrations
```

### Key Architectural Constraint

**`engine/` and `generator/` must have zero imports from React, React Native, or any UI library.** They are pure TypeScript modules. This means:

- They can be unit tested with Bun's built-in test runner with no RN setup
- The algorithm can be developed and verified independently of the app
- They could be extracted to a shared package if a backend generator is ever needed

---

## 3. Engine Layer

### 3.1 Core Types (`engine/types.ts`)

```typescript
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Axis = 'H' | 'V'
export type CurveType = 'NE' | 'NW' | 'SE' | 'SW'

export type CellContent =
  | { type: 'empty' }
  | { type: 'head';     direction: Direction }
  | { type: 'straight'; axis: Axis }
  | { type: 'curve';    curve: CurveType }

export interface GridCell {
  x: number
  y: number
  content: CellContent
  arrowId: string | null
}

export interface Arrow {
  id: string
  cells: GridCell[]   // ordered: [head, ...body segments, tail]
}

export interface GridState {
  width: number
  height: number
  cells: GridCell[][]
  arrows: Arrow[]
}

export interface MoveResult {
  success: boolean
  nextState: GridState
  arrowRemoved: boolean
  heartLost: boolean
}
```

### 3.2 Move Execution (`engine/move.ts`)

The snake mechanic is the most important and subtle piece of the engine.

```typescript
export function canMove(arrow: Arrow, grid: GridState): boolean {
  const head = arrow.cells[0]
  const ahead = cellAhead(head, grid)
  return ahead === null || ahead.content.type === 'empty'
  // null = board edge = valid (arrow will exit)
}

export function executeMove(arrow: Arrow, state: GridState): GridState {
  // Returns new immutable state — never mutates
  let current = state

  // Step the snake forward until the tail exits the board
  while (arrowStillOnBoard(arrow, current)) {
    current = stepSnakeForward(arrow.id, current)
  }

  // Remove arrow from state
  return removeArrow(arrow.id, current)
}

function stepSnakeForward(arrowId: string, state: GridState): GridState {
  const arrow = getArrow(arrowId, state)
  const head = arrow.cells[0]
  const nextHeadPos = positionAhead(head)

  // Build new cell list: new head pos + each segment moves into prev segment's pos
  const newCells = [
    { ...head, x: nextHeadPos.x, y: nextHeadPos.y },
    ...arrow.cells.slice(0, -1).map((cell, i) => ({
      ...cell,
      x: arrow.cells[i].x,      // each segment takes prev segment's position
      y: arrow.cells[i].y,
    }))
    // tail segment (last cell) is dropped — it has moved off where it was
  ]

  return updateArrowCells(arrowId, newCells, state)
}
```

### 3.3 Immutability

All engine functions return new `GridState` objects. The state is never mutated in place. This makes:

- Undo trivial (keep a stack of previous states)
- Testing straightforward (pure functions)
- The Zustand store simple (replace state wholesale)

---

## 4. Generator Layer

### 4.1 Public API (`generator/index.ts`)

```typescript
export interface GeneratorConfig {
  width: number
  height: number
  targetArrowCount: number
  minArrowLength: number
  maxArrowLength: number
  targetMaxFreedom: number      // difficulty lever: max simultaneous free arrows
  curveProbability: number      // 0–1: how often to introduce a curve in a body
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, GeneratorConfig> = {
  easy:       { width: 6,  height: 6,  targetArrowCount: 6,  minArrowLength: 2, maxArrowLength: 4,  targetMaxFreedom: 4, curveProbability: 0.2 },
  medium:     { width: 9,  height: 9,  targetArrowCount: 12, minArrowLength: 2, maxArrowLength: 7,  targetMaxFreedom: 3, curveProbability: 0.4 },
  hard:       { width: 13, height: 13, targetArrowCount: 20, minArrowLength: 3, maxArrowLength: 10, targetMaxFreedom: 2, curveProbability: 0.6 },
  superHard:  { width: 18, height: 18, targetArrowCount: 40, minArrowLength: 4, maxArrowLength: 15, targetMaxFreedom: 1, curveProbability: 0.7 },
}

export function generateLevel(seed: number, difficulty: Difficulty): Level {
  const rng = mulberry32(seed)
  const config = DIFFICULTY_CONFIGS[difficulty]
  return runReverseBuilder(config, rng)
}
```

### 4.2 Entry Trajectory (`generator/entry-trajectory.ts`)

The trickiest part of reverse placement — simulating the reverse snake entry to find all cells the arrow will pass through as it enters the board:

```typescript
export function computeEntryTrajectory(arrow: Arrow, grid: GridState): GridCell[][] {
  // Start from arrow's resting position
  // Simulate moving it BACKWARDS (opposite of its direction) until it is fully outside the board
  // Each intermediate position is a "frame" — a set of cells the arrow occupies at that moment
  // All cells across all frames (except the final resting position) must be empty in the current grid

  const frames: GridCell[][] = []
  let currentCells = arrow.cells

  while (anyPartOnBoard(currentCells, grid)) {
    currentCells = stepSnakeBackward(currentCells, arrow)
    frames.push(currentCells)
  }

  return frames
}

export function entryPathIsClear(arrow: Arrow, grid: GridState): boolean {
  const trajectory = computeEntryTrajectory(arrow, grid)
  for (const frame of trajectory) {
    for (const cell of frame) {
      if (!inBounds(cell, grid)) continue
      if (grid.cells[cell.y][cell.x].content.type !== 'empty') return false
    }
  }
  return true
}
```

---

## 5. State Management

### 5.1 Game Store (`store/game.store.ts`)

Manages the active puzzle session. Resets entirely when a new level loads.

```typescript
interface GameState {
  // Data
  level: Level
  gridState: GridState
  moveHistory: GridState[]        // stack for undo
  heartsRemaining: number
  hintsUsed: number
  status: 'idle' | 'playing' | 'won' | 'failed'
  selectedArrowId: string | null

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
  undo: () => void
  restart: () => void
  useHint: () => string | null     // returns arrowId to highlight, or null
}
```

Key behaviors:

- `makeMove` calls `canMove` — if false, decrements hearts and emits a blocked event for the animation system
- `makeMove` calls `executeMove` — pushes current state to `moveHistory` before applying
- `undo` pops `moveHistory` and restores previous `gridState`
- When `status` becomes `'won'`, the store emits a win event and updates `progress.store`

### 5.2 Progress Store (`store/progress.store.ts`)

Fully persisted via Zustand `persist` middleware. Survives app restarts.

```typescript
interface ProgressState {
  currentLevel: number
  completedLevels: number[]
  perfectLevels: number[]           // completed with 3 hearts intact
  hintsAvailable: number
  streak: number
  lastPlayedDate: string            // ISO date string
  highestWinStreak: number
  currentWinStreak: number
  dailyChallenges: Record<string, 'completed' | 'failed' | 'skipped'>

  // Award tier progress (0–10 each)
  levelLegendTier: number
  perfectPlayTier: number
  unstoppableTier: number

  // Actions
  recordLevelComplete: (levelId: number, perfect: boolean) => void
  recordDailyChallenge: (date: string, status: 'completed' | 'failed') => void
  consumeHint: () => boolean
  addHints: (count: number) => void
}
```

### 5.3 Settings Store (`store/settings.store.ts`)

```typescript
interface SettingsState {
  soundEnabled: boolean
  hapticsEnabled: boolean
  theme: 'dark'                     // dark only for now
  toggleSound: () => void
  toggleHaptics: () => void
}
```

---

## 6. Persistence Layer

### 6.1 Zustand Persist Middleware

Progress and settings stores use Zustand's built-in `persist` middleware with AsyncStorage:

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/community-async-storage'

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({ /* state and actions */ }),
    {
      name: 'arrows-progress',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: migrateProgress,     // see migrations.ts
    }
  )
)
```

### 6.2 Migrations (`persistence/migrations.ts`)

When the data schema changes between app versions, existing users must not lose data:

```typescript
export function migrateProgress(persistedState: unknown, version: number) {
  if (version === 0) {
    // v0 → v1: added dailyChallenges field
    return {
      ...(persistedState as any),
      dailyChallenges: {},
    }
  }
  return persistedState
}
```

Each breaking schema change increments the version number and adds a migration function.

---

## 7. Level Resolution

The single public interface the rest of the app uses to get a level:

```typescript
// src/levels/index.ts

import staticLevels from './static'
import { generateLevel } from '../generator'
import { difficultyForLevel } from './difficulty-curve'

export function getLevel(levelNumber: number): Level {
  if (levelNumber <= 50) {
    return staticLevels[levelNumber]
  }
  return generateLevel(levelNumber, difficultyForLevel(levelNumber))
}

function difficultyForLevel(n: number): Difficulty {
  if (n <= 50)  return 'easy'
  if (n <= 100) return 'medium'
  if (n <= 150) return 'hard'
  return 'superHard'
}
```

**Pre-generation:** While the player is on the level complete screen or home screen, the app pre-generates and caches the next 3 levels in a background task. This eliminates any perceived loading delay.

---

## 8. Navigation & Screens

### 8.1 Navigator Structure

Uses **Expo Router** (file-based routing). The `app/` directory defines the route tree:

```
app/
  _layout.tsx          # root layout — wraps everything in tab navigator
  index.tsx            # Home tab
  challenge.tsx        # Challenge tab
  collection.tsx       # Collection tab
  settings.tsx         # Settings tab
  game.tsx             # Game screen — pushed modally over tabs (no tab bar)
```

The game screen is a modal route pushed on top of the tab navigator, keeping the tab bar hidden during gameplay without destroying tab state.

### 8.2 Screen Responsibilities

**HomeScreen** — reads `currentLevel` and `streak` from progress store. Tapping Play pushes GameScreen and calls `loadLevel(getLevel(currentLevel))`.

**GameScreen** — pure consumer of `game.store`. Renders `<GridCanvas>` and `<HUD>`. Handles level complete / game over transitions.

**CollectionScreen** — reads from `progress.store` only. Displays stats, award tiers, and monthly trophy calendar. No game logic.

**ChallengeScreen** — determines today's challenge level (using today's date as seed), checks if already completed in `progress.store`, and either launches it or shows completion state.

---

## 9. Rendering & Animation

### 9.1 Grid Canvas

The puzzle grid is rendered as a single `<Canvas>` (React Native Skia). No individual View components per cell — this is critical for performance on large Super Hard grids (18×18 = 324 cells).

```tsx
// GridCanvas.tsx
export function GridCanvas({ gridState, animatingArrows }: Props) {
  const { width, height } = useGridDimensions(gridState)

  return (
    <Canvas style={{ width, height }}>
      {/* Draw empty grid lines (optional, subtle) */}
      <GridLines gridState={gridState} />

      {/* Draw each arrow as a Skia path */}
      {gridState.arrows.map(arrow => (
        <ArrowPath
          key={arrow.id}
          arrow={arrow}
          animState={animatingArrows[arrow.id]}
        />
      ))}
    </Canvas>
  )
}
```

### 9.2 Arrow Animation

When `makeMove` is called, the game store applies the final state immediately (for logic), and a parallel animation plays the snake movement visually using Reanimated shared values:

```typescript
// useArrowAnimation.ts
export function useArrowAnimation(arrow: Arrow, onComplete: () => void) {
  const progress = useSharedValue(0)

  const startAnimation = () => {
    progress.value = withTiming(1, {
      duration: STEP_DURATION_MS * arrow.cells.length,
      easing: Easing.linear,
    }, onComplete)
  }

  // Derived animated path: interpolates arrow cell positions
  // from start positions to exit positions based on progress value
  const animatedPath = useDerivedValue(() => {
    return interpolateArrowPath(arrow, progress.value)
  })

  return { animatedPath, startAnimation }
}
```

The animation is purely visual — the game logic state has already been updated. If the animation is interrupted (player taps another arrow), the visual snaps to the logical state.

### 9.3 Touch Handling

Touch is handled by a transparent overlay above the canvas. A pan gesture recognizer detects:

1. **Tap** — identify which arrow was tapped (hit test against arrow cell bounds), select it
2. **Swipe** — if a selected arrow exists and swipe direction matches the arrow's direction, trigger `makeMove`

```typescript
// useGameGestures.ts
export function useGameGestures(gridState: GridState, onMove: (id: string) => void) {
  const gesture = Gesture.Pan()
    .onStart(e => {
      const arrow = hitTestArrow(e.x, e.y, gridState)
      if (arrow) selectArrow(arrow.id)
    })
    .onEnd(e => {
      const selected = useGameStore.getState().selectedArrowId
      if (!selected) return
      const direction = swipeDirection(e.velocityX, e.velocityY)
      const arrow = getArrow(selected, gridState)
      if (direction === arrow.direction) onMove(selected)
    })

  return gesture
}
```

---

## 10. Testing Strategy

### 10.1 Engine Unit Tests

The engine is pure TypeScript — tested with Bun's built-in test runner, no React or RN setup needed.

```
tests/engine/
  move.test.ts          — canMove, executeMove, snake step logic
  validator.test.ts     — structural checks, facing-heads detection, cycle detection
  solver.test.ts        — BFS solver finds solution / correctly identifies unsolvable
```

Run with:
```bash
bun test tests/engine
```

Key test cases:
- Arrow exits cleanly with no obstacles
- Arrow blocked by another arrow's body
- Arrow blocked mid-snake-path (head reaches obstacle during multi-step exit)
- Facing heads detected correctly
- Circular dependency detected (A→B→C→A)
- Solver finds solution for known handcrafted levels

### 10.2 Generator Tests

```
tests/generator/
  reverse-builder.test.ts   — output is always solvable (run solver on output)
  shape-generator.test.ts   — no invalid segments, correct connectivity
  entry-trajectory.test.ts  — trajectory cells are correct for known arrow shapes
  difficulty.test.ts        — freedom scores match target difficulty
```

Run with:
```bash
bun test tests/generator
```

The most important generator test: **for N random seeds × all difficulty levels, the BFS solver must confirm the output is solvable.** This is the ground-truth correctness test.

### 10.3 Store Tests

Zustand stores tested with `@testing-library/react-hooks`:

- `makeMove` with a valid move → state updates, moveHistory grows
- `makeMove` with an invalid move → hearts decrement, state unchanged
- `undo` → restores previous state from moveHistory
- `restart` → resets to initial level state, clears moveHistory
- `recordLevelComplete` → increments currentLevel, updates streak correctly

### 10.4 Integration / E2E

Light E2E tests using Detox (mobile) or Playwright (web) covering the critical path:

- App opens → home screen shows current level
- Tap Play → game screen loads
- Complete a level → advances to next level automatically
- Daily challenge appears and can be completed

---

*Arrout – Architecture & Implementation Design Doc v1.0 · March 2026*
