export interface ZoomLevel {
  /** On-screen size of one sampled cell, in CSS pixels. */
  cellPx: number
  /**
   * World-coordinate spacing between sampled cells (see the API's
   * `step` param). 1 = every world cell rendered; > 1 sparsely samples
   * a much larger world area at the same request/response cost, for
   * zoom levels past the finest 1px/cell step - see design.md
   * ("Sampling stride for zoom levels past 1px/cell").
   */
  step: number
}

/**
 * A small, discrete sequence of zoom steps - not a continuous/scroll-
 * wheel zoom - index 0 being the default (most zoomed-in) level. See
 * design.md ("full-viewport canvas, stepped zoom"). `cellPx` stays
 * fixed at its documented minimum of 1 once reached; steps past that
 * widen `step` instead; going further out this way keeps request/
 * response size identical to the plain 1px/cell step (same number of
 * sampled cells, just spaced further apart in world coordinates), so
 * it costs nothing extra over the finest zoom level.
 */
export const ZOOM_LEVELS: readonly ZoomLevel[] = [
  { cellPx: 24, step: 1 },
  { cellPx: 20, step: 1 },
  { cellPx: 16, step: 1 },
  { cellPx: 12, step: 1 },
  { cellPx: 8, step: 1 },
  { cellPx: 6, step: 1 },
  { cellPx: 4, step: 1 },
  { cellPx: 3, step: 1 },
  { cellPx: 2, step: 1 },
  { cellPx: 1, step: 1 },
  { cellPx: 1, step: 2 },
  { cellPx: 1, step: 4 },
  { cellPx: 1, step: 8 },
  { cellPx: 1, step: 16 },
] as const

/**
 * Cells per axis fetched in a single request - stays comfortably fast
 * (well under the backend's own 512-per-axis cap) so tiling many of
 * these in parallel covers an arbitrarily large viewport. See
 * design.md ("Tiled, progressive window loading").
 */
export const CHUNK_SIZE = 256

/** How many chunk requests are in flight at once. */
export const CHUNK_CONCURRENCY = 6

/**
 * Frontend-only safety net on the *logical* (pre-tiling) window size,
 * per axis - generous enough that no real display's viewport at the
 * lowest zoom step (1px/cell) ever reaches it; only bounds pathological
 * cases from firing an unbounded number of chunk requests.
 */
export const MAX_TOTAL_DIMENSION = 4096
