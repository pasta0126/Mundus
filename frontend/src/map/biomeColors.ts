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
  Ocean: "#c3e4ef",
  Beach: "#f3e6cc",
  // Lowland (dry -> wet): warm sand -> soft green -> muted sage marsh
  Desert: "#e9d3a3",
  Grassland: "#cbe6ac",
  Swamp: "#a9b494",
  // Highland (dry -> wet): cool pale blue-grey -> soft mid green -> deeper soft green
  Tundra: "#d2dfe1",
  Forest: "#96c299",
  Rainforest: "#79a68b",
  // Peak (dry/medium -> wet): soft warm stone -> snowcap
  Mountains: "#bfb2a4",
  Snow: "#f7f9fb",
}
