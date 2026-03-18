// ── Primitive types ──────────────────────────────────────────────

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Axis = 'H' | 'V'
export type CurveType = 'NE' | 'NW' | 'SE' | 'SW'
export type Side = 'top' | 'bottom' | 'left' | 'right'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'superHard'

// ── Position ────────────────────────────────────────────────────

export interface Position {
  readonly row: number
  readonly col: number
}

// ── Cell content ────────────────────────────────────────────────

export type CellContent =
  | { readonly type: 'empty' }
  | { readonly type: 'head'; readonly direction: Direction }
  | { readonly type: 'straight'; readonly axis: Axis }
  | { readonly type: 'curve'; readonly curve: CurveType }

// ── Grid cell ───────────────────────────────────────────────────

export interface GridCell {
  readonly row: number
  readonly col: number
  readonly content: CellContent
  readonly arrowId: string | null
}

// ── Arrow ───────────────────────────────────────────────────────

export interface Arrow {
  readonly id: string
  readonly cells: readonly GridCell[] // ordered: [head, ...body, tail]
  readonly color: string
}

// ── Grid state ──────────────────────────────────────────────────

export interface GridState {
  readonly width: number
  readonly height: number
  readonly cells: readonly (readonly GridCell[])[] // cells[row][col]
  readonly arrows: readonly Arrow[]
}

// ── Move result ─────────────────────────────────────────────────

export interface MoveResult {
  readonly success: boolean
  readonly nextState: GridState
  readonly arrowRemoved: boolean
  readonly heartLost: boolean
}

export interface MoveStepsResult {
  readonly success: boolean
  readonly steps: readonly GridState[]
  readonly heartLost: boolean
  readonly arrowId: string
}

// ── Level ───────────────────────────────────────────────────────

export interface Level {
  readonly id: number
  readonly difficulty: Difficulty
  readonly grid: GridState
  readonly solution: readonly string[] // arrow IDs in solve order
}

// ── Segment open sides ──────────────────────────────────────────

export function getOpenSides(content: CellContent): readonly Side[] {
  switch (content.type) {
    case 'empty':
      return []
    case 'head':
      // A head is a straight segment with a direction. It connects on both sides of its axis.
      // UP/DOWN heads are vertical (top + bottom), LEFT/RIGHT heads are horizontal (left + right).
      return content.direction === 'UP' || content.direction === 'DOWN'
        ? ['top', 'bottom']
        : ['left', 'right']
    case 'straight':
      return content.axis === 'H' ? ['left', 'right'] : ['top', 'bottom']
    case 'curve':
      return curveToSides(content.curve)
  }
}

export function directionToSide(dir: Direction): Side {
  switch (dir) {
    case 'UP':
      return 'top'
    case 'DOWN':
      return 'bottom'
    case 'LEFT':
      return 'left'
    case 'RIGHT':
      return 'right'
  }
}

export function oppositeSide(side: Side): Side {
  switch (side) {
    case 'top':
      return 'bottom'
    case 'bottom':
      return 'top'
    case 'left':
      return 'right'
    case 'right':
      return 'left'
  }
}

export function oppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'UP':
      return 'DOWN'
    case 'DOWN':
      return 'UP'
    case 'LEFT':
      return 'RIGHT'
    case 'RIGHT':
      return 'LEFT'
  }
}

export function directionDelta(dir: Direction): Position {
  switch (dir) {
    case 'UP':
      return { row: -1, col: 0 }
    case 'DOWN':
      return { row: 1, col: 0 }
    case 'LEFT':
      return { row: 0, col: -1 }
    case 'RIGHT':
      return { row: 0, col: 1 }
  }
}

function curveToSides(curve: CurveType): readonly Side[] {
  switch (curve) {
    case 'NE':
      return ['top', 'right']
    case 'NW':
      return ['top', 'left']
    case 'SE':
      return ['bottom', 'right']
    case 'SW':
      return ['bottom', 'left']
  }
}
