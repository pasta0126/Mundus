/**
 * The device pixel ratio to size a full-viewport canvas at. A phone's `dpr`
 * (commonly 3, sometimes higher) would otherwise multiply every full-window
 * map canvas's pixel count by up to 9x over a desktop's, for detail that's
 * hard to even see at a phone's small physical size - a real cost in fill
 * time and memory on weaker mobile GPUs. Capped only on touch-first devices
 * (coarse pointer, no hover); a desktop retina display keeps its full
 * sharpness.
 */
export function effectiveDpr(): number {
  const raw = window.devicePixelRatio || 1
  const touchFirst = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(hover: none)").matches
  return touchFirst ? Math.min(raw, 2) : raw
}
