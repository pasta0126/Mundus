/**
 * Fixed pixel sizes of one cell on screen, index 0 being the default
 * (most zoomed-in) level - see design.md ("full-viewport canvas,
 * stepped zoom"). A small, discrete step count by design - not a
 * continuous/scroll-wheel zoom.
 */
export const ZOOM_LEVELS_PX = [24, 20, 16, 12, 8, 6, 4, 3, 2, 1] as const

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
