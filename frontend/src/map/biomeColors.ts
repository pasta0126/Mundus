import type { components } from "@/api/schema"

type Biome = components["schemas"]["Biome"]

// Warm, parchment-map-like tones (muted, not saturated) - see this
// change's design.md. Players expect blue ocean, green forest, tan
// desert, etc., but toned down to read as an illustrated map rather
// than a data grid.
export const BIOME_COLORS: Record<Biome, [number, number, number]> = {
  Ocean: [58, 96, 110],
  Forest: [79, 102, 63],
  Desert: [200, 173, 116],
  Tundra: [188, 190, 163],
  Grassland: [163, 168, 106],
  Swamp: [91, 90, 58],
  Mountains: [138, 122, 99],
}

/** Elevation-shaded RGB CSS color for a biome, e.g. "rgb(90 143 175)". */
export function biomeColor(biome: Biome, elevation: number): string {
  const [r, g, b] = BIOME_COLORS[biome]
  const factor = 0.6 + 0.4 * Math.max(0, Math.min(1, elevation))
  return `rgb(${Math.round(r * factor)} ${Math.round(g * factor)} ${Math.round(b * factor)})`
}
