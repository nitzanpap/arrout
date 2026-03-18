# Arrout
## Product Requirements Document (PRD) · v1.0

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core Game Mechanics](#2-core-game-mechanics)
3. [User Stories](#3-user-stories)
4. [Engagement & Retention Systems](#4-engagement--retention-systems)
5. [UI / Visual Design System](#5-ui--visual-design-system)
6. [Competitive Landscape](#6-competitive-landscape)

---

## 1. Product Overview

### Vision

Arrout is a minimalist logic puzzle game for mobile and web. The player is presented with a grid containing a set of arrows — each a snake-like shape made of connected segments — and must slide them off the board one by one without causing collisions.

The game is built around three values:
- **Calm** — no timers, no energy systems, no pressure
- **Deep** — puzzles that reward genuine planning and spatial reasoning
- **Infinite** — a procedural generation engine that produces endless content beyond the early handcrafted levels

### Platform

| Target | Technology |
|---|---|
| Android | React Native |
| iOS | React Native |
| Web | React Native Web |

### Target Audience

| Segment | Description |
|---|---|
| 🧩 Puzzle enthusiasts | Players of Sudoku, nonograms, Rush Hour. Seek mental challenge without time pressure. |
| 😌 Casual relaxation seekers | Short sessions, minimal onboarding, calm aesthetics. |
| 🏆 Achievement hunters | Driven by streaks, trophies, completion milestones. |
| 🧠 Focus / ADHD users | Structured, repetitive, calming activity. No random events or social pressure. |

### Success Metrics

| Metric | Definition | Target |
|---|---|---|
| D1 Retention | Users returning the next day | ≥ 40% |
| D7 Retention | Users returning on day 7 | ≥ 20% |
| Session Length | Average time per session | 8–15 min |
| Levels / Session | Average levels completed per session | 3–8 |
| Daily Challenge Rate | % of DAU completing the daily challenge | ≥ 30% |
| App Store Rating | Star rating | ≥ 4.5★ |

---

## 2. Core Game Mechanics

### The Grid

- A rectangular grid of W × H cells
- Cells do not all need to be filled — sparse layouts are valid and encouraged
- The border of the grid is the exit boundary

### Cell Types

A cell is exactly one of:

| Type | Description |
|---|---|
| **Empty** | No content |
| **Arrowhead** | The leading tip of an arrow. Has a direction: `UP / DOWN / LEFT / RIGHT`. Must be a straight segment. |
| **Straight body** | Connects two opposite sides of the cell: horizontal or vertical |
| **Curved body** | Connects two perpendicular sides: `NE / NW / SE / SW`. Cannot be an arrowhead. |

### Arrow Structure

An arrow is a connected path of cells, minimum 2 cells:

- Exactly **one arrowhead** at the front
- One or more **body segments** behind it (straight or curved)
- Forms a simple path — no loops, no branches
- Each segment connects to the next through matching open sides

### Movement — Snake Mechanics

An arrow moves **like a snake**, not as a rigid shape:

1. Each step, the head advances one cell in its pointing direction
2. Every body segment shifts into the cell the segment ahead of it just vacated
3. Movement continues until the tail exits the board completely
4. The arrow is then fully removed, freeing all cells it occupied
5. An arrow **cannot stop mid-path** — once it begins moving it exits fully

### Valid Move Condition

An arrow can begin moving if and only if the cell immediately ahead of its head is empty or is the board edge. Once moving, the snake mechanic ensures the path is naturally cleared by the tail vacating cells — the only blockers are other arrows' cells ahead of the head.

### Heart System

- Each level begins with 3 hearts
- A heart is lost each time the player attempts an invalid move (blocked path)
- Hearts reset on level restart
- Hearts are **local to a level** — there is no global energy system

### Hint System

- A hint highlights the next recommended arrow and its direction
- Hints are a consumable earned through gameplay milestones or rewarded ads
- Hints are optional and non-intrusive

### Win Condition

All arrows have been removed from the grid.

### Deadlock Rules

A puzzle is invalid if it contains an **unresolvable deadlock**. The primary class of deadlock is:

> Two arrowheads pointing directly at each other on the same axis — regardless of what lies between them. Neither can ever move first without the other moving first. The puzzle becomes permanently unsolvable.

A head facing a body is **not** a deadlock — the body's arrow may move out of the way.

---

## 3. User Stories

### Core Gameplay

| Priority | Story |
|---|---|
| P1 | As a player, I want to slide arrows off the grid so that I can solve the puzzle. |
| P1 | As a player, I want to clearly see which arrows can move and which are blocked so I can plan ahead. |
| P1 | As a player, I want to undo my last move so I can recover from a mistake without restarting. |
| P1 | As a player, I want to restart a level so I can try a different approach. |
| P2 | As a stuck player, I want to use a hint so I can make progress without giving up. |
| P2 | As a player who completes a level, I want to automatically advance to the next one. |

### Progression

| Priority | Story |
|---|---|
| P1 | As a new player, I want an easy introductory experience so I can learn the mechanics without frustration. |
| P2 | As a progressing player, I want levels that gradually increase in complexity so I am always appropriately challenged. |
| P2 | As a long-term player, I want access to infinite generated levels so I never run out of content. |

### Engagement

| Priority | Story |
|---|---|
| P1 | As a returning player, I want a daily challenge so I have a reason to open the app every day. |
| P2 | As an engaged player, I want to see my streak and records so I can track my consistency. |
| P2 | As a completionist, I want tiered achievement awards so I have long-term goals to work toward. |
| P3 | As a regular player, I want monthly trophies for daily challenge completions so my consistency is visually rewarded. |

---

## 4. Engagement & Retention Systems

### Daily Streak

- A daily streak increments each calendar day the player completes at least one level
- The current streak is displayed prominently on the home screen
- An all-time longest streak record is kept separately and never decreases

### Daily Challenge

- A new unique puzzle is surfaced each calendar day in the Challenge tab
- Completing it contributes to the monthly trophy for that month
- The daily challenge is the primary hook for day-over-day retention

### Awards

Three tiered award tracks, each with 10 tiers:

| Award | Unlock Condition |
|---|---|
| ⭐ Level Legend | Cumulative levels completed |
| 🎯 Perfect Play | Levels completed without losing a heart |
| 🛡️ Unstoppable | Consecutive daily challenges completed |

Each tier unlocks a progressively more elaborate badge visible in the Collection screen.

### Monthly Trophies

- The Collection screen shows a calendar grid of monthly challenge trophies
- Each month displays "X of Y" daily challenges completed
- Incomplete months show empty trophy slots — a deliberate use of the **endowed progress** effect to motivate continued play

### Win Streak

- Tracks the longest consecutive sequence of levels completed without losing a heart
- Displayed in the Collection screen as an all-time record
- Resets on any heart loss, creating tension and care around perfect play

---

## 5. UI / Visual Design System

### Design Philosophy

- **Dark canvas first** — dark background reduces eye strain in long sessions
- **Minimal ornamentation** — no textures or decorations in the game view; every visual element serves gameplay comprehension
- **Arrow as art** — at Super Hard difficulty, the dense arrow grid becomes an abstract composition in itself
- **3D reserved for meta** — 3D-rendered trophies and badges appear only in the Collection screen, creating a visual reward outside gameplay

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Background | `#0F1120` | App background |
| Surface | `#161929` | Cards, cells |
| Grid / Arrow lines | `#C8CEFF` @ 60% | Arrow shapes on canvas |
| Accent — difficulty | `#7B77FF` | Difficulty labels |
| Accent — CTA | `#5B5FEF` | Primary buttons |
| Danger | `#FF4A6A` | Hearts, collision feedback |
| Text primary | `#EEF0FF` | Headings, level numbers |
| Text secondary | `#6C7099` | Labels, metadata |

### Typography

| Role | Font | Weight |
|---|---|---|
| Display / headings | Syne | 700–800 |
| UI labels | Syne | 400–600 |
| Code / metadata | DM Mono | 400 |

### Animation Guidelines

| Event | Animation | Duration |
|---|---|---|
| Arrow slide (valid) | Snake step-by-step translate, fade on exit | 200–250ms per step |
| Arrow blocked (invalid) | Short nudge + spring back | 150ms |
| Heart lost | Red pulse on heart icon | 300ms |
| Level complete | Cells fade out, score reveal | 600ms |
| Hint active | Pulsing glow on target arrow | Loop until dismissed |

### Screen Structure

**Home Screen** — logo, current level + difficulty label, streak counter, single large Play CTA. Intentionally sparse to minimize time from launch to active play.

**Game Screen** — full-bleed puzzle canvas, minimal top bar (back, restart, difficulty, hearts), grid-fit button (⊞) for large puzzles.

**Collection Screen** — records (streak, win streak, most wins), award badges with tier progress, monthly trophy calendar.

**Challenge Tab** — daily puzzle entry point, shows current month completion status.

**Settings** — audio, haptics, theme, privacy.

---

## 6. Competitive Landscape

### Direct Competitors

| Game | Mechanic | Differentiator vs. Arrout |
|---|---|---|
| Unblock Me | Slide single block to exit | Single rigid piece, no snake movement |
| Rush Hour | Slide cars to clear path for one target car | Single goal piece, physical theme |
| Flow Free | Connect matching colored dots | Connection mechanic, not extraction |
| Slidey Block Puzzle | Slide blocks off board | Rigid blocks, no snake body, no curves |

### Arrout's Differentiators

1. **Snake movement** — the body flows through curves, creating a uniquely satisfying visual and mechanical experience not present in any direct competitor
2. **No energy system** — a deliberate anti-pattern rejection that drives authentic high ratings
3. **Infinite generated content** — procedural generation beyond early levels means the game never ends
4. **Cross-platform from day one** — React Native targets Android, iOS, and web simultaneously
5. **Sparse grid aesthetics** — puzzles don't need to fill the grid, enabling elegant, composition-aware level design

### Positioning

> Arrout sits at the intersection of **calm puzzle game** and **deep logic challenge** — more mentally engaging than Unblock Me, less stressful than Rush Hour, and visually more distinctive than either.

---

*Arrout – PRD v1.0 · March 2026*
