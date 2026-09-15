import type { components } from "@/api/schema"

type Biome = components["schemas"]["Biome"]

/**
 * Soft pastel fill per biome, grouped by the elevation/moisture table in
 * design.md. Deliberately spread across distinct hues, not just
 * lightness/saturation steps of the same green - six of the ten biomes
 * are plant-covered land, and a palette that only varied one green's
 * shade made neighboring regions (e.g. Grassland vs. Swamp, Forest vs.
 * Mountains) hard to tell apart at a glance.
 */
export const BIOME_COLORS: Record<Biome, string> = {
  // Water / coast
  Ocean: "#bfe3f0",
  Beach: "#f5e6c8",
  // Lowland (dry -> wet): warm sand -> bright green -> dark olive marsh
  Desert: "#e8c179",
  Grassland: "#b3e089",
  Swamp: "#748a5c",
  // Highland (dry -> wet): cool blue-grey -> mid green -> deep green
  Tundra: "#c3d3d8",
  Forest: "#5fa668",
  Rainforest: "#2f6b4f",
  // Peak (dry/medium -> wet): bare rock -> snowcap
  Mountains: "#a89a8a",
  Snow: "#f7f9fb",
}
