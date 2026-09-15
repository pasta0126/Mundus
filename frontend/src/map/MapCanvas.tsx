import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { chaikinSmooth, extractContours, type Point } from "@/map/contour"

type MapDto = components["schemas"]["Map"]

const VIEWPORT = 640
const MARGIN = 12
const OCEAN = "#3a6070"
const LAND = "#ffffff"
const COASTLINE = "#000000"

interface MapCanvasProps {
  map: MapDto
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

export function MapCanvas({ map, onCanvasReady }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = Number(map.width)
    const height = Number(map.height)

    const elevation = new Float32Array(width * height)
    for (const cell of map.cells) {
      elevation[Number(cell.y) * width + Number(cell.x)] = Number(cell.elevation)
    }
    const elevationAt = (x: number, y: number) => elevation[y * width + x]

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = OCEAN
    ctx.fillRect(0, 0, VIEWPORT, VIEWPORT)

    const inner = VIEWPORT - MARGIN * 2
    const cellSize = inner / Math.max(width, height)
    const toPixel = (p: Point) => ({ x: MARGIN + p.x * cellSize, y: MARGIN + p.y * cellSize })

    // 0.3 matches Mundus.Core's OceanThreshold - the API only exposes the
    // resulting biome, not this constant, so it's duplicated here.
    const rawContours = extractContours(elevationAt, width, height, 0.3)
    const smoothed = rawContours.map((poly) => chaikinSmooth(poly, 3))

    const landPath = new Path2D()
    for (const poly of smoothed) {
      if (poly.length < 3) continue
      const first = toPixel(poly[0])
      landPath.moveTo(first.x, first.y)
      for (const p of poly.slice(1)) {
        const px = toPixel(p)
        landPath.lineTo(px.x, px.y)
      }
      landPath.closePath()
    }

    ctx.fillStyle = LAND
    ctx.fill(landPath, "nonzero")

    ctx.strokeStyle = COASTLINE
    ctx.lineWidth = Math.max(1.5, cellSize * 0.15)
    ctx.lineJoin = "round"
    ctx.stroke(landPath)
  }, [map])

  return (
    <canvas
      ref={canvasRef}
      width={VIEWPORT}
      height={VIEWPORT}
      className="border-border aspect-square w-full rounded-lg border"
    />
  )
}
