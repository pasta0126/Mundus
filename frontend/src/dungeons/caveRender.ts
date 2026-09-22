/**
 * Draws a cave-style dungeon's floor and walls as smooth, organic rock
 * instead of a grid of squares. Halls and mazes keep the plain per-cell
 * fill in DungeonCanvas.tsx - this module is only for the `Cave` style.
 *
 * The trick: render the crisp per-cell floor mask, blur it, then re-bucket
 * the blurred value into flat colour bands (floor, a light rim, a dark
 * shadow, plain wall). Blurring rounds every square corner into a curve;
 * bucketing back into flat bands turns the blur's grey gradient into a
 * small number of solid colours, so the result reads as shaded rock
 * rather than a smudge. A mottled texture is then multiplied over the
 * floor area alone.
 */

export const FLOOR = "#d8cdb4"
export const WALL = "#26232e"
const WALL_RIM = "#4a4658"
const WALL_SHADOW = "#171520"

/** Blurred-mask value (0-255) at and above which a pixel counts as floor. */
const FLOOR_LEVEL = 128
/** Values in [RIM_LEVEL, FLOOR_LEVEL) get the light rim - the wall pixels closest to the floor. */
const RIM_LEVEL = 95
/** Values in [SHADOW_LEVEL, RIM_LEVEL) get the dark shadow, just past the rim. Below that is plain wall. */
const SHADOW_LEVEL = 55

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const FLOOR_RGB = hexToRgb(FLOOR)
const WALL_RGB = hexToRgb(WALL)
const RIM_RGB = hexToRgb(WALL_RIM)
const SHADOW_RGB = hexToRgb(WALL_SHADOW)

/**
 * Builds a small tileable canvas: a solid base colour with randomized
 * circular speckles of a given RGB tint and alpha range - a cheap mottled
 * texture usable for stone, foliage, or anything similarly grainy. Callers
 * memoize the result themselves; this is purely decorative and not part of
 * any deterministic generation.
 */
export function makeSpeckleTile(size: number, baseColor: string, speckleRgb: string, alphaMin: number, alphaMax: number, count = 110): HTMLCanvasElement {
  const tile = document.createElement("canvas")
  tile.width = size
  tile.height = size
  const ctx = tile.getContext("2d")!
  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(${speckleRgb}, ${(alphaMin + Math.random() * (alphaMax - alphaMin)).toFixed(3)})`
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  return tile
}

/** A small tileable mottled-stone pattern, built once and reused for every cave's floor. White base: multiplying it onto the flat floor colour below leaves it unchanged, so only the darker speckles drawn on top show through. */
let floorNoiseTile: HTMLCanvasElement | null = null
function getFloorNoiseTile(): HTMLCanvasElement {
  floorNoiseTile ??= makeSpeckleTile(48, "#fff", "0, 0, 0", 0.04, 0.1)
  return floorNoiseTile
}

/**
 * Paints a cave's terrain into `ctx` at its current device-pixel
 * resolution (`deviceW` x `deviceH`), leaving the context's transform as
 * it found it. `cellDevice` is one grid cell's size in that same device-
 * pixel space.
 */
export function paintCaveTerrain(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  cols: number,
  rowCount: number,
  cellDevice: number,
  deviceW: number,
  deviceH: number,
) {
  const mask = document.createElement("canvas")
  mask.width = deviceW
  mask.height = deviceH
  const maskCtx = mask.getContext("2d")!
  maskCtx.fillStyle = "#000"
  maskCtx.fillRect(0, 0, deviceW, deviceH)
  maskCtx.fillStyle = "#fff"
  for (let y = 0; y < rowCount; y++) {
    for (let x = 0; x < cols; x++) {
      if (rows[y][x] === ".") maskCtx.fillRect(x * cellDevice, y * cellDevice, cellDevice, cellDevice)
    }
  }

  const blurred = document.createElement("canvas")
  blurred.width = deviceW
  blurred.height = deviceH
  const blurCtx = blurred.getContext("2d")!
  blurCtx.filter = `blur(${Math.max(1, cellDevice * 0.55)}px)`
  blurCtx.drawImage(mask, 0, 0)
  blurCtx.filter = "none"

  const { data } = blurCtx.getImageData(0, 0, deviceW, deviceH)
  const terrain = blurCtx.createImageData(deviceW, deviceH)
  const floorAlpha = new Uint8ClampedArray(deviceW * deviceH)
  const out = terrain.data
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = data[i] // red channel of the blurred white-on-black mask doubles as its floor-ness
    let rgb: readonly [number, number, number]
    if (v >= FLOOR_LEVEL) {
      rgb = FLOOR_RGB
      floorAlpha[p] = 255
    } else if (v >= RIM_LEVEL) {
      rgb = RIM_RGB
    } else if (v >= SHADOW_LEVEL) {
      rgb = SHADOW_RGB
    } else {
      rgb = WALL_RGB
    }
    out[i] = rgb[0]
    out[i + 1] = rgb[1]
    out[i + 2] = rgb[2]
    out[i + 3] = 255
  }

  const terrainCanvas = document.createElement("canvas")
  terrainCanvas.width = deviceW
  terrainCanvas.height = deviceH
  const terrainCtx = terrainCanvas.getContext("2d")!
  terrainCtx.putImageData(terrain, 0, 0)

  // The floor texture must only show over the floor - build it against a
  // stencil of exactly the floor pixels computed above, then multiply it
  // onto the terrain (its white base leaves non-floor areas untouched).
  const floorStencil = blurCtx.createImageData(deviceW, deviceH)
  for (let p = 0, i = 0; p < floorAlpha.length; p++, i += 4) {
    floorStencil.data[i + 3] = floorAlpha[p]
  }
  const stencilCanvas = document.createElement("canvas")
  stencilCanvas.width = deviceW
  stencilCanvas.height = deviceH
  stencilCanvas.getContext("2d")!.putImageData(floorStencil, 0, 0)

  const noise = document.createElement("canvas")
  noise.width = deviceW
  noise.height = deviceH
  const noiseCtx = noise.getContext("2d")!
  noiseCtx.fillStyle = noiseCtx.createPattern(getFloorNoiseTile(), "repeat")!
  noiseCtx.fillRect(0, 0, deviceW, deviceH)
  noiseCtx.globalCompositeOperation = "destination-in"
  noiseCtx.drawImage(stencilCanvas, 0, 0)

  terrainCtx.globalCompositeOperation = "multiply"
  terrainCtx.drawImage(noise, 0, 0)
  terrainCtx.globalCompositeOperation = "source-over"

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(terrainCanvas, 0, 0)
  ctx.restore()
}
