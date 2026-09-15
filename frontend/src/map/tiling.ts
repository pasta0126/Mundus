export interface ChunkSpec {
  x: number
  y: number
  width: number
  height: number
  step: number
}

/**
 * Splits a logical window (originX/originY in world coordinates, width/
 * height in *sample* counts) into a grid of chunkSize-per-axis chunks
 * (partial at the right/bottom edges). Each chunk's own `x`/`y` is
 * offset by `cx/cy * step` world units, not `cx/cy` directly, so
 * chunks stay aligned to the same sampling grid as `step` grows past 1
 * - see constants.ts's ZoomLevel.
 */
export function computeChunkGrid(
  originX: number,
  originY: number,
  width: number,
  height: number,
  chunkSize: number,
  step: number,
): ChunkSpec[] {
  const specs: ChunkSpec[] = []
  for (let cy = 0; cy < height; cy += chunkSize) {
    const h = Math.min(chunkSize, height - cy)
    for (let cx = 0; cx < width; cx += chunkSize) {
      const w = Math.min(chunkSize, width - cx)
      specs.push({ x: originX + cx * step, y: originY + cy * step, width: w, height: h, step })
    }
  }
  return specs
}

/** Runs `task` over every item with at most `concurrency` in flight at once. */
export async function runWithConcurrency<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  async function worker() {
    while (index < items.length) {
      const item = items[index]
      index += 1
      await task(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}
