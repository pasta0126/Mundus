/**
 * Fixed pixel sizes of one cell on screen, index 0 being the default
 * (most zoomed-in) level - see design.md ("full-viewport canvas,
 * stepped zoom"). A small, discrete step count by design - not a
 * continuous/scroll-wheel zoom.
 */
export const ZOOM_LEVELS_PX = [24, 20, 16, 12, 8] as const

/** Matches the backend's MapGenerator.MaxWindowDimension - the largest window a single request may cover per axis. */
export const MAX_WINDOW_DIMENSION = 256
