<p align="center">
  <img src="assets/feature-graphic-1024x500.png" alt="Arrout — Think before you tap" width="720" />
</p>

<p align="center">
  A minimalist logic puzzle game for mobile. Slide arrows off the board in the right order — but watch out, they block each other.
</p>

<table align="center">
  <tr>
    <td align="center"><img src="docs/media/home-screen.jpeg" alt="Home screen" width="270" /></td>
    <td align="center"><img src="docs/media/game-screen-level-start.jpeg" alt="Gameplay — Super Hard level" width="270" /></td>
    <td align="center"><video src="https://github.com/user-attachments/assets/1f1b67fd-827e-41e1-a420-6169cdc59992" width="270" controls></video></td>
  </tr>
  <tr>
    <td align="center"><em>Home</em></td>
    <td align="center"><em>Super Hard level</em></td>
    <td align="center"><em>Gameplay</em></td>
  </tr>
</table>

## Download

Grab the latest APK from the [Releases](https://github.com/nitzanpap/arrout/releases/latest) page and install it on any Android device — no Play Store needed.

A web version is also available — play it directly in your browser at [arrout.vercel.app](https://arrout.vercel.app).

## Why This Exists 🤷

Picture this: you're sitting in a bomb shelter during Iranian missile strikes on Israel 🚀, the wifi is basically decorative 📶, and every offline puzzle game on your phone wants you to watch a 30-second ad after each level 📺. Somewhere between the third siren, the interceptions going BOOM! outside, and the fifteenth unskippable ad, I thought: "I'm a developer. I can fix at least one of these problems!" 🧑‍💻

Zero ads. Zero tracking. Zero internet required. Just puzzles and the occasional boom outside. 💥

## How It Works

Players are presented with a grid of arrow-shaped pieces. Each arrow has a head pointing in a direction and a body made of straight and curved segments. Tap an arrow to slide it off the board — the head advances and the body follows, cell by cell, like a snake. The catch: arrows block each other. Figure out the right order to clear them all.

- **3 hearts per level** — lose one each time you tap a blocked arrow
- **Undo and restart** available at any time
- **Hints** highlight the next recommended move
- **Daily challenges** with a unique puzzle each day
- **Infinite levels** via procedural generation

## Difficulty Levels

| Difficulty | Grid | Arrows | Curves |
| - | - | - | - |
| Easy | 6x6 | 6 | 20% |
| Medium | 9x9 | 12 | 40% |
| Hard | 13x13 | 20 | 60% |
| Super Hard | 18x18 | 40 | 70% |

## Tech Stack

| Concern | Choice |
| - | - |
| Framework | React Native (Expo SDK 55) |
| Language | TypeScript (strict) |
| Rendering | React Native Skia |
| Animation | React Native Reanimated |
| State | Zustand (persisted with AsyncStorage) |
| Navigation | Expo Router |
| Linting | Biome |
| Runtime & Tests | Bun |

## Architecture

The codebase follows a strict layered architecture where dependencies only flow downward:

```
app/                    Screens & routing (Expo Router)
  src/components/       React Native + Skia UI
    src/hooks/          Bridge between store and UI
      src/store/        Zustand state management
        src/engine/     Pure TypeScript game logic
        src/generator/  Procedural level generation
```

The **engine** and **generator** are pure TypeScript with zero React/RN dependencies — fully testable with `bun test` alone.

### Key design decisions

- **Immutable game state** — all engine functions return new objects, never mutate
- **Single Skia canvas** — the entire grid is one `<Canvas>`, not per-cell Views, critical for performance on 18x18 grids
- **Deterministic generation** — same seed + difficulty = same level, using a seedable PRNG and reverse construction algorithm
- **Two-phase animation** — the store resolves the move immediately (optimistic state), while the visual animation plays asynchronously

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) — runtime, package manager, and test runner
- [Android Studio](https://developer.android.com/studio) — for the Android SDK and emulator (if you want to run on Android)
- [Xcode](https://developer.apple.com/xcode/) — for the iOS simulator (macOS only)
- [EAS CLI](https://docs.expo.dev/build/introduction/) — only needed if you want to build a standalone APK/IPA

### Run in development

```bash
# 1. Install dependencies
bun install

# 2. Start the Expo dev server
bun start

# 3. Pick your platform:
#    Press 'a' for Android emulator
#    Press 'i' for iOS simulator (macOS only)
#    Press 'w' for web browser
```

> The Android emulator or iOS simulator must already be running. If you don't have one set up, [Expo's guide](https://docs.expo.dev/get-started/set-up-your-environment/) walks you through it.

### Build

```bash
bun run build:android          # production AAB (for Play Store)
bun run build:android:preview  # preview APK (for testing)
bun run build:ios              # production iOS build
bun run build:ios:preview      # preview iOS build
bun run build:web              # web static export (zipped)
bun run build:web:preview      # web static export (dist/ kept for local preview)
```

Android and iOS builds run locally via EAS. Android production builds output an AAB to `builds/`, preview builds output an APK.

Web builds use `expo export` to produce a static site. The default `build:web` zips the output to `builds/`. Use `build:web:preview` to keep the `dist/` directory for local testing with `npx serve dist`.

### Install a preview APK on your phone

1. Transfer the `.apk` file to your Android phone (USB, Google Drive, email, etc.)
2. Open the file on the phone — you may need to enable **Install from unknown sources** in Settings
3. Tap **Install**, then **Open**

Or install directly to a connected device via ADB:

```bash
adb install builds/arrout_v*.apk
```

### Run tests

```bash
bun test                 # run all tests
bun test --watch         # watch mode
bun test src/engine      # engine tests only
bun test src/generator   # generator tests only
```

### Lint and type-check

```bash
bun run lint             # lint with Biome
bun run typecheck        # type-check with tsc
```

## Documentation

Detailed design docs are in the [`docs/`](docs/) directory:

- [Product Requirements](docs/01-prd.md) — game mechanics, user stories, engagement systems
- [Algorithm Design](docs/02-algorithm.md) — reverse construction, solver, generation strategy
- [Architecture](docs/03-architecture.md) — tech stack, engine design, state management, rendering

## Privacy Policy

[Privacy Policy](https://nitzanpap.github.io/arrout/privacy-policy.html)

## License

[GNU General Public License v3.0](LICENSE)
