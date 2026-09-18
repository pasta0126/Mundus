import { LAYER_REGISTRY, type LayerId } from "@/map/layers"

interface LayersPanelProps {
  visibility: Record<LayerId, boolean>
  onToggle: (id: LayerId) => void
}

/** One checkbox per registered overlay layer - see map/layers.ts for the registry each new overlay type appends to. */
export function LayersPanel({ visibility, onToggle }: LayersPanelProps) {
  return (
    <div className="bg-card w-48 space-y-2 rounded-lg border p-3 shadow-lg">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Layers</h2>
      <ul className="space-y-1.5">
        {LAYER_REGISTRY.map((layer) => (
          <li key={layer.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visibility[layer.id]}
                onChange={() => onToggle(layer.id)}
                className="accent-primary size-3.5"
              />
              {layer.label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
