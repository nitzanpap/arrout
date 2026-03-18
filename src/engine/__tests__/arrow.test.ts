import { describe, expect, test } from 'bun:test'
import {
  areCellsConnected,
  arrowLength,
  arrowPositions,
  connectsSide,
  createArrow,
  getHead,
  getHeadDirection,
  getTail,
  isValidArrow,
} from '../arrow'
import type { GridCell } from '../types'

function makeCell(
  row: number,
  col: number,
  content: GridCell['content'],
  arrowId: string | null = null
): GridCell {
  return { row, col, content, arrowId }
}

describe('createArrow', () => {
  test('creates arrow with id, cells, and color', () => {
    const cells: GridCell[] = [
      makeCell(0, 0, { type: 'head', direction: 'RIGHT' }),
      makeCell(0, 1, { type: 'straight', axis: 'H' }),
    ]
    const arrow = createArrow('a1', cells, '#ff0000')
    expect(arrow.id).toBe('a1')
    expect(arrow.cells).toHaveLength(2)
    expect(arrow.color).toBe('#ff0000')
  })
})

describe('getHead / getTail / arrowLength', () => {
  const cells: GridCell[] = [
    makeCell(0, 0, { type: 'head', direction: 'DOWN' }),
    makeCell(1, 0, { type: 'straight', axis: 'V' }),
    makeCell(2, 0, { type: 'straight', axis: 'V' }),
  ]
  const arrow = createArrow('a1', cells, '#fff')

  test('getHead returns first cell', () => {
    expect(getHead(arrow).row).toBe(0)
    expect(getHead(arrow).content.type).toBe('head')
  })

  test('getHeadDirection returns head direction', () => {
    expect(getHeadDirection(arrow)).toBe('DOWN')
  })

  test('getTail returns last cell', () => {
    expect(getTail(arrow).row).toBe(2)
  })

  test('arrowLength returns number of cells', () => {
    expect(arrowLength(arrow)).toBe(3)
  })
})

describe('connectsSide', () => {
  test('head UP connects through top and bottom (straight segment with direction)', () => {
    expect(connectsSide({ type: 'head', direction: 'UP' }, 'top')).toBe(true)
    expect(connectsSide({ type: 'head', direction: 'UP' }, 'bottom')).toBe(true)
    expect(connectsSide({ type: 'head', direction: 'UP' }, 'left')).toBe(false)
    expect(connectsSide({ type: 'head', direction: 'UP' }, 'right')).toBe(false)
  })

  test('straight H connects left and right', () => {
    expect(connectsSide({ type: 'straight', axis: 'H' }, 'left')).toBe(true)
    expect(connectsSide({ type: 'straight', axis: 'H' }, 'right')).toBe(true)
    expect(connectsSide({ type: 'straight', axis: 'H' }, 'top')).toBe(false)
  })

  test('curve NE connects top and right', () => {
    expect(connectsSide({ type: 'curve', curve: 'NE' }, 'top')).toBe(true)
    expect(connectsSide({ type: 'curve', curve: 'NE' }, 'right')).toBe(true)
    expect(connectsSide({ type: 'curve', curve: 'NE' }, 'bottom')).toBe(false)
    expect(connectsSide({ type: 'curve', curve: 'NE' }, 'left')).toBe(false)
  })

  test('curve SW connects bottom and left', () => {
    expect(connectsSide({ type: 'curve', curve: 'SW' }, 'bottom')).toBe(true)
    expect(connectsSide({ type: 'curve', curve: 'SW' }, 'left')).toBe(true)
  })
})

describe('areCellsConnected', () => {
  test('head RIGHT connects to horizontal body on the right', () => {
    const head = makeCell(0, 0, { type: 'head', direction: 'RIGHT' })
    const body = makeCell(0, 1, { type: 'straight', axis: 'H' })
    expect(areCellsConnected(head, body)).toBe(true)
  })

  test('head RIGHT does not connect to vertical body on the right', () => {
    const head = makeCell(0, 0, { type: 'head', direction: 'RIGHT' })
    const body = makeCell(0, 1, { type: 'straight', axis: 'V' })
    expect(areCellsConnected(head, body)).toBe(false)
  })

  test('head DOWN connects to vertical body below', () => {
    const head = makeCell(0, 0, { type: 'head', direction: 'DOWN' })
    const body = makeCell(1, 0, { type: 'straight', axis: 'V' })
    expect(areCellsConnected(head, body)).toBe(true)
  })

  test('curve connects to adjacent segments through matching sides', () => {
    // Curve NE at (1,1), connects top to (0,1) and right to (1,2)
    const curve = makeCell(1, 1, { type: 'curve', curve: 'NE' })
    const above = makeCell(0, 1, { type: 'straight', axis: 'V' })
    const right = makeCell(1, 2, { type: 'straight', axis: 'H' })
    expect(areCellsConnected(curve, above)).toBe(true)
    expect(areCellsConnected(curve, right)).toBe(true)
  })

  test('non-adjacent cells return false', () => {
    const a = makeCell(0, 0, { type: 'head', direction: 'RIGHT' })
    const b = makeCell(0, 5, { type: 'straight', axis: 'H' })
    expect(areCellsConnected(a, b)).toBe(false)
  })
})

describe('isValidArrow', () => {
  test('valid 2-cell arrow', () => {
    const arrow = createArrow(
      'a1',
      [
        makeCell(0, 0, { type: 'head', direction: 'RIGHT' }),
        makeCell(0, 1, { type: 'straight', axis: 'H' }),
      ],
      '#fff'
    )
    expect(isValidArrow(arrow)).toBe(true)
  })

  test('rejects single cell arrow', () => {
    const arrow = createArrow('a1', [makeCell(0, 0, { type: 'head', direction: 'RIGHT' })], '#fff')
    expect(isValidArrow(arrow)).toBe(false)
  })

  test('rejects arrow without head at front', () => {
    const arrow = createArrow(
      'a1',
      [
        makeCell(0, 0, { type: 'straight', axis: 'H' }),
        makeCell(0, 1, { type: 'straight', axis: 'H' }),
      ],
      '#fff'
    )
    expect(isValidArrow(arrow)).toBe(false)
  })

  test('rejects disconnected cells', () => {
    const arrow = createArrow(
      'a1',
      [
        makeCell(0, 0, { type: 'head', direction: 'RIGHT' }),
        makeCell(0, 3, { type: 'straight', axis: 'H' }), // gap
      ],
      '#fff'
    )
    expect(isValidArrow(arrow)).toBe(false)
  })

  test('valid arrow with curve', () => {
    // Head RIGHT at (0,0), curve NW at (0,1) connects left+top
    // Wait: head RIGHT opens right side, curve NW opens top+left
    // head right side -> curve left side: connected!
    const arrow = createArrow(
      'a1',
      [
        makeCell(0, 0, { type: 'head', direction: 'RIGHT' }),
        makeCell(0, 1, { type: 'curve', curve: 'NW' }),
      ],
      '#fff'
    )
    expect(isValidArrow(arrow)).toBe(true)
  })
})

describe('arrowPositions', () => {
  test('returns positions of all cells', () => {
    const arrow = createArrow(
      'a1',
      [
        makeCell(2, 3, { type: 'head', direction: 'DOWN' }),
        makeCell(3, 3, { type: 'straight', axis: 'V' }),
      ],
      '#fff'
    )
    expect(arrowPositions(arrow)).toEqual([
      { row: 2, col: 3 },
      { row: 3, col: 3 },
    ])
  })
})
