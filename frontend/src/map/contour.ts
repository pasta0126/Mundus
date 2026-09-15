/** A point in the same coordinate space as the grid it was extracted from. */
export interface Point {
  x: number
  y: number
}

/**
 * Marching squares over a continuous per-cell scalar field (elevation),
 * not a boolean land/ocean mask: sampling a boolean mask only ever
 * produces 5 discrete corner values (0, 0.25, 0.5, 0.75, 1), so exact
 * ties at the 0.5 threshold - and therefore ambiguous "saddle" squares -
 * are common rather than the rare, measure-zero coincidence marching
 * squares normally assumes. That caused broken (non-looping) polylines
 * in practice. Using the real continuous elevation values instead makes
 * exact ties genuinely rare.
 *
 * Corner scalar = average elevation of the up-to-4 surrounding cells
 * (out-of-bounds cells act as a fixed low "deep ocean" sentinel, padding
 * the grid so every contour closes into a loop entirely inside it - see
 * design.md). Segments are chained into closed polylines; an open
 * (non-looping) polyline is dropped rather than force-closed with a
 * straight line, since a rare leftover open fragment is a much smaller
 * visual defect than a spurious chord across the map.
 */
export function extractContours(
  elevationAt: (x: number, y: number) => number,
  width: number,
  height: number,
  threshold: number,
): Point[][] {
  const DEEP_OCEAN = -1 // sentinel, always well below any real threshold
  const paddedWidth = width + 2
  const paddedHeight = height + 2
  const paddedElevation = (px: number, py: number): number => {
    const x = px - 1
    const y = py - 1
    if (x < 0 || x >= width || y < 0 || y >= height) return DEEP_OCEAN
    return elevationAt(x, y)
  }

  // Corner grid is (paddedWidth+1) x (paddedHeight+1); corner (cx, cy)
  // sits at the shared corner of padded cells (cx-1,cy-1), (cx,cy-1),
  // (cx-1,cy), (cx,cy) - every one of which is always defined (possibly
  // ocean padding).
  const cornerValue = (cx: number, cy: number): number => {
    let sum = 0
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
    ] as const) {
      sum += paddedElevation(cx + dx, cy + dy)
    }
    return sum / 4
  }

  const cols = paddedWidth + 1
  const rows = paddedHeight + 1
  const corners = new Float32Array(cols * rows)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      corners[y * cols + x] = cornerValue(x, y)
    }
  }

  const at = (x: number, y: number) => corners[y * cols + x]

  const segments: [Point, Point][] = []
  const lerp = (a: number, b: number, va: number, vb: number) => {
    const t = va === vb ? 0.5 : (threshold - va) / (vb - va)
    return a + (b - a) * t
  }

  for (let y = 0; y < paddedHeight; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      const tl = at(x, y)
      const tr = at(x + 1, y)
      const bl = at(x, y + 1)
      const br = at(x + 1, y + 1)
      const idx = (tl >= threshold ? 8 : 0) | (tr >= threshold ? 4 : 0) | (br >= threshold ? 2 : 0) | (bl >= threshold ? 1 : 0)
      if (idx === 0 || idx === 15) continue

      const top: Point = { x: lerp(x, x + 1, tl, tr), y }
      const bottom: Point = { x: lerp(x, x + 1, bl, br), y: y + 1 }
      const left: Point = { x, y: lerp(y, y + 1, tl, bl) }
      const right: Point = { x: x + 1, y: lerp(y, y + 1, tr, br) }

      // Standard marching-squares case table (oriented so land is
      // consistently "inside" for fill winding).
      const push = (a: Point, b: Point) => segments.push([a, b])
      switch (idx) {
        case 1: push(left, bottom); break
        case 2: push(bottom, right); break
        case 3: push(left, right); break
        case 4: push(right, top); break
        // Saddle cases (two diagonal corners land, two water): each half
        // is isolated the same way a single-corner case would isolate it
        // (e.g. the br corner here the same way case 13 - "br is the only
        // water corner" - isolates it, not case 2's "br is the only land
        // corner" direction). Getting this backwards for either half was
        // exactly self-consistent within the cell (so it looked fine in
        // isolation) but disagreed with every ordinary neighboring cell
        // about which of {start, end} a shared edge point was, which
        // silently broke chains into unclosed (and therefore dropped)
        // fragments - rare with a few big grains, common with hundreds of
        // small overlapping ones. See the bug report this fixes.
        case 5: push(left, top); push(right, bottom); break
        case 6: push(bottom, top); break
        case 7: push(left, top); break
        case 8: push(top, left); break
        case 9: push(top, bottom); break
        case 10: push(top, right); push(bottom, left); break
        case 11: push(top, right); break
        case 12: push(right, left); break
        case 13: push(right, bottom); break
        case 14: push(bottom, left); break
        default: break
      }
    }
  }

  return chainSegments(segments).map((poly) => poly.map((p) => ({ x: p.x - 1, y: p.y - 1 })))
}

function keyOf(p: Point): string {
  return `${p.x.toFixed(3)},${p.y.toFixed(3)}`
}

function chainSegments(segments: [Point, Point][]): Point[][] {
  // Keyed by start point -> every segment starting there, not just one:
  // with a dense, convoluted coastline (hundreds of overlapping grains),
  // it's common for more than one segment to share a start point, and a
  // single-valued map would silently drop all but the last, breaking the
  // chain and causing large loops to end up open (and therefore dropped
  // below) even though a valid closed path exists.
  const bySource = new Map<string, [Point, Point][]>()
  for (const seg of segments) {
    const key = keyOf(seg[0])
    const existing = bySource.get(key)
    if (existing) existing.push(seg)
    else bySource.set(key, [seg])
  }

  const used = new Set<[Point, Point]>()
  const polylines: Point[][] = []

  for (const seg of segments) {
    if (used.has(seg)) continue
    const polyline: Point[] = [seg[0], seg[1]]
    used.add(seg)

    let current = seg[1]
    let closed = false
    let safety = segments.length + 1
    while (safety-- > 0) {
      if (keyOf(current) === keyOf(polyline[0])) {
        closed = true
        break
      }
      const candidates = bySource.get(keyOf(current))
      const next = candidates?.find((s) => !used.has(s))
      if (!next) break
      used.add(next)
      current = next[1]
      polyline.push(current)
    }

    // Drop open (non-looping) fragments rather than force-closing them
    // with a straight line - see the module doc comment.
    if (closed) polylines.push(polyline)
  }

  return polylines
}

/** Chaikin corner-cutting: smooths a closed polyline over N iterations. */
export function chaikinSmooth(polyline: Point[], iterations: number): Point[] {
  let points = polyline
  for (let i = 0; i < iterations; i++) {
    const next: Point[] = []
    const n = points.length
    for (let j = 0; j < n; j++) {
      const p0 = points[j]
      const p1 = points[(j + 1) % n]
      next.push({ x: p0.x * 0.75 + p1.x * 0.25, y: p0.y * 0.75 + p1.y * 0.25 })
      next.push({ x: p0.x * 0.25 + p1.x * 0.75, y: p0.y * 0.25 + p1.y * 0.75 })
    }
    points = next
  }
  return points
}
