export const NEON_PALETTE: readonly string[] = [
  '#00E5FF', // cyan
  '#FF00E5', // magenta
  '#FF4A6A', // pink
  '#4A9FFF', // electric blue
  '#00FF88', // bright green
  '#FFD600', // electric yellow
  '#BF5AF2', // neon purple
] as const

export function pickNeonColor(arrowId: string): string {
  let hash = 0
  for (let i = 0; i < arrowId.length; i++) {
    hash = (hash * 31 + arrowId.charCodeAt(i)) | 0
  }
  return NEON_PALETTE[Math.abs(hash) % NEON_PALETTE.length]
}
