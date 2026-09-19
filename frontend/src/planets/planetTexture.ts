import type { components } from "@/api/schema"

export type PlanetDto = components["schemas"]["Planet"]
type FeatureKind = components["schemas"]["SurfaceFeatureKind"]

const WIDTH = 1024
const HEIGHT = 512

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function hash3(seed: number, x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + seed) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** Smooth 3D value noise in [0, 1). Sampling it on the sphere's surface point keeps the texture seamless. */
function valueNoise(seed: number, x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const fx = x - xi
  const fy = y - yi
  const fz = z - zi
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const w = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c = (dx: number, dy: number, dz: number) => hash3(seed, xi + dx, yi + dy, zi + dz)
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  )
}

function fbm(seed: number, x: number, y: number, z: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let total = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(seed + i * 101, x, y, z) * amp
    total += amp
    x *= 2
    y *= 2
    z *= 2
    amp *= 0.5
  }
  return sum / total
}

type Shape = "blob" | "crater" | "band" | "cap" | "storm"
type Tone = "dark" | "light" | "accent"

const FEATURE_STYLE: Record<FeatureKind, { shape: Shape; tone: Tone }> = {
  Crater: { shape: "crater", tone: "dark" },
  Ridge: { shape: "blob", tone: "dark" },
  Dunes: { shape: "blob", tone: "light" },
  Canyon: { shape: "blob", tone: "dark" },
  Continent: { shape: "blob", tone: "accent" },
  PolarCap: { shape: "cap", tone: "light" },
  Crack: { shape: "blob", tone: "dark" },
  LavaFlow: { shape: "blob", tone: "accent" },
  Volcano: { shape: "crater", tone: "dark" },
  Lake: { shape: "blob", tone: "accent" },
  Band: { shape: "band", tone: "accent" },
  Storm: { shape: "storm", tone: "light" },
}

interface PreparedFeature {
  style: { shape: Shape; tone: Tone }
  lat: number
  lon: number
  dir: Rgb
  radius: number
  size: number
  color: Rgb
}

function prepareFeatures(planet: PlanetDto, palette: Rgb[]): PreparedFeature[] {
  return planet.features.map((f) => {
    const lat = (Number(f.latitudeDegrees) * Math.PI) / 180
    const lon = (Number(f.longitudeDegrees) * Math.PI) / 180
    const size = Number(f.size)
    return {
      style: FEATURE_STYLE[f.kind],
      lat,
      lon,
      dir: [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)],
      radius: size * 1.6,
      size,
      color: palette[Math.min(2, Math.max(0, Number(f.colorIndex)))],
    }
  })
}

function baseColor(
  planet: PlanetDto,
  palette: Rgb[],
  seed: number,
  x: number,
  y: number,
  z: number,
  lat: number,
): Rgb {
  const [p0, p1, p2] = palette
  switch (planet.type) {
    case "GasGiant": {
      const warp = fbm(seed, x * 1.5, y * 3, z * 1.5, 4)
      const band = 0.5 + 0.5 * Math.sin(lat * 9 + warp * 5)
      return mix(mix(p0, p1, band * 0.85), p2, fbm(seed + 7, x * 2, y * 8, z * 2, 3) * 0.35)
    }
    case "Oceanic": {
      const h = fbm(seed, x * 1.6, y * 1.6, z * 1.6, 5)
      const sea = mix(p0, mix(p0, [255, 255, 255], 0.15), h)
      const land = mix(p1, [0, 0, 0], 0.15 + (h - 0.5) * 0.4)
      return mix(sea, land, smoothstep(0.5, 0.54, h))
    }
    case "Lava": {
      const ridge = Math.abs(fbm(seed, x * 2, y * 2, z * 2, 5) - 0.5) * 2
      const glow = 1 - smoothstep(0, 0.14, ridge)
      const rock = mix(p0, [0, 0, 0], fbm(seed + 3, x * 3, y * 3, z * 3, 3) * 0.4)
      return mix(rock, mix(p1, p2, glow), glow)
    }
    case "Ice":
      return mix(mix(p0, p1, fbm(seed, x * 2, y * 2, z * 2, 5) * 1.1), p2, fbm(seed + 9, x * 5, y * 5, z * 5, 2) * 0.3)
    default: {
      const n = fbm(seed, x * 2.2, y * 2.2, z * 2.2, 5)
      return mix(mix(p0, p1, n), p2, smoothstep(0.6, 0.85, fbm(seed + 5, x * 4, y * 4, z * 4, 3)) * 0.4)
    }
  }
}

