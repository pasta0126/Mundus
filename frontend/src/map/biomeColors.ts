import type { components } from "@/api/schema"

type Biome = components["schemas"]["Biome"]

// Fixed, recognizable colors per biome - not a generic categorical
// palette. Players expect blue ocean, green forest, tan desert, etc.
export const BIOME_COLORS: Record<Biome, [number, number, number]> = {
  Ocean: [30, 95, 140],
  Forest: [47, 107, 58],
  Desert: [217, 180, 106],
  Tundra: [201, 214, 214],
  Grassland: [139, 176, 74],
  Swamp: [77, 91, 58],
  Mountains: [122, 118, 113],
}

/** Elevation-shaded RGB CSS color for a biome, e.g. "rgb(90 143 175)". */
export function biomeColor(biome: Biome, elevation: number): string {
  const [r, g, b] = BIOME_COLORS[biome]
  const factor = 0.6 + 0.4 * Math.max(0, Math.min(1, elevation))
  return `rgb(${Math.round(r * factor)} ${Math.round(g * factor)} ${Math.round(b * factor)})`
}
