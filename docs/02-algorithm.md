# Arrout – Puzzle Generation Algorithm
## Design Document · v1.0

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Formal Puzzle Rules](#2-formal-puzzle-rules)
3. [Why Reverse Construction](#3-why-reverse-construction)
4. [Core Algorithm](#4-core-algorithm)
5. [Shape Generation](#5-shape-generation)
6. [Dependency Graph & Difficulty](#6-dependency-graph--difficulty)
7. [Validation Checks](#7-validation-checks)
8. [Seeded Determinism](#8-seeded-determinism)
9. [Edge Cases & Failure Modes](#9-edge-cases--failure-modes)

---

## 1. Overview & Goals

The generation algorithm must produce puzzles that are:

- **Solvable** — a valid solution sequence always exists
- **Deadlock-free** — no unresolvable configurations at any point in the solution
- **Difficulty-tunable** — output can be targeted at Easy / Medium / Hard / Super Hard
- **Deterministic** — the same seed always produces the same puzzle (enables reproducibility and level numbering)
- **Efficient** — must run on-device at runtime without noticeable delay

The algorithm is **not** responsible for aesthetic layout or ensuring a unique solution. Multiple solution paths are explicitly allowed.

---

## 2. Formal Puzzle Rules

These are the ground-truth rules the algorithm must respect and the validator must enforce.

### 2.1 Grid

- A rectangular grid of `W × H` cells
- Not all cells need to be occupied — sparse grids are valid
- The board edge is the exit boundary — arrows exit by sliding off it

### 2.2 Cell Types

```
empty       — no content
head        — arrowhead; has direction UP | DOWN | LEFT | RIGHT; always a straight segment
straight    — body segment connecting two opposite sides (H or V axis)
curve       — body segment connecting two perpendicular sides (NE | NW | SE | SW)
```

### 2.3 Arrow Structure

- An arrow is a connected, ordered path of cells: `[head, ...body]`
- Minimum length: 2 cells (1 head + 1 body)
- No loops, no branches — strictly a simple path
- A curved segment **cannot** be a head
- Each segment must connect to its neighbors through matching open sides

### 2.4 Segment Connectivity

Each cell type has defined **open sides**:

| Segment | Open Sides |
|---|---|
| head UP | top |
| head DOWN | bottom |
| head LEFT | left |
| head RIGHT | right |
| straight H | left, right |
| straight V | top, bottom |
| curve NE | top, right |
| curve NW | top, left |
| curve SE | bottom, right |
| curve SW | bottom, left |

Two adjacent cells are connected if the shared wall appears as an open side in both cells.

### 2.5 Movement — Snake Mechanics

When an arrow moves:

1. The head advances one cell in its direction
2. Each body segment moves into the cell vacated by the segment ahead of it
3. This repeats until the tail exits the board
4. The arrow is removed; all cells it occupied are freed

**An arrow cannot stop mid-path.** A move either completes fully or does not begin.

### 2.6 Valid Move Condition

An arrow may begin moving if and only if the cell immediately ahead of its head is **empty or the board edge**.

### 2.7 Deadlock Rules

**Primary deadlock — facing heads:**
Two arrowheads pointing directly at each other on the same axis constitute an unresolvable deadlock. Neither can ever move first. This applies regardless of what lies between them.

```
→ → [A head]  ·  ·  ·  [B head] ← ←
              ↑         ↑
         A points right  B points left
              — neither can ever move —
```

**Circular dependency deadlock:**
Arrow A is blocked by B's body. B is blocked by C's body. C is blocked by A's body. No arrow can move first. The algorithm must detect and avoid these during construction.

**A head facing a body is NOT a deadlock** — the body's arrow may be moved first to clear the path.

---

## 3. Why Reverse Construction

### The Problem with Forward Construction

Building a puzzle forward (place arrows, check if solvable) has a fundamental flaw: **solvability is a global property**. A placement that looks locally valid can create a deadlock that only manifests several moves deep, inside a circular dependency chain. Detecting this requires running a full solver on every intermediate state — expensive and fragile.

### The Reverse Construction Insight

> A puzzle state is valid if it could have been reached by removing one arrow from a previously valid state.

Working backwards from an empty grid, every state we create is **valid by construction**. We never need to verify solvability — we built it in.

The key equivalence:

```
Forward:   solve puzzle   = remove arrows in order [A, B, C, D, ...]
Reverse:   build puzzle   = place arrows in order  [D, C, B, A, ...]
```

The placement order is the solution in reverse. Solvability is guaranteed.

### The Snake Complication

The reverse of "arrow exits the board" is "arrow enters the board from the edge." But because arrows move like snakes, **entry is also snake-like** — the head enters first, then the body flows in segment by segment.

When placing an arrow in reverse, we must simulate its full entry trajectory and confirm every cell it passes through at that moment in the build sequence is empty. The footprint of an arrow during entry is larger than its final resting position.

---

## 4. Core Algorithm

### 4.1 High-Level Loop

```
function generateLevel(config: GeneratorConfig): Level
  grid = emptyGrid(config.width, config.height)
  placedArrows = []
  placementOrder = []        // reverse of solution order

  attempts = 0
  while placedArrows.length < config.targetArrowCount
    if attempts > MAX_ATTEMPTS
      break                  // return best effort so far

    arrow = tryPlaceArrow(grid, config, placedArrows)

    if arrow is null
      attempts++
      continue

    place arrow onto grid
    placedArrows.push(arrow)
    placementOrder.push(arrow.id)
    attempts = 0

  solution = reverse(placementOrder)
  return { grid, arrows: placedArrows, solution }
```

### 4.2 tryPlaceArrow

```
function tryPlaceArrow(grid, config, existing): Arrow | null
  // Pick a candidate head position and direction
  candidates = getAllValidHeadPlacements(grid, config)
  shuffle(candidates)         // randomness controlled by seed

  for each (position, direction) in candidates
    shape = generateShape(grid, position, direction, config)
    if shape is null
      continue

    arrow = { head: position, direction, cells: shape }

    // Check entry trajectory is clear
    if not entryPathIsClear(grid, arrow)
      continue

    // Check no facing-heads deadlock introduced
    if introducesFacingHeadsDeadlock(grid, arrow, existing)
      continue

    // Check dependency graph for circular deadlocks
    if introducesCircularDeadlock(grid, arrow, existing)
      continue

    // Check difficulty target
    if not meetsDifficultyConstraint(grid, arrow, existing, config)
      continue

    return arrow

  return null    // no valid placement found this iteration
```

### 4.3 Entry Path Simulation

This is the reverse of the snake exit. To verify a candidate arrow can enter the board:

```
function entryPathIsClear(grid, arrow): boolean
  // Simulate the arrow entering from outside the board
  // The head enters first; body follows step by step
  // At each step, the cell the head is about to enter must be empty
  // (the tail is still outside the board or in cells already vacated)

  trajectory = computeEntryTrajectory(arrow)
  // trajectory = ordered list of (cell, timestep) pairs
  // representing which grid cell each segment occupies at each step

  for each (cell, timestep) in trajectory
    if grid[cell] is not empty
      return false

  return true
```

The entry trajectory is computed by reversing the snake exit: start with the arrow in its final resting position, then simulate it moving **backwards** (opposite direction) until the head re-enters from the edge.

---

## 5. Shape Generation

### 5.1 Random Walk

Given a head position and direction, the body is grown by a constrained random walk backwards from the head:

```
function generateShape(grid, headPos, direction, config): Cell[] | null
  cells = [headCell(headPos, direction)]
  currentPos = headPos
  currentEntryDir = opposite(direction)   // direction body comes from

  targetLength = randomBetween(config.minArrowLength, config.maxArrowLength)

  while cells.length < targetLength
    nextPos = step(currentPos, currentEntryDir)

    if not inBounds(nextPos) or grid[nextPos] is not empty
      break     // can't extend further

    // Decide: straight or curve?
    segmentType = chooseSegmentType(currentEntryDir, config)
    // straight: continue in same direction
    // curve: turn 90° (left or right), pick randomly

    newEntryDir = exitDirectionOf(segmentType, currentEntryDir)
    cells.push(bodyCell(nextPos, segmentType))
    currentPos = nextPos
    currentEntryDir = newEntryDir

  if cells.length < config.minArrowLength
    return null    // couldn't build a long enough arrow here

  return cells
```

### 5.2 Curve Rules

A curve connects two perpendicular sides. When extending the body:

- A **straight** segment continues in the same axis
- A **curve** segment turns the path 90° — either clockwise or counterclockwise
- The curve type (`NE / NW / SE / SW`) is determined by which two sides it connects
- Curves add visual complexity and create the snake-like shapes that make the puzzle interesting

### 5.3 Length Distribution by Difficulty

| Difficulty | Min Length | Max Length | Curve Probability |
|---|---|---|---|
| Easy | 2 | 4 | 20% |
| Medium | 2 | 7 | 40% |
| Hard | 3 | 10 | 60% |
| Super Hard | 4 | 15+ | 70% |

Longer arrows with more curves create larger, more complex sweep paths — making puzzles harder because each arrow blocks more of the grid during its exit trajectory.

---

## 6. Dependency Graph & Difficulty

### 6.1 The Dependency Graph

At any puzzle state, we can model which arrows block which other arrows as a directed graph:

```
A → B  means: "A cannot move until B has moved"
           (B's body or head lies in A's path or entry trajectory)
```

**Free arrows** are nodes with no outgoing edges — they can move immediately.

### 6.2 Freedom Score

```
freedomScore(state) = number of arrows currently movable
```

This is the primary difficulty lever:

| Difficulty | Target Freedom Score (most states) |
|---|---|
| Easy | 3–5 |
| Medium | 2–3 |
| Hard | 1–2 |
| Super Hard | 1 (often exactly one valid move at a time) |

### 6.3 Guiding Placement by Freedom

During reverse construction, after placing each new arrow we compute the forward freedom score of the resulting state. If it exceeds the target for our difficulty setting, we bias the next placement toward arrows that will reduce freedom — i.e., arrows whose bodies or trajectories block currently free arrows.

```
function meetsDifficultyConstraint(grid, candidate, existing, config): boolean
  simulatedState = applyPlacement(grid, candidate)
  freedom = computeFreedomScore(simulatedState)
  return freedom <= config.targetMaxFreedom
```

### 6.4 Circular Deadlock Detection

When placing a new arrow, we update the dependency graph and check for cycles:

```
function introducesCircularDeadlock(grid, newArrow, existing): boolean
  graph = buildDependencyGraph(existing + [newArrow])
  return hasCycle(graph)
```

A cycle in the dependency graph means a set of arrows that mutually block each other — none can ever move first. This is the generalized form of the facing-heads rule.

```
// Simple DFS cycle detection
function hasCycle(graph): boolean
  visited = {}
  for each node in graph
    if DFS(node, visited, {}) finds a back edge
      return true
  return false
```

---

## 7. Validation Checks

These are the checks run both during generation (to guide placement) and after generation (as a final verification pass).

### 7.1 Structural Checks

- [ ] Every cell belongs to at most one arrow
- [ ] Every arrow has exactly one head
- [ ] Every arrow has at least one body segment
- [ ] Every segment in an arrow connects to its neighbors through matching open sides
- [ ] No curved segment is a head

### 7.2 Deadlock Checks

- [ ] No two arrowheads face each other on the same axis (facing-heads check)
- [ ] Dependency graph contains no cycles (circular deadlock check)

### 7.3 Solvability Check

While reverse construction guarantees solvability, a final solver pass is run as a sanity check:

```
function isSolvable(state): boolean
  queue = [state]
  visited = Set()

  while queue is not empty
    current = queue.dequeue()
    if current.arrows is empty
      return true                // solved

    stateHash = hash(current)
    if stateHash in visited
      continue
    visited.add(stateHash)

    for each arrow in current.arrows
      if canMove(arrow, current)
        nextState = executeMove(arrow, current)
        queue.enqueue(nextState)

  return false
```

This is a BFS solver. For large Super Hard puzzles it is depth-limited — if the known solution path is found within depth limit it passes; otherwise it is flagged for review.

### 7.4 Quality Checks

- [ ] At least one arrow is immediately movable at puzzle start
- [ ] No arrow is permanently unreachable in any solution path
- [ ] Freedom score profile matches target difficulty across the known solution path

---

## 8. Seeded Determinism

All randomness in the generator flows through a single seeded PRNG:

```
function generateLevel(levelNumber: number, difficulty: Difficulty): Level
  rng = seededRandom(levelNumber)
  config = difficultyConfig(difficulty)
  return runGenerator(config, rng)
```

This means:
- The same level number always produces the same puzzle, on any device
- Level 200 on Android is identical to level 200 on iOS and web
- No puzzle storage is needed for generated levels — they can always be re-derived
- Bugs in the generator can be reproduced exactly by providing the seed

The PRNG used should be a simple, portable, seedable algorithm — **mulberry32** or **xoshiro128** are good choices for JavaScript.

---

## 9. Edge Cases & Failure Modes

### 9.1 Placement Exhaustion

If `tryPlaceArrow` fails too many times in a row, the grid may be too full to place another arrow that meets all constraints. The algorithm accepts the current arrow count and returns a valid (if smaller than target) puzzle.

Mitigation: target arrow counts should be calibrated against grid size. A rough heuristic is `maxArrows ≈ (W × H) × 0.6` — leaving ~40% of cells empty on average.

### 9.2 Overly Linear Puzzles

At Super Hard difficulty, aggressively minimizing freedom can produce puzzles with exactly one valid move at every step — essentially a sequence with no choices. While technically valid, these feel more like a memory test than a logic puzzle.

Mitigation: enforce a minimum of at least 2 free arrows at puzzle start, even at Super Hard.

### 9.3 Trivially Short Puzzles

If the grid is sparse and arrows are short, a puzzle may be solvable in 2–3 moves regardless of difficulty setting. Mitigation: enforce minimum arrow count and minimum total cell coverage per difficulty tier.

| Difficulty | Min Arrows | Min Cell Coverage |
|---|---|---|
| Easy | 4 | 20% |
| Medium | 8 | 35% |
| Hard | 15 | 50% |
| Super Hard | 30 | 60% |

### 9.4 Generator Timeout

On low-end devices, complex Super Hard generation may take too long. Mitigation: run generation in a background thread (Web Worker on web, a worker thread in RN), and show a loading indicator. Pre-generate and cache the next 3 levels while the player is solving the current one.

---

*Arrout – Algorithm Design Doc v1.0 · March 2026*
