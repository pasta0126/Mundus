export type LayerId = "compass" | "regionBorders"

export interface LayerDefinition {
  id: LayerId
  label: string
  defaultVisible: boolean
}

/**
 * Every toggleable overlay layer, in panel-display order. Rivers, each
 * points-of-interest category, and trade routes get appended here once
 * their backends/canvases land - never inserted between existing entries
 * (same frozen-append contract as `Rng.Child`).
 */
export const LAYER_REGISTRY: LayerDefinition[] = [
  { id: "compass", label: "Compass rose", defaultVisible: true },
  { id: "regionBorders", label: "Region borders (Experimental)", defaultVisible: false },
]

export function defaultLayerVisibility(): Record<LayerId, boolean> {
  return Object.fromEntries(LAYER_REGISTRY.map((layer) => [layer.id, layer.defaultVisible])) as Record<
    LayerId,
    boolean
  >
}
