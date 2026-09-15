import type { components } from "@/api/schema"

type Biome = components["schemas"]["Biome"]

/** Soft pastel fill per biome band, low terrain value to high - see design.md. */
export const BIOME_COLORS: Record<Biome, string> = {
  Ocean: "#bfe3f0",
  Beach: "#f5e6c8",
  Grassland: "#d3eac0",
  Forest: "#a9cfa0",
  Tundra: "#dce3db",
  Snow: "#f7f9fb",
}
