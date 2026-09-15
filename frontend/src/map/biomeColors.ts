import type { components } from "@/api/schema"

type Biome = components["schemas"]["Biome"]

/** Soft pastel fill per biome, grouped by the elevation/moisture table in design.md. */
export const BIOME_COLORS: Record<Biome, string> = {
  // Water / coast
  Ocean: "#bfe3f0",
  Beach: "#f5e6c8",
  // Lowland (dry -> wet)
  Desert: "#eddca3",
  Grassland: "#d3eac0",
  Swamp: "#b9c9a0",
  // Highland (dry -> wet)
  Tundra: "#dce3db",
  Forest: "#a9cfa0",
  Rainforest: "#7fb894",
  // Peak (dry/medium -> wet)
  Mountains: "#c9c2b8",
  Snow: "#f7f9fb",
}
