export type LayerId =
  | "compass"
  | "regionBorders"
  | "poiRelief"
  | "poiNature"
  | "poiSea"
  | "poiSettlements"
  | "poiHeritage"
  | "poiLegends"

export interface LayerDefinition {
  id: LayerId
  label: string
  defaultVisible: boolean
  /** Shown under this heading in the layers panel; layers without one sit at the top. */
  group?: "Points of interest" | "Experimental"
  /** For points-of-interest layers: the backend catalog category (PointOfInterestCatalog.Categories) this toggle controls. */
  poiCategory?: string
}

/**
 * Every toggleable overlay layer, in panel-display order. New layers get
 * appended - never inserted between existing entries (same frozen-append
 * contract as `Rng.Child`).
 */
export const LAYER_REGISTRY: LayerDefinition[] = [
  { id: "compass", label: "Compass rose", defaultVisible: true },
  { id: "poiRelief", label: "Relief & geology", defaultVisible: true, group: "Points of interest", poiCategory: "relief" },
  { id: "poiNature", label: "Nature & wildlife", defaultVisible: true, group: "Points of interest", poiCategory: "nature" },
  { id: "poiSea", label: "Sea & islands", defaultVisible: true, group: "Points of interest", poiCategory: "sea" },
  { id: "poiSettlements", label: "Settlements", defaultVisible: true, group: "Points of interest", poiCategory: "settlements" },
  { id: "poiHeritage", label: "Monuments & ruins", defaultVisible: true, group: "Points of interest", poiCategory: "heritage" },
  { id: "poiLegends", label: "Legends & mysteries", defaultVisible: true, group: "Points of interest", poiCategory: "legends" },
  { id: "regionBorders", label: "Region borders", defaultVisible: false, group: "Experimental" },
]

export function defaultLayerVisibility(): Record<LayerId, boolean> {
  return Object.fromEntries(LAYER_REGISTRY.map((layer) => [layer.id, layer.defaultVisible])) as Record<
    LayerId,
    boolean
  >
}
