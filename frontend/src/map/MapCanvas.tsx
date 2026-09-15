import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { biomeColor } from "@/map/biomeColors"

type MapDto = components["schemas"]["Map"]
type CellDto = components["schemas"]["Cell"]

const VIEWPORT = 640
// Pixels per cell in the offscreen buffer we draw at full detail before
// scaling up with canvas smoothing - see design.md ("Smoothing
// technique"). Small enough that the upscale blurs hard cell edges into
// smoothed coastlines, large enough to keep biome color blocks legible.
const PRE_SCALE = 3

interface MapCanvasProps {
  map: MapDto
}

export function MapCanvas({ map }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = Number(map.width)
    const height = Number(map.height)

    const offscreen = document.createElement("canvas")
    const layout =
      map.gridType === "Hex"
        ? hexLayout(width, height, PRE_SCALE)
        : squareLayout(width, height, PRE_SCALE)
    offscreen.width = layout.canvasSize
    offscreen.height = layout.canvasSize
    const offCtx = offscreen.getContext("2d")
    if (!offCtx) return

    for (const cell of map.cells) {
      const { cx, cy } = layout.position(Number(cell.x), Number(cell.y))
      offCtx.fillStyle = biomeColor(cell.biome, Number(cell.elevation))
      if (map.gridType === "Hex") {
        drawHex(offCtx, cx, cy, layout.cellRadius)
      } else {
        offCtx.fillRect(cx - layout.cellRadius, cy - layout.cellRadius, layout.cellRadius * 2, layout.cellRadius * 2)
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(offscreen, 0, 0, layout.canvasSize, layout.canvasSize, 0, 0, VIEWPORT, VIEWPORT)

    const viewportLayout =
      map.gridType === "Hex"
        ? hexLayout(width, height, VIEWPORT / layout.canvasSize * PRE_SCALE)
        : squareLayout(width, height, VIEWPORT / layout.canvasSize * PRE_SCALE)
    drawIcons(ctx, map.cells, viewportLayout)
  }, [map])

  return (
    <canvas
      ref={canvasRef}
      width={VIEWPORT}
      height={VIEWPORT}
      className="border-border aspect-square w-full rounded-lg border bg-[#e9dfc3]"
    />
  )
}

interface Layout {
  canvasSize: number
  cellRadius: number
  position: (x: number, y: number) => { cx: number; cy: number }
}

function squareLayout(width: number, height: number, preScale: number): Layout {
  const cellSize = preScale
  const canvasSize = Math.max(width, height) * cellSize
  return {
    canvasSize,
    cellRadius: cellSize / 2,
    position: (x, y) => ({ cx: x * cellSize + cellSize / 2, cy: y * cellSize + cellSize / 2 }),
  }
}

function hexLayout(width: number, height: number, preScale: number): Layout {
  const radius = preScale
  const hexWidth = radius * 2
  const hexHeight = radius * Math.sqrt(3)
  const colSpacing = hexWidth * 0.75
  const rowHeight = hexHeight * 0.75

  const totalWidth = hexWidth + (width - 1) * colSpacing
  const totalHeight = rowHeight * height + hexHeight * 0.25
  const canvasSize = Math.max(totalWidth, totalHeight)
  const offsetX = (canvasSize - totalWidth) / 2
  const offsetY = (canvasSize - totalHeight) / 2

  return {
    canvasSize,
    cellRadius: radius,
    position: (x, y) => ({
      cx: offsetX + x * colSpacing + hexWidth / 2,
      cy: offsetY + y * rowHeight + (x % 2 === 1 ? rowHeight / 2 : 0) + hexHeight / 2,
    }),
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

/**
 * Deterministic subsample (not random, so the same map always renders
 * identically) but hashed rather than a plain modulo - a plain `(x+y) %
 * N` produces visible diagonal stripes instead of an organic-looking
 * scatter. See design.md ("Iconography").
 */
function shouldShowIcon(x: number, y: number): boolean {
  let h = (x * 374761393 + y * 668265263) ^ (x * y * 2147483647)
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return (h >>> 0) % 100 < 16
}

function drawIcons(ctx: CanvasRenderingContext2D, cells: readonly CellDto[], layout: Layout) {
  const iconSize = layout.cellRadius * 1.6

  for (const cell of cells) {
    const x = Number(cell.x)
    const y = Number(cell.y)
    if (!shouldShowIcon(x, y)) continue

    const { cx, cy } = layout.position(x, y)
    if (cell.biome === "Mountains") {
      drawPeakIcon(ctx, cx, cy, iconSize)
    } else if (cell.biome === "Forest") {
      drawTreeIcon(ctx, cx, cy, iconSize)
    }
  }
}

function drawPeakIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.fillStyle = "rgba(60, 50, 40, 0.55)"
  ctx.beginPath()
  ctx.moveTo(cx, cy - size / 2)
  ctx.lineTo(cx + size / 2, cy + size / 2)
  ctx.lineTo(cx - size / 2, cy + size / 2)
  ctx.closePath()
  ctx.fill()
}

function drawTreeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.fillStyle = "rgba(30, 45, 25, 0.55)"
  const r = size / 4
  const offsets: [number, number][] = [
    [0, -r * 0.6],
    [-r * 0.8, r * 0.5],
    [r * 0.8, r * 0.5],
  ]
  for (const [dx, dy] of offsets) {
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
