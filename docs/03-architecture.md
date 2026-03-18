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
| Animation | State-driven (setTimeout + Zustand) | Step-by-step grid state updates with expo-haptics feedback |
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
│   ├── useAnimationPlayer.ts # Drives step-by-step animation playback from store queue
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

export interface MoveStepsResult {
  readonly success: boolean
  readonly steps: readonly GridState[]   // each intermediate snake position
  readonly heartLost: boolean
  readonly arrowId: string
}
```

### 3.2 Move Execution (`engine/move.ts`)

The snake mechanic is the most important and subtle piece of the engine. The module includes debug logging gated behind `__DEV__` for runtime diagnostics.

```typescript
// Full-path validation — checks every cell from head to board edge
export function canMove(arrowId: string, grid: GridState): boolean {
  const arrow = getArrow(grid, arrowId)
  const head = arrow.cells[0]
  const direction = getHeadDirection(arrow)
  const arrowCellKeys = new Set(arrow.cells.map(c => `${c.row},${c.col}`))

  let pos = head + delta(direction)
  while (isInBounds(grid, pos)) {
    if (!arrowCellKeys.has(posKey) && cell is not empty)
      return false   // blocked by another arrow
    pos = pos + delta(direction)
  }
  return true
}

// Returns intermediate grid states for each step (used by animation system)
export function executeMoveSteps(arrowId: string, state: GridState): MoveStepsResult {
  if (!canMove(arrowId, state))
    return { success: false, steps: [state], heartLost: true, arrowId }

  const steps: GridState[] = []
  // Step the snake forward, collecting each intermediate state
  while (arrow still on board) {
    current = stepSnakeForward(arrow, direction, current)
    steps.push(current)
  }
  return { success: true, steps, heartLost: false, arrowId }
}

// Convenience wrapper — returns final state only
export function executeMove(arrowId: string, state: GridState): MoveResult {
  const result = executeMoveSteps(arrowId, state)
  return { success, nextState: lastStep, arrowRemoved: success, heartLost }
}

function stepSnakeForward(arrow: Arrow, direction: Direction, state: GridState): GridState {
  // 1. Remove arrow from grid
  // 2. Head advances one cell in direction
  // 3. Each body segment moves to where the segment ahead was
  // 4. Filter to on-board cells only (head/body may exit)
  // 5. Place updated arrow back on grid (or remove if fully exited)
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
  level: Level | null
  gridState: GridState | null
  initialGridState: GridState | null
  moveHistory: readonly GridState[]        // stack for undo
  heartsRemaining: number
  hintsUsed: number
  status: 'idle' | 'playing' | 'won' | 'failed'
  selectedArrowId: string | null
  solution: readonly string[]

  // Animation
  animationSteps: readonly GridState[]     // queued intermediate states for playback
  isAnimating: boolean                     // blocks input during animation
  animationType: 'valid' | 'invalid' | null
  animatingArrowId: string | null
  preAnimationState: GridState | null      // state before animation started
  errorArrowIds: readonly string[]         // arrows colored red after invalid move

  // Actions
  loadLevel: (level: Level) => void
  selectArrow: (arrowId: string | null) => void
  makeMove: (arrowId: string) => void
  advanceAnimation: () => void             // plays next animation step
  completeAnimation: () => void            // jumps to final state
  undo: () => void
  restart: () => void
  useHint: () => string | null
}
```

Key behaviors:

- `makeMove` calls `executeMoveSteps` — if valid, queues animation steps and sets `isAnimating: true`; if invalid, queues a single bounce-back step
- `advanceAnimation` pops the next step from the queue and sets it as `gridState`. On the final step: if valid, adds to `moveHistory` and checks win; if invalid, decrements hearts and adds arrow to `errorArrowIds`
- The `useAnimationPlayer` hook drives `advanceAnimation` on a timer (60–300ms per step) with haptic feedback
- `undo` and `restart` are blocked while `isAnimating` is true
- `errorArrowIds` tracks arrows that should render red — cleared when the arrow's next move succeeds
- Debug logging (gated behind `__DEV__`) traces `makeMove`, `advanceAnimation`, and animation completion

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

The canvas and touch overlay are wrapped in a fixed-size `View` container (`width: canvasWidth, height: gridHeight`) that is centered in the screen via `alignItems: 'center'` + `justifyContent: 'center'`. Layout dimensions (`canvasWidth`, `cellSize`, `offsetX`) are computed in `game.tsx` and passed as props — the canvas does not compute its own sizing.

```tsx
// GridCanvas.tsx — accepts layout props and error state
export function GridCanvas({
  gridState, selectedArrowId, errorArrowIds,
  canvasWidth, cellSize, offsetX,
}: GridCanvasProps) {
  return (
    <Canvas style={{ width: canvasWidth, height: gridHeight }}>
      <GridLines ... />
      {gridState.arrows.map(arrow => (
        <ArrowPath
          key={arrow.id}
          arrow={arrow}
          cellSize={cellSize}
          offsetX={offsetX}
          offsetY={0}
          isSelected={arrow.id === selectedArrowId}
          isError={errorArrowIds.includes(arrow.id)}
        />
      ))}
    </Canvas>
  )
}
```

`ArrowPath` accepts an `isError` prop — when true, overrides the arrow color with `#FF4A6A` (danger red).

### 9.2 Animation System

Animation is **state-driven**, not visual-only. When `makeMove` is called, the store queues intermediate `GridState` snapshots (from `executeMoveSteps`) rather than applying the final state instantly. A `useAnimationPlayer` hook drives playback:

```typescript
// useAnimationPlayer.ts (~40 lines)
export function useAnimationPlayer() {
  const isAnimating = useGameStore(s => s.isAnimating)
  const stepsCount = useGameStore(s => s.animationSteps.length)
  const advanceAnimation = useGameStore(s => s.advanceAnimation)

  useEffect(() => {
    if (!isAnimating || stepsCount === 0) return
    const stepMs = Math.max(60, Math.floor(300 / stepsCount))
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      advanceAnimation()
    }, stepMs)
    return () => clearTimeout(timer)
  }, [isAnimating, stepsCount, advanceAnimation])
}
```

Each `advanceAnimation()` call pops the next step, sets it as `gridState`, and re-renders. On the final step, the store finalizes the move (update history, check win/fail, update hearts, set error state). This approach keeps animation and game logic unified — no separate visual state to reconcile.

### 9.3 Touch Handling

Touch is handled by a `Pressable` overlay (`GridOverlay`) that covers the canvas using `StyleSheet.absoluteFillObject`. A single tap triggers a move immediately — **no selection step, no swipe detection**.

```typescript
// GridOverlay.tsx
function handlePress(event) {
  const { locationX, locationY } = event.nativeEvent
  const col = Math.floor((locationX - offsetX) / cellSize)
  const row = Math.floor(locationY / cellSize)
  const cell = gridState.cells[row][col]
  if (cell.arrowId) onArrowTap(cell.arrowId)
}

// game.tsx
const handleArrowTap = (arrowId: string) => {
  if (status !== 'playing' || isAnimating) return
  makeMove(arrowId)
}
```

Taps are ignored while `isAnimating` is true, preventing input during animation playback.

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
- Arrow blocked by another arrow's body anywhere along its full exit path
- Full-path validation — `canMove` checks every cell to the board edge, not just one cell ahead
- `executeMoveSteps` returns correct intermediate states for animation
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