function applyFeature(
  f: PreparedFeature,
  color: Rgb,
  palette: Rgb[],
  seed: number,
  x: number,
  y: number,
  z: number,
  lat: number,
  lon: number,
): Rgb {
  let alpha = 0
  let rim = 0

  switch (f.style.shape) {
    case "band": {
      const halfWidth = f.size * 0.5
      // The warp below moves the edge by at most 0.06; skip the noise for pixels clearly outside.
      if (Math.abs(lat - f.lat) > halfWidth + 0.07) return color
      const warped = lat + (fbm(seed + 21, x * 3, y * 3, z * 3, 3) - 0.5) * 0.12
      alpha = (1 - smoothstep(0.4, 1, Math.abs(warped - f.lat) / halfWidth)) * 0.55
      break
    }
    case "cap": {
      const sign = Math.sign(f.lat) || 1
      // The noise below moves the edge by at most 0.09; skip pixels clearly outside.
      if (lat * sign < Math.PI / 2 - f.size * 1.1 - 0.1) return color
      const edge = Math.PI / 2 - f.size * 1.1 + (fbm(seed + 31, x * 4, y * 4, z * 4, 3) - 0.5) * 0.18
      alpha = smoothstep(0, 0.08, lat * sign - edge)
      break
    }
    case "storm": {
      let dLon = Math.abs(lon - f.lon)
      if (dLon > Math.PI) dLon = 2 * Math.PI - dLon
      const d = Math.hypot((dLon * Math.cos(lat)) / 1.8, lat - f.lat)
      alpha = smoothstep(0, 0.4, 1 - d / f.radius) * 0.7
      break
    }
    default: {
      const dot = x * f.dir[0] + y * f.dir[1] + z * f.dir[2]
      if (dot < Math.cos(f.radius)) return color
      const w = 1 - Math.acos(Math.min(1, dot)) / f.radius
      const edged = w + (fbm(seed + 41, x * 5, y * 5, z * 5, 3) - 0.5) * 0.5
      alpha = smoothstep(0, 0.35, edged)
      if (f.style.shape === "crater") {
        alpha *= 0.65
        rim = smoothstep(0.02, 0.1, edged) * (1 - smoothstep(0.1, 0.22, edged))
      }
    }
  }

  if (alpha <= 0 && rim <= 0) return color
  const target: Rgb =
    f.style.tone === "dark" ? mix(color, [0, 0, 0], 0.38) : f.style.tone === "light" ? mix(color, palette[2], 0.7) : f.color
  let out = mix(color, target, alpha)
  if (rim > 0) out = mix(out, palette[2], rim * 0.35)
  return out
}

/**
 * Paints the planet's soft equirectangular surface texture from nothing but
 * its description (palette, texture seed, singularities). The backend
 * decides what the planet is; this only draws it.
 */
export function createSurfaceCanvas(planet: PlanetDto, width = WIDTH): HTMLCanvasElement {
  const height = width / 2
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(width, height)

  const palette = planet.palette.map(hexToRgb)
  const seed = Number(planet.textureSeed) | 0
  const features = prepareFeatures(planet, palette)

  for (let py = 0; py < height; py++) {
    const lat = (0.5 - (py + 0.5) / height) * Math.PI
    const cosLat = Math.cos(lat)
    const y = Math.sin(lat)
    for (let px = 0; px < width; px++) {
      const lon = ((px + 0.5) / width - 0.5) * 2 * Math.PI
      const x = cosLat * Math.cos(lon)
      const z = cosLat * Math.sin(lon)

      let color = baseColor(planet, palette, seed, x, y, z, lat)
      for (const f of features) {
        color = applyFeature(f, color, palette, seed, x, y, z, lat, lon)
      }

      const i = (py * width + px) * 4
      image.data[i] = color[0]
      image.data[i + 1] = color[1]
      image.data[i + 2] = color[2]
      image.data[i + 3] = 255
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

/** A transparent white cloud layer; coverage decides how much of the sky is filled. */
export function createCloudCanvas(planet: PlanetDto, coverage: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(WIDTH, HEIGHT)

  const seed = (Number(planet.textureSeed) | 0) + 977
  const stretch = planet.type === "GasGiant" ? 4 : 2.4
  const threshold = 0.62 - coverage * 0.3

  for (let py = 0; py < HEIGHT; py++) {
    const lat = (0.5 - (py + 0.5) / HEIGHT) * Math.PI
    const cosLat = Math.cos(lat)
    const y = Math.sin(lat)
    for (let px = 0; px < WIDTH; px++) {
      const lon = ((px + 0.5) / WIDTH - 0.5) * 2 * Math.PI
      const x = cosLat * Math.cos(lon)
      const z = cosLat * Math.sin(lon)
      const n = fbm(seed, x * 2.4, y * stretch, z * 2.4, 5)
      const i = (py * WIDTH + px) * 4
      image.data[i] = 255
      image.data[i + 1] = 255
      image.data[i + 2] = 255
      image.data[i + 3] = smoothstep(threshold, threshold + 0.15, n) * 235
    }
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}

/** A 1-pixel-tall radial strip for a ring: soft edges and a few dark gaps. */
export function createRingCanvas(color: string, seed: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = 1
  const ctx = canvas.getContext("2d")!
  const image = ctx.createImageData(512, 1)
  const [r, g, b] = hexToRgb(color)

  for (let x = 0; x < 512; x++) {
    const t = x / 511
    const stripes = 0.55 + 0.45 * valueNoise(seed | 0, t * 22, 0.5, 0.5)
    const fade = smoothstep(0, 0.08, t) * (1 - smoothstep(0.92, 1, t))
    image.data[x * 4] = r
    image.data[x * 4 + 1] = g
    image.data[x * 4 + 2] = b
    image.data[x * 4 + 3] = stripes * fade * 220
  }

  ctx.putImageData(image, 0, 0)
  return canvas
}
