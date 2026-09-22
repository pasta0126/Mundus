import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { BIOME_COLORS } from "@/map/biomeColors"
import { effectiveDpr } from "@/lib/dpr"

type MapDto = components["schemas"]["Map"]

interface MapCanvasProps {
  /** Chunk responses for the current view, in arrival order - only ever appended to within a generation. */
  chunks: MapDto[]
  /** Overall target window this view is filling in (for canvas sizing/centering), not any one chunk's own shape. */
  originX: number
  originY: number
  width: number
  height: number
  /** On-screen size of one sampled cell in CSS pixels - see map/constants.ts's ZOOM_LEVELS. */
  cellPx: number
  /** World-coordinate spacing between sampled cells - see map/constants.ts's ZOOM_LEVELS. */
  step: number
  /** Bumped by the caller every time a brand new fetch cycle starts - resets the canvas and drawn-chunk tracking. */
  generation: number
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

/**
 * The map is the page background, not a bounded card: this canvas fills
 * the full viewport and every cell is a flat pastel fill by biome - no
 * shading, texture, or frame. UI elements render above it as an overlay
 * (see App.tsx), never displacing it.
 *
 * A view's cells can arrive as many chunk responses over time (see
 * design.md "Tiled, progressive window loading"), so drawing is split
 * into two effects: one resets the canvas when `generation` changes
 * (a brand new view starting), the other draws only chunks not yet
 * drawn whenever `chunks` grows - so a whole progressive load draws
 * every cell exactly once, not the whole accumulated picture redrawn
 * on every chunk arrival.
 */
export function MapCanvas({ chunks, originX, originY, width, height, cellPx, step, generation, onCanvasReady }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawnCountRef = useRef(0)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = effectiveDpr()
    const cssWidth = window.innerWidth
    const cssHeight = window.innerHeight
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    // Chunk requests can be capped short of the full desired window on
    // pathological viewport/zoom combinations (see MAX_TOTAL_DIMENSION);
    // center what we did get rather than leaving it pinned to a corner.
    const windowWidthPx = width * cellPx
    const windowHeightPx = height * cellPx
    offsetRef.current = {
      x: (cssWidth - windowWidthPx) / 2,
      y: (cssHeight - windowHeightPx) / 2,
    }
    drawnCountRef.current = 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const { x: offsetX, y: offsetY } = offsetRef.current

    for (let i = drawnCountRef.current; i < chunks.length; i++) {
      for (const cell of chunks[i].cells) {
        const px = offsetX + ((Number(cell.x) - originX) / step) * cellPx
        const py = offsetY + ((Number(cell.y) - originY) / step) * cellPx
        ctx.fillStyle = BIOME_COLORS[cell.biome]
        ctx.fillRect(px, py, cellPx + 0.5, cellPx + 0.5)
      }
    }
    drawnCountRef.current = chunks.length
  }, [chunks, cellPx, step, originX, originY])

  // touch-none: dragging/pinching on the map (see useMapGestures) must not also scroll or refresh the page.
  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 h-dvh w-screen touch-none" />
}
