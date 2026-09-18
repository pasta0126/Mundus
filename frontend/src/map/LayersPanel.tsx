import { LAYER_REGISTRY, type LayerDefinition, type LayerId } from "@/map/layers"

interface LayersPanelProps {
  visibility: Record<LayerId, boolean>
  onToggle: (id: LayerId) => void
}

function LayerCheckbox({ layer, checked, onToggle }: { layer: LayerDefinition; checked: boolean; onToggle: (id: LayerId) => void }) {
  return (
    <li>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={() => onToggle(layer.id)} className="accent-primary size-3.5" />
        {layer.label}
      </label>
    </li>
  )
}

/** One checkbox per registered overlay layer, stable layers first and experimental ones (see map/layers.ts) below a divider - see map/layers.ts for the registry each new overlay type appends to. */
export function LayersPanel({ visibility, onToggle }: LayersPanelProps) {
  const stable = LAYER_REGISTRY.filter((layer) => !layer.experimental)
  const experimental = LAYER_REGISTRY.filter((layer) => layer.experimental)

  return (
    <div className="bg-card w-48 space-y-2 rounded-lg border p-3 shadow-lg">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Layers</h2>
      <ul className="space-y-1.5">
        {stable.map((layer) => (
          <LayerCheckbox key={layer.id} layer={layer} checked={visibility[layer.id]} onToggle={onToggle} />
        ))}
      </ul>

      {experimental.length > 0 && (
        <>
          <div className="border-t pt-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Experimental</h3>
          </div>
          <ul className="space-y-1.5">
            {experimental.map((layer) => (
              <LayerCheckbox key={layer.id} layer={layer} checked={visibility[layer.id]} onToggle={onToggle} />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
