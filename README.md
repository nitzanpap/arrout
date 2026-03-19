# Arrout

A minimalist logic puzzle game for mobile and web. Slide arrows off the board in the right order — but watch out, they move like snakes.

## How It Works

Players are presented with a grid of arrow-shaped pieces. Each arrow has a head pointing in a direction and a body made of straight and curved segments. Tap an arrow to slide it off the board — the head advances and the body follows, cell by cell, like a snake. The catch: arrows block each other. Figure out the right order to clear them all.

- **3 hearts per level** — lose one each time you tap a blocked arrow
- **Undo and restart** available at any time
- **Hints** highlight the next recommended move
- **Daily challenges** with a unique puzzle each day
- **Infinite levels** via procedural generation beyond the initial handcrafted set

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (runtime and package manager)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (comes with the expo package)

### Install

```bash
bun install
```

### Run

```bash
expo start          # start dev server, then press i/a/w
expo start --ios    # iOS simulator
expo start --android # Android emulator
expo start --web    # web browser
```

### Test

```bash
bun test            # all tests
bun test --watch    # watch mode
```

### Lint & Typecheck

```bash
biome check .           # lint
biome check --write .   # lint + autofix
biome format --write .  # format
tsc --noEmit            # typecheck
```

### Build

Builds use [EAS Build](https://docs.expo.dev/build/introduction/). Requires `eas login` first.

```bash
bun run build:android:preview   # APK for testing (sideloadable)
bun run build:android           # AAB for Google Play Store
bun run build:ios:preview       # IPA for internal testing (TestFlight)
bun run build:ios               # IPA for App Store

# Local builds (no cloud, requires native SDKs installed)
bun run build:android:local     # APK locally (needs Android SDK)
bun run build:ios:local         # IPA locally (needs Xcode)
```

## Tech Stack

| Concern | Choice |
| - | - |
| Framework | React Native (Expo SDK 55) |
| Language | TypeScript (strict) |
| Runtime | Bun |
| State | Zustand (persisted with AsyncStorage) |
| Rendering | React Native Skia |
| Animation | React Native Reanimated |
| Navigation | Expo Router |
| Linting | Biome |
| Testing | Bun test runner |

## Project Structure

```tree
app/                    # Expo Router screens
  (tabs)/               # Tab navigator (Home, Challenge, Collection, Settings)
  game.tsx              # Full-screen game modal

src/
  engine/               # Pure TS game logic (zero RN imports)
    types.ts            # Core types: GridState, Arrow, CellContent, Direction
    grid.ts             # Grid creation, cell accessors, immutable updates
    arrow.ts            # Arrow construction and segment connectivity
    move.ts             # Move validation and snake-style execution
    solver.ts           # BFS solver (hints + generator validation)
    validator.ts        # Structural + deadlock detection

  generator/            # Pure TS procedural level generation
    reverse-builder.ts  # Reverse construction algorithm
    shape-generator.ts  # Random walk arrow shapes
    difficulty.ts       # Difficulty configs (grid size, arrow count, freedom)
    prng.ts             # Seedable PRNG (mulberry32)

  store/                # Zustand stores
    game.store.ts       # Active puzzle session
    progress.store.ts   # Player progress (persisted)
    settings.store.ts   # Settings (persisted)

  components/
    Grid/               # Skia canvas, arrow paths, touch overlay
    HUD/                # Hearts, hints, move counter

  hooks/                # useArrowAnimation, useLevelLoader
  theme/                # Light/dark color definitions
  persistence/          # AsyncStorage helpers, schema migrations
  levels/               # Level resolution (static + generated)
```

## Difficulty Levels

| Difficulty | Grid | Arrows | Curves |
| - | - | - | - |
| Easy (1-50) | 6x6 | 6 | 20% |
| Medium (51-100) | 9x9 | 12 | 40% |
| Hard (101-150) | 13x13 | 20 | 60% |
| Super Hard (151+) | 18x18 | 40 | 70% |

## Documentation

Detailed design documents are in the `docs/` directory:

- [Product Requirements](docs/01-prd.md) — game mechanics, user stories, engagement systems
- [Algorithm Design](docs/02-algorithm.md) — reverse construction, solver, generation strategy
- [Architecture](docs/03-architecture.md) — tech stack, engine design, state management, rendering

## License

Private project. All rights reserved.
