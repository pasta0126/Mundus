import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { BIOME_COLORS } from "@/map/biomeColors"

type MapDto = components["schemas"]["Map"]

interface MapCanvasProps {
  map: MapDto
  /** On-screen size of one cell in CSS pixels - see map/constants.ts's ZOOM_LEVELS_PX. */
  cellPx: number
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

/**
 * The map is the page background, not a bounded card: this canvas fills
 * the full viewport and every cell is a flat pastel fill by biome - no
 * shading, texture, or frame. UI elements render above it as an overlay
 * (see App.tsx), never displacing it.
 */
export function MapCanvas({ map, cellPx, onCanvasReady }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = window.innerWidth
    const cssHeight = window.innerHeight
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    // At extreme zoom-out the requested window is capped (see
    // MAX_WINDOW_DIMENSION) and can cover less on-screen area than the
    // viewport - center the drawn cells rather than stretching them or
    // leaving them stuck in a corner.
    const windowWidthPx = Number(map.width) * cellPx
    const windowHeightPx = Number(map.height) * cellPx
    const offsetX = (cssWidth - windowWidthPx) / 2
    const offsetY = (cssHeight - windowHeightPx) / 2

    const originX = Number(map.originX)
    const originY = Number(map.originY)
    for (const cell of map.cells) {
      const px = offsetX + (Number(cell.x) - originX) * cellPx
      const py = offsetY + (Number(cell.y) - originY) * cellPx
      ctx.fillStyle = BIOME_COLORS[cell.biome]
      ctx.fillRect(px, py, cellPx + 0.5, cellPx + 0.5)
    }
  }, [map, cellPx])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 h-screen w-screen" />
}
