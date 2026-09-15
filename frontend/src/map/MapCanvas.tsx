import { useEffect, useRef } from "react"
import type { components } from "@/api/schema"
import { biomeColor } from "@/map/biomeColors"
import { chaikinSmooth, extractContours, type Point } from "@/map/contour"

type MapDto = components["schemas"]["Map"]
type CellDto = components["schemas"]["Cell"]

const VIEWPORT = 640
const BORDER = 18
const PARCHMENT = "#e9dfc3"
const COASTLINE = "rgba(40, 34, 24, 0.75)"

export function MapCanvas({ map }: { map: MapDto }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = Number(map.width)
    const height = Number(map.height)

    const grid: (CellDto | undefined)[][] = Array.from({ length: height }, () => Array(width).fill(undefined))
    for (const cell of map.cells) {
      grid[Number(cell.y)][Number(cell.x)] = cell
    }
    const cellAt = (x: number, y: number): CellDto | undefined =>
      x >= 0 && x < width && y >= 0 && y < height ? grid[y][x] : undefined
    const isLand = (x: number, y: number) => cellAt(x, y)?.biome !== "Ocean" && cellAt(x, y) !== undefined

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = PARCHMENT
    ctx.fillRect(0, 0, VIEWPORT, VIEWPORT)

    const inner = VIEWPORT - BORDER * 2
    ctx.save()
    ctx.translate(BORDER, BORDER)

    if (map.gridType === "Hex") {
      renderHex(ctx, grid, cellAt, isLand, width, height, inner)
    } else {
      renderSquare(ctx, grid, cellAt, isLand, width, height, inner)
    }

    ctx.restore()
    drawBorderFrame(ctx)
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

function hillshade(cellAt: (x: number, y: number) => CellDto | undefined, x: number, y: number): number {
  const center = cellAt(x, y)
  if (!center) return 1
  const east = cellAt(x + 1, y) ?? center
  const south = cellAt(x, y + 1) ?? center
  const dx = Number(east.elevation) - Number(center.elevation)
  const dy = Number(south.elevation) - Number(center.elevation)
  // Fixed light from the upper-left; slopes facing it read brighter.
  const lightX = -0.7
  const lightY = -0.7
  const dot = dx * lightX + dy * lightY
  return Math.max(0.7, Math.min(1.3, 1 + dot * 6))
}

function shadedColor(cellAt: (x: number, y: number) => CellDto | undefined, x: number, y: number): string {
  const cell = cellAt(x, y)
  if (!cell) return PARCHMENT
  const base = biomeColor(cell.biome, Number(cell.elevation))
  const shade = hillshade(cellAt, x, y)
  const match = /rgb\((\d+) (\d+) (\d+)\)/.exec(base)
  if (!match) return base
  const [, r, g, b] = match
  return `rgb(${Math.min(255, Math.round(Number(r) * shade))} ${Math.min(255, Math.round(Number(g) * shade))} ${Math.min(255, Math.round(Number(b) * shade))})`
}

// ---------- Square grid ----------

function renderSquare(
  ctx: CanvasRenderingContext2D,
  grid: (CellDto | undefined)[][],
  cellAt: (x: number, y: number) => CellDto | undefined,
  isLand: (x: number, y: number) => boolean,
  width: number,
  height: number,
  inner: number,
) {
  const cellSize = inner / Math.max(width, height)
  const toPixel = (p: Point) => ({ x: p.x * cellSize, y: p.y * cellSize })

  // 1. Ocean background + wave texture (land is painted over it below).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = shadedColor(cellAt, x, y)
      ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5)
    }
  }
  drawWaveTexture(ctx, (x, y) => !isLand(x, y), width, height, cellSize)

  // 2. Smoothed land contour, used to clip the land fill and stroke the
  // coastline. 0.3 matches Mundus.Core's OceanThreshold - the API only
  // exposes the resulting biome, not this constant, so it's duplicated
  // here (see design.md).
  const elevationAt = (x: number, y: number) => Number(cellAt(x, y)?.elevation ?? 0)
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

  ctx.save()
  ctx.clip(landPath, "nonzero")
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isLand(x, y)) continue
      ctx.fillStyle = shadedColor(cellAt, x, y)
      ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.5, cellSize + 0.5)
    }
  }
  drawIcons(ctx, grid, (x, y) => ({ cx: (x + 0.5) * cellSize, cy: (y + 0.5) * cellSize }), cellSize)
  ctx.restore()

  ctx.strokeStyle = COASTLINE
  ctx.lineWidth = Math.max(1.5, cellSize * 0.15)
  ctx.lineJoin = "round"
  ctx.stroke(landPath)
}

