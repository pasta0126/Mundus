import * as THREE from "three"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { type DieFace, type DieKind, type DieShape, orientationForNormal } from "./dieTypes"

const DECAL_SIZE = 256

/**
 * A digit (or short run of digits), with an underline baked under any 6 or
 * 9 so the two can never be confused for one another from any angle. Ink
 * sits directly on a transparent canvas - no background chip - so legibility
 * against any base die colour (see palette.ts) instead comes from this
 * canvas's own resolution and the on-die size the decal is rendered at
 * (both raised - see design.md), which is enough for the ink's own shape to
 * survive mipmapping at a die's small on-screen size.
 */
function drawNumeral(ctx: CanvasRenderingContext2D, text: string, ink: string) {
  const size = DECAL_SIZE
  ctx.clearRect(0, 0, size, size)

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

/** The Mundus icon, drawn centred on a transparent canvas - used in place of a single pip on a d6's "1" face. */
function drawMundusIcon(ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  const size = DECAL_SIZE
  ctx.clearRect(0, 0, size, size)
  const w = size * 0.72
  const h = w * (image.naturalHeight / image.naturalWidth || 1)
  ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h)
}

let mundusIconImage: HTMLImageElement | null = null
/** Lazily loads the Mundus icon once, shared by every d6 decal that needs it. */
function getMundusIconImage(): HTMLImageElement {
  if (!mundusIconImage) {
    mundusIconImage = new Image()
    mundusIconImage.src = mundusIcon
  }
  return mundusIconImage
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

/** A `textureFrom` canvas/texture pair the caller can redraw later (used for the Mundus icon, which may still be loading when the decal is first built). */
function mutableTexture(): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const canvas = document.createElement("canvas")
  canvas.width = DECAL_SIZE
  canvas.height = DECAL_SIZE
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { canvas, texture }
}

const DECAL_GEOMETRY = new THREE.PlaneGeometry(1, 1)

/** One face's numeral/pip/icon, as a small transparent plane flush against that face - offset a hair outward along its normal, oriented so the artwork reads right-side-up, and parented under the die's own mesh so it settles and tumbles with it for free. */
function createDecal(face: DieFace, texture: THREE.CanvasTexture, size: number): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
  const mesh = new THREE.Mesh(DECAL_GEOMETRY, material)
  mesh.scale.setScalar(size)
  mesh.position.copy(face.centroid).addScaledVector(face.normal, 0.01)
  mesh.quaternion.copy(orientationForNormal(face.normal))
  return mesh
}

/** The signed angle to rotate `from` by, around `axis`, to reach `to` - both assumed already tangent to a plane perpendicular to `axis`. */
function signedAngleAround(axis: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3): number {
  const cross = new THREE.Vector3().crossVectors(from, to)
  const sign = cross.dot(axis) < 0 ? -1 : 1
  return Math.atan2(cross.length() * sign, from.dot(to))
}

/**
 * A face's numeral offset toward one of its three corners and rotated to
 * match - a d4's look on a real die, where every corner shared with a
 * neighbouring face carries a numeral upright from that corner. `angle`
 * spins both the numeral and the direction it's offset toward around the
 * face's own normal.
 */
function createCornerDecal(face: DieFace, texture: THREE.CanvasTexture, size: number, angle: number): THREE.Mesh {
  const baseQuat = orientationForNormal(face.normal)
  const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle)
  const quat = baseQuat.clone().multiply(spin)
  const outward = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
  const mesh = new THREE.Mesh(DECAL_GEOMETRY, material)
  mesh.scale.setScalar(size)
  mesh.position
    .copy(face.centroid)
    .addScaledVector(outward, size * 0.9)
    .addScaledVector(face.normal, 0.01)
  mesh.quaternion.copy(quat)
  return mesh
}

/**
 * A shade's ink colour: "dark" is light ink on a die meant to read dark (a
 * d100's tens die); "light" is dark ink (everything else, including a
 * d100's units die) - see design.md "Numerals and pips" and the
 * `dice-roller` spec's dark-tens/light-units requirement.
 */
const SHADE = {
  dark: { ink: "#f5f5f5" },
  light: { ink: "#1c1c1c" },
}

/** Fixed ink for a d6's pips, which has no dark/light-shade distinction of its own. */
const PLAIN_INK = "#1c1c1c"

/** A kind whose numeral ink is fixed regardless of shade - a d4 and d12 always print white, since both keep a dark base colour where dark ink would be unreadable. */
const FIXED_INK: Partial<Record<DieKind, string>> = {
  d4: "#ffffff",
  d12: "#ffffff",
}

/**
 * Builds every face's decal for a die of `kind`, from the same `faces` its
 * physics/settle-read already uses. `shade` only matters for a `d10` that's
 * one half of a d100 pair; a standalone d10, and every other numeral die,
 * uses "light" (dark ink) like an ordinary inked die.
 */
export function buildDecals(kind: DieKind, shape: DieShape, shade: "dark" | "light" = "light"): THREE.Object3D[] {
  const ink = FIXED_INK[kind] ?? SHADE[shade].ink

  if (kind === "d6") {
    // The truncated-edge cube's flat face area is smaller than its full
    // side (the chamfer eats into it), so this sits well inside `radius`.
    const decalSize = shape.radius * 0.62
    return shape.faces.map((face) => {
      if (face.value === 1) {
        const { canvas, texture } = mutableTexture()
        const image = getMundusIconImage()
        const redraw = () => {
          const ctx = canvas.getContext("2d")!
          drawMundusIcon(ctx, image)
          texture.needsUpdate = true
        }
        if (image.complete && image.naturalWidth > 0) redraw()
        else image.addEventListener("load", redraw, { once: true })
        return createDecal(face, texture, decalSize)
      }
      return createDecal(face, textureFrom((ctx) => drawPips(ctx, face.value, PLAIN_INK)), decalSize)
    })
  }

  if (kind === "d4") {
    // Read the traditional d4 way: by the top-pointing *vertex*, not a face
    // (see dieTypes.ts buildD4). Each face prints its 3 corners' actual
    // vertex values - not 3 copies of its own value - so whichever vertex
    // ends up on top shows the same number on all 3 faces meeting there.
    const decalSize = shape.radius * 0.46
    return shape.faces.flatMap((face) => {
      const defaultUp = new THREE.Vector3(0, 1, 0).applyQuaternion(orientationForNormal(face.normal))
      return (face.corners ?? []).map((corner) => {
        const direction = corner.position.clone().sub(face.centroid).normalize()
        const angle = signedAngleAround(face.normal, defaultUp, direction)
        const texture = textureFrom((ctx) => drawNumeral(ctx, String(corner.value), ink))
        return createCornerDecal(face, texture, decalSize, angle)
      })
    })
  }

  // d8, d10, d12, d20, and either half of a d100 - print the numeral centred on each face.
  const decalSize = kind === "d20" ? shape.radius * 0.6 : kind === "d10" ? shape.radius * 0.62 : shape.radius * 0.9
  return shape.faces.map((face) => createDecal(face, textureFrom((ctx) => drawNumeral(ctx, String(face.value), ink)), decalSize))
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
