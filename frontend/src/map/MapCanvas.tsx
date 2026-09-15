import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { biomeColor } from "@/map/biomeColors"

type MapDto = components["schemas"]["Map"]

interface MapCanvasProps {
  map: MapDto
}

const VIEWPORT = 640

export function MapCanvas({ map }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = Number(map.width)
    const height = Number(map.height)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (map.gridType === "Hex") {
      drawHexGrid(ctx, map, width, height)
    } else {
      drawSquareGrid(ctx, map, width, height)
    }
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

function drawSquareGrid(ctx: CanvasRenderingContext2D, map: MapDto, width: number, height: number) {
  const cellSize = VIEWPORT / Math.max(width, height)
  for (const cell of map.cells) {
    const x = Number(cell.x)
    const y = Number(cell.y)
    ctx.fillStyle = biomeColor(cell.biome, Number(cell.elevation))
    ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5)
  }
}

function drawHexGrid(ctx: CanvasRenderingContext2D, map: MapDto, width: number, height: number) {
  // Flat-top hexagons, alternating column vertical offset. Purely visual
  // convention - see design.md ("Canvas renderer"). Unit basis: radius 1,
  // scaled and centered to fill the (square) viewport afterwards.
  const cols = width
  const rows = height
  const unitHexWidth = 2
  const unitHexHeight = Math.sqrt(3)
  const unitRowHeight = unitHexHeight * 0.75
  const unitColSpacing = unitHexWidth * 0.75

  const totalWidth = unitHexWidth + (cols - 1) * unitColSpacing
  const totalHeight = unitRowHeight * rows + unitHexHeight * 0.25

  const scale = VIEWPORT / Math.max(totalWidth, totalHeight)
  const offsetX = (VIEWPORT - totalWidth * scale) / 2
  const offsetY = (VIEWPORT - totalHeight * scale) / 2

  for (const cell of map.cells) {
    const col = Number(cell.x)
    const row = Number(cell.y)
    const cx = offsetX + (col * unitColSpacing + unitHexWidth / 2) * scale
    const cy = offsetY + (row * unitRowHeight + (col % 2 === 1 ? unitRowHeight / 2 : 0) + unitHexHeight / 2) * scale
    drawHex(ctx, cx, cy, scale, biomeColor(cell.biome, Number(cell.elevation)))
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, fill: string) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}