// ---------- Hex grid ----------

interface HexLayout {
  radius: number
  position: (x: number, y: number) => { cx: number; cy: number }
}

function computeHexLayout(width: number, height: number, inner: number): HexLayout {
  const unitHexWidth = 2
  const unitHexHeight = Math.sqrt(3)
  const unitColSpacing = unitHexWidth * 0.75
  const unitRowHeight = unitHexHeight * 0.75

  const totalWidth = unitHexWidth + (width - 1) * unitColSpacing
  const totalHeight = unitRowHeight * height + unitHexHeight * 0.25
  const scale = inner / Math.max(totalWidth, totalHeight)
  const offsetX = (inner - totalWidth * scale) / 2
  const offsetY = (inner - totalHeight * scale) / 2

  return {
    radius: scale,
    position: (x, y) => ({
      cx: offsetX + (x * unitColSpacing + unitHexWidth / 2) * scale,
      cy: offsetY + (y * unitRowHeight + (x % 2 === 1 ? unitRowHeight / 2 : 0) + unitHexHeight / 2) * scale,
    }),
  }
}

const HEX_NEIGHBORS_EVEN: [number, number][] = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]]
const HEX_NEIGHBORS_ODD: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]

function hexPath(cx: number, cy: number, radius: number): Path2D {
  const path = new Path2D()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    const px = cx + radius * Math.cos(angle)
    const py = cy + radius * Math.sin(angle)
    if (i === 0) path.moveTo(px, py)
    else path.lineTo(px, py)
  }
  path.closePath()
  return path
}

function renderHex(
  ctx: CanvasRenderingContext2D,
  grid: (CellDto | undefined)[][],
  cellAt: (x: number, y: number) => CellDto | undefined,
  isLand: (x: number, y: number) => boolean,
  width: number,
  height: number,
  inner: number,
) {
  const layout = computeHexLayout(width, height, inner)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { cx, cy } = layout.position(x, y)
      ctx.fillStyle = shadedColor(cellAt, x, y)
      ctx.fill(hexPath(cx, cy, layout.radius * 1.02))
    }
  }

  drawWaveTextureHex(ctx, isLand, layout, width, height)

  // Crisp coastline: outline every land hex that has at least one ocean neighbor.
  ctx.strokeStyle = COASTLINE
  ctx.lineWidth = Math.max(1.2, layout.radius * 0.12)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isLand(x, y)) continue
      const neighbors = y % 2 === 0 ? HEX_NEIGHBORS_EVEN : HEX_NEIGHBORS_ODD
      const hasOceanNeighbor = neighbors.some(([dx, dy]) => !isLand(x + dx, y + dy))
      if (!hasOceanNeighbor) continue
      const { cx, cy } = layout.position(x, y)
      ctx.stroke(hexPath(cx, cy, layout.radius))
    }
  }

  drawIcons(ctx, grid, (x, y) => layout.position(x, y), layout.radius)
}

// ---------- Icons ----------

/**
 * Deterministic hash-based subsample (not random, so the same map always
 * renders identically; not a plain modulo, which produces visible stripe
 * patterns). Returns a value in [0, 100).
 */
function hashPercent(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ (x * y * 2147483647)
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return (h >>> 0) % 100
}

function drawIcons(
  ctx: CanvasRenderingContext2D,
  grid: (CellDto | undefined)[][],
  positionOf: (x: number, y: number) => { cx: number; cy: number },
  cellRadius: number,
) {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const iconSize = cellRadius * 1.9

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      if (!cell) continue
      const roll = hashPercent(x, y)
      if (cell.biome === "Mountains" && roll < 35) {
        const { cx, cy } = positionOf(x, y)
        drawMountainRange(ctx, cx, cy, iconSize, hashPercent(x + 1, y))
      } else if (cell.biome === "Forest" && roll < 55) {
        const { cx, cy } = positionOf(x, y)
        drawTreeCluster(ctx, cx, cy, iconSize, hashPercent(x, y + 1))
      }
    }
  }
}

