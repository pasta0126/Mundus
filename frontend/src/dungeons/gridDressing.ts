/**
 * Draws the halls and maze dungeon styles with their own finish instead of
 * the plain flat fill - a carved-stone look for halls, a hedge look for
 * mazes - while staying on the square grid: no organic contours here, that
 * is `caveRender.ts`'s job for the `Cave` style alone.
 *
 * Both painters draw directly at the canvas's existing CSS-pixel transform
 * (unlike `caveRender.ts`, which works in device pixels to size its blur):
 * there is no blur pass to size, since blurring is exactly what would round
 * the corners a hall or a hedge maze needs to keep square.
 */

import { FLOOR, makeSpeckleTile, WALL } from "@/dungeons/caveRender"

const WALL_RIM = "#4a4658"
const WALL_SHADOW = "#171520"
const JOINT = "rgba(0, 0, 0, 0.18)"

/** Below this cell size (in CSS px) the bevel and joint strokes are skipped in favour of the flat fill - they'd just be noise at that scale. */
const MIN_DETAIL_CELL = 6

const HEDGE_BASE = "#2f5233"
const PATH = FLOOR

function isFloor(rows: readonly string[], cols: number, rowCount: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < cols && y < rowCount && rows[y][x] === "."
}

/** A cheap, deterministic 0..1 hash of a cell coordinate - stable across renders, unlike `Math.random`, so the same dungeon always paints the same flagstone variation. */
function cellHash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967295
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const FLOOR_RGB = hexToRgb(FLOOR)

/** `FLOOR_RGB` scaled by `factor` (clamped to a valid channel range), as a CSS colour. */
function shadeFloor(factor: number): string {
  const [r, g, b] = FLOOR_RGB.map((v) => Math.max(0, Math.min(255, Math.round(v * factor))))
  return `rgb(${r}, ${g}, ${b})`
}

const DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** Paints a halls dungeon as carved stone: flagstones with a little per-tile shade variance, a mortar joint between floor tiles, and a lit rim + dark shadow where floor meets a wall. Corners stay exactly square. */
export function paintHallsTerrain(ctx: CanvasRenderingContext2D, rows: readonly string[], cols: number, rowCount: number, cell: number) {
  ctx.fillStyle = WALL
  ctx.fillRect(0, 0, cols * cell, rowCount * cell)

  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isFloor(rows, cols, rowCount, x, y)) continue
      // +-8% per-tile shade so flagstones don't read as one flat slab.
      ctx.fillStyle = shadeFloor(0.92 + cellHash(x, y) * 0.16)
      ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }

  if (cell < MIN_DETAIL_CELL) return

  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isFloor(rows, cols, rowCount, x, y)) continue

      // Joint lines: only toward the right/down neighbour, so each shared edge is drawn once.
      if (isFloor(rows, cols, rowCount, x + 1, y)) {
        ctx.fillStyle = JOINT
        ctx.fillRect((x + 1) * cell, y * cell, 1, cell)
      }
      if (isFloor(rows, cols, rowCount, x, y + 1)) {
        ctx.fillStyle = JOINT
        ctx.fillRect(x * cell, (y + 1) * cell, cell, 1)
      }

      // Wall bevel: a lit rim right at the boundary, a darker shadow just past it, both on the wall side.
      for (const [dx, dy] of DIRECTIONS) {
        if (isFloor(rows, cols, rowCount, x + dx, y + dy)) continue
        if (dx === 1) {
          ctx.fillStyle = WALL_RIM
          ctx.fillRect((x + 1) * cell, y * cell, 1, cell)
          ctx.fillStyle = WALL_SHADOW
          ctx.fillRect((x + 1) * cell + 1, y * cell, 1, cell)
        } else if (dx === -1) {
          ctx.fillStyle = WALL_RIM
          ctx.fillRect(x * cell - 1, y * cell, 1, cell)
          ctx.fillStyle = WALL_SHADOW
          ctx.fillRect(x * cell - 2, y * cell, 1, cell)
        } else if (dy === 1) {
          ctx.fillStyle = WALL_RIM
          ctx.fillRect(x * cell, (y + 1) * cell, cell, 1)
          ctx.fillStyle = WALL_SHADOW
          ctx.fillRect(x * cell, (y + 1) * cell + 1, cell, 1)
        } else {
          ctx.fillStyle = WALL_RIM
          ctx.fillRect(x * cell, y * cell - 1, cell, 1)
          ctx.fillStyle = WALL_SHADOW
          ctx.fillRect(x * cell, y * cell - 2, cell, 1)
        }
      }
    }
  }
}

/** A small tileable hedge pattern - a dark green base with lighter/darker leaf speckles - built once and reused for every maze's walls. */
let hedgeTile: HTMLCanvasElement | null = null
function getHedgeTile(): HTMLCanvasElement {
  if (hedgeTile) return hedgeTile
  const tile = makeSpeckleTile(40, HEDGE_BASE, "20, 74, 30", 0.15, 0.35)
  const ctx = tile.getContext("2d")!
  // A second, lighter speckle pass reads as sunlit leaves against the darker base and the first pass's shadowed ones.
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(120, 160, 90, ${(0.08 + Math.random() * 0.12).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(Math.random() * tile.width, Math.random() * tile.height, 1 + Math.random() * 2, 0, Math.PI * 2)
    ctx.fill()
  }
  hedgeTile = tile
  return tile
}

/** Paints a maze dungeon with its walls (the hedge) given a leafy shrub texture, and its path kept as a plain, flat fill so the one true route stays easy to trace. */
export function paintMazeTerrain(ctx: CanvasRenderingContext2D, rows: readonly string[], cols: number, rowCount: number, cell: number) {
  const cssW = cols * cell
  const cssH = rowCount * cell
  ctx.fillStyle = ctx.createPattern(getHedgeTile(), "repeat")!
  ctx.fillRect(0, 0, cssW, cssH)

  ctx.fillStyle = PATH
  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < cols; x++) {
      if (rows[y][x] === ".") ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  }
}
