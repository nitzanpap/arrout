import { describe, expect, it } from 'bun:test'
import { NEON_PALETTE, pickNeonColor } from '../neon'

describe('pickNeonColor', () => {
  it('returns a color from the NEON_PALETTE', () => {
    const ids = ['arrow-1', 'arrow-2', 'abc', 'xyz-123', '']
    for (const id of ids) {
      expect(NEON_PALETTE).toContain(pickNeonColor(id))
    }
  })

  it('is deterministic — same id always returns same color', () => {
    const id = 'arrow-42'
    const first = pickNeonColor(id)
    const second = pickNeonColor(id)
    expect(first).toBe(second)
  })

  it('distributes across multiple palette entries for different ids', () => {
    const colors = new Set<string>()
    for (let i = 0; i < 100; i++) {
      colors.add(pickNeonColor(`arrow-${i}`))
    }
    expect(colors.size).toBeGreaterThan(1)
  })
})
