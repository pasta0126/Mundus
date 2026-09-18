export type LayerId = "compass" | "regionBorders"

export interface LayerDefinition {
  id: LayerId
  label: string
  defaultVisible: boolean
  /** Shown under a separate "Experimental" heading in the layers panel - not yet tuned/validated enough to be a fully-supported layer. */
  experimental?: boolean
}

/**
 * Every toggleable overlay layer, in panel-display order. Each POI
 * category gets appended here once its backend/canvas lands - never
 * inserted between existing entries (same frozen-append contract as
 * `Rng.Child`).
 */
export const LAYER_REGISTRY: LayerDefinition[] = [
  { id: "compass", label: "Compass rose", defaultVisible: true },
  { id: "regionBorders", label: "Region borders", defaultVisible: false, experimental: true },
]

export function defaultLayerVisibility(): Record<LayerId, boolean> {
  return Object.fromEntries(LAYER_REGISTRY.map((layer) => [layer.id, layer.defaultVisible])) as Record<
    LayerId,
    boolean
  >
}
