import * as THREE from "three"
import { type DieFace, type DieKind, type DieShape, orientationForNormal } from "./dieTypes"

const DECAL_SIZE = 128

/**
 * A digit (or short run of digits) on a filled circular chip, with an
 * underline baked under any 6 or 9 so the two can never be confused for
 * one another from any angle. The chip - not just the ink - is what keeps
 * this legible against any base die colour (see palette.ts): at a die's
 * small on-screen size, a thin ink fill's own colour gets blended away by
 * mipmapping well before its outline would, but a solid filled area does
 * not. It's also what makes a d100 pair's dark-tens/light-units shading
 * (see the `dice-roller` spec) read clearly at a glance rather than
 * relying on a thin stroke of ink.
 */
function drawNumeral(ctx: CanvasRenderingContext2D, text: string, ink: string, chip: string) {
  const size = DECAL_SIZE
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = chip
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = `bold ${Math.round(size * 0.56)}px "Geist Variable", sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = ink
  ctx.fillText(text, size / 2, size / 2)

  if (/[69]/.test(text)) {
    const width = ctx.measureText(text).width
    const y = size / 2 + size * 0.29
    ctx.lineWidth = size * 0.045
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.moveTo(size / 2 - width / 2, y)
    ctx.lineTo(size / 2 + width / 2, y)
    ctx.stroke()
  }
}

/** The traditional dot layout for a d6 face, 1 through 6. */
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.28, 0.28],
    [0.5, 0.5],
    [0.72, 0.72],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.5, 0.5],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  6: [
    [0.28, 0.24],
    [0.72, 0.24],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.76],
    [0.72, 0.76],
  ],
}

function drawPips(ctx: CanvasRenderingContext2D, count: number, ink: string) {
  const size = DECAL_SIZE
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = ink
  const r = size * 0.09
  for (const [x, y] of PIP_LAYOUTS[count] ?? []) {
    ctx.beginPath()
    ctx.arc(x * size, y * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** A circle (face, value 1) or a cross (value 0), on the same kind of chip a numeral gets, for the same reason - legible against any base colour the coin is tinted. */
function drawCoinSymbol(ctx: CanvasRenderingContext2D, symbol: "face" | "cross", ink: string, chip: string) {
  const size = DECAL_SIZE
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = chip
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = size * 0.08
  ctx.lineCap = "round"
  if (symbol === "face") {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.06, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const o = size * 0.28
    ctx.beginPath()
    ctx.moveTo(size / 2 - o, size / 2 - o)
    ctx.lineTo(size / 2 + o, size / 2 + o)
    ctx.moveTo(size / 2 + o, size / 2 - o)
    ctx.lineTo(size / 2 - o, size / 2 + o)
    ctx.stroke()
  }
}

function textureFrom(draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = DECAL_SIZE
  canvas.height = DECAL_SIZE
  draw(canvas.getContext("2d")!)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const DECAL_GEOMETRY = new THREE.PlaneGeometry(1, 1)

/** One face's numeral/pip/symbol, as a small transparent plane flush against that face - offset a hair outward along its normal, oriented so the artwork reads right-side-up, and parented under the die's own mesh so it settles and tumbles with it for free. */
function createDecal(face: DieFace, texture: THREE.CanvasTexture, size: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
  const mesh = new THREE.Mesh(DECAL_GEOMETRY, material)
  mesh.scale.setScalar(size)
  mesh.position.copy(face.centroid).addScaledVector(face.normal, 0.01)
  mesh.quaternion.copy(orientationForNormal(face.normal))
  return mesh
}

/**
 * A shade's ink/chip pair: "dark" is a dark chip with light ink (a d100's
 * tens die); "light" is the reverse (everything else, including a d100's
 * units die) - see design.md "Numerals and pips" and the `dice-roller`
 * spec's dark-tens/light-units requirement.
 */
const SHADE = {
  dark: { ink: "#f5f5f5", chip: "#26221f" },
  light: { ink: "#1c1c1c", chip: "#f2ede2" },
}

/** Fixed ink/chip for a d2's symbol and a d6's pips, which have no dark/light-shade distinction of their own. */
const PLAIN_INK = "#1c1c1c"
const PLAIN_CHIP = "#f2ede2"

/**
 * Builds every face's decal for a die of `kind`, from the same `faces` its
 * physics/settle-read already uses. `shade` only matters for a `d10` that's
 * one half of a d100 pair; a standalone d10, and every other numeral die,
 * uses "light" (a light chip, dark ink) like an ordinary inked die.
 */
export function buildDecals(kind: DieKind, shape: DieShape, shade: "dark" | "light" = "light"): THREE.Object3D[] {
  const { ink, chip } = SHADE[shade]
  const decalSize = shape.radius * 0.85

  if (kind === "d2") {
    return shape.faces.map((face) =>
      createDecal(face, textureFrom((ctx) => drawCoinSymbol(ctx, face.value === 1 ? "face" : "cross", PLAIN_INK, PLAIN_CHIP)), decalSize),
    )
  }

  if (kind === "d6") {
    return shape.faces.map((face) => createDecal(face, textureFrom((ctx) => drawPips(ctx, face.value, PLAIN_INK)), decalSize))
  }

  // d4, d8, d10, d12, d20, and either half of a d100 - print the numeral.
  return shape.faces.map((face) => {
    // A d4's numeral sits near the base of its triangular face - the vertex/edge farthest below the face's own centre in local space reads as its "base."
    const isTriangleFace = kind === "d4"
    const anchor = isTriangleFace ? new THREE.Vector3(face.centroid.x, face.centroid.y - decalSize * 0.18, face.centroid.z) : face.centroid
    const positioned: DieFace = { ...face, centroid: anchor }
    return createDecal(positioned, textureFrom((ctx) => drawNumeral(ctx, String(face.value), ink, chip)), decalSize)
  })
}

/**
 * A small tileable "marbled" texture - soft blurred veins over a solid
 * base, in the spirit of `caveRender.ts`'s speckle-tile helper but with
 * smooth blotches instead of hard flecks. Multiplied over a die's base
 * colour so every die reads as stone rather than flat plastic, independent
 * of whatever colour it's tinted (see palette.ts).
 */
let marbleTile: HTMLCanvasElement | null = null
export function getMarbleTile(): HTMLCanvasElement {
  if (marbleTile) return marbleTile
  const size = 128
  const tile = document.createElement("canvas")
  tile.width = size
  tile.height = size
  const ctx = tile.getContext("2d")!
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, size, size)
  ctx.filter = "blur(5px)"
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(0, 0, 0, 0.10)" : "rgba(255, 255, 255, 0.14)"
    ctx.save()
    ctx.translate(Math.random() * size, Math.random() * size)
    ctx.rotate(Math.random() * Math.PI)
    ctx.beginPath()
    ctx.ellipse(0, 0, 8 + Math.random() * 26, 3 + Math.random() * 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.filter = "none"
  marbleTile = tile
  return tile
}
