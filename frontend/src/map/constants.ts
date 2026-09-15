/**
 * Fixed pixel sizes of one cell on screen, index 0 being the default
 * (most zoomed-in) level - see design.md ("full-viewport canvas,
 * stepped zoom"). A small, discrete step count by design - not a
 * continuous/scroll-wheel zoom. At the low end this cap (see
 * MAX_WINDOW_DIMENSION) binds on wide screens, so the rendered window
 * covers less than the full viewport and MapCanvas centers it - see
 * that component.
 */
export const ZOOM_LEVELS_PX = [24, 20, 16, 12, 8, 6, 4, 3, 2, 1] as const

/** Matches the backend's MapGenerator.MaxWindowDimension - the largest window a single request may cover per axis. */
export const MAX_WINDOW_DIMENSION = 512