function drawMountainRange(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, variant: number) {
  const baseY = cy + size * 0.32
  const jitter = ((variant % 10) / 10 - 0.5) * size * 0.15
  const peaks: [number, number][] = [
    [-size * 0.32, size * 0.5],
    [0, size * 0.72],
    [size * 0.32, size * 0.46],
  ]

  ctx.strokeStyle = "rgba(50, 40, 30, 0.6)"
  ctx.lineWidth = Math.max(0.6, size * 0.05)

  for (const [dx, height] of peaks) {
    const apexX = cx + dx + jitter
    const apexY = baseY - height
    ctx.fillStyle = "rgba(80, 70, 60, 0.55)"
    ctx.beginPath()
    ctx.moveTo(apexX, apexY)
    ctx.lineTo(apexX + size * 0.28, baseY)
    ctx.lineTo(apexX - size * 0.28, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Snow cap.
    ctx.fillStyle = "rgba(245, 245, 240, 0.6)"
    ctx.beginPath()
    ctx.moveTo(apexX, apexY)
    ctx.lineTo(apexX + size * 0.1, apexY + height * 0.28)
    ctx.lineTo(apexX - size * 0.1, apexY + height * 0.28)
    ctx.closePath()
    ctx.fill()
  }
}

function drawTreeCluster(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, variant: number) {
  const r = size / 5
  const jitter = (variant % 10) / 10 - 0.5
  const offsets: [number, number][] = [
    [0, -r * 0.7 + jitter * r * 0.3],
    [-r * 0.9, r * 0.4],
    [r * 0.9, r * 0.4],
    [-r * 0.3 + jitter * r, -r * 0.1],
    [r * 0.3 - jitter * r, r * 0.7],
  ]
  for (const [dx, dy] of offsets) {
    ctx.beginPath()
    ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(25, 40, 20, 0.55)"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + dx - r * 0.25, cy + dy - r * 0.25, r * 0.4, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(120, 150, 90, 0.5)"
    ctx.fill()
  }
}

// ---------- Ocean texture ----------

function drawWaveTexture(
  ctx: CanvasRenderingContext2D,
  isWater: (x: number, y: number) => boolean,
  width: number,
  height: number,
  cellSize: number,
) {
  ctx.strokeStyle = "rgba(220, 235, 235, 0.35)"
  ctx.lineWidth = Math.max(0.6, cellSize * 0.08)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWater(x, y)) continue
      const roll = hashPercent(x, y)
      if (roll >= 40) continue
      const cx = (x + 0.5) * cellSize
      const cy = (y + 0.5) * cellSize + ((roll % 5) - 2) * cellSize * 0.1
      const w = cellSize * 0.7
      ctx.beginPath()
      ctx.moveTo(cx - w / 2, cy)
      ctx.quadraticCurveTo(cx, cy - cellSize * 0.18, cx + w / 2, cy)
      ctx.stroke()
    }
  }
}

function drawWaveTextureHex(
  ctx: CanvasRenderingContext2D,
  isLand: (x: number, y: number) => boolean,
  layout: HexLayout,
  width: number,
  height: number,
) {
  ctx.strokeStyle = "rgba(220, 235, 235, 0.35)"
  ctx.lineWidth = Math.max(0.6, layout.radius * 0.1)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isLand(x, y)) continue
      const roll = hashPercent(x, y)
      if (roll >= 40) continue
      const { cx, cy } = layout.position(x, y)
      const w = layout.radius * 0.9
      ctx.beginPath()
      ctx.moveTo(cx - w / 2, cy)
      ctx.quadraticCurveTo(cx, cy - layout.radius * 0.25, cx + w / 2, cy)
      ctx.stroke()
    }
  }
}

// ---------- Border ----------

function drawBorderFrame(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(70, 55, 35, 0.8)"
  ctx.lineWidth = 3
  ctx.strokeRect(6, 6, VIEWPORT - 12, VIEWPORT - 12)
  ctx.lineWidth = 1
  ctx.strokeRect(BORDER - 4, BORDER - 4, VIEWPORT - (BORDER - 4) * 2, VIEWPORT - (BORDER - 4) * 2)
}
