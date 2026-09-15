import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { BIOME_COLORS } from "@/map/biomeColors"
import { CELL_PX } from "@/map/constants"

type MapDto = components["schemas"]["Map"]

interface MapCanvasProps {
  map: MapDto
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

/**
 * The map is the page background, not a bounded card: this canvas fills
 * the full viewport and every cell is a flat pastel fill by biome - no
 * shading, texture, or frame. UI elements render above it as an overlay
 * (see App.tsx), never displacing it.
 */
export function MapCanvas({ map, onCanvasReady }: MapCanvasProps) {
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

    const originX = Number(map.originX)
    const originY = Number(map.originY)
    for (const cell of map.cells) {
      const px = (Number(cell.x) - originX) * CELL_PX
      const py = (Number(cell.y) - originY) * CELL_PX
      ctx.fillStyle = BIOME_COLORS[cell.biome]
      ctx.fillRect(px, py, CELL_PX + 0.5, CELL_PX + 0.5)
    }
  }, [map])

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 h-screen w-screen" />
}
