import { LAYER_REGISTRY, type LayerDefinition, type LayerId } from "@/map/layers"
import { POI_STYLES, type PoiStyle } from "@/map/poi"

interface LayersPanelProps {
  visibility: Record<LayerId, boolean>
  onToggle: (id: LayerId) => void
  poiStyle: PoiStyle
  onPoiStyleChange: (style: PoiStyle) => void
}

/** Which artwork set the points-of-interest icons are drawn with. */
function IconStyleSelector({ value, onChange }: { value: PoiStyle; onChange: (style: PoiStyle) => void }) {
  return (
    <div role="radiogroup" aria-label="Icon style" className="bg-muted flex rounded-md p-0.5 text-xs">
      {POI_STYLES.map((style) => (
        <button
          key={style.id}
          type="button"
          role="radio"
          aria-checked={value === style.id}
          onClick={() => onChange(style.id)}
          className={`flex-1 rounded px-2 py-1 transition-colors ${value === style.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {style.label}
        </button>
      ))}
    </div>
  )
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

/** One checkbox per registered overlay layer: ungrouped layers first, then each group (see map/layers.ts) under its own heading, in registry order. */
export function LayersPanel({ visibility, onToggle, poiStyle, onPoiStyleChange }: LayersPanelProps) {
  const ungrouped = LAYER_REGISTRY.filter((layer) => !layer.group)
  const groups = [...new Set(LAYER_REGISTRY.flatMap((layer) => (layer.group ? [layer.group] : [])))]

  return (
    <div className="bg-card w-52 space-y-2 rounded-lg border p-3 shadow-lg">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Layers</h2>
      <ul className="space-y-1.5">
        {ungrouped.map((layer) => (
          <LayerCheckbox key={layer.id} layer={layer} checked={visibility[layer.id]} onToggle={onToggle} />
        ))}
      </ul>

      {groups.map((group) => (
        <div key={group} className="space-y-2 border-t pt-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{group}</h3>
          <ul className="space-y-1.5">
            {LAYER_REGISTRY.filter((layer) => layer.group === group).map((layer) => (
              <LayerCheckbox key={layer.id} layer={layer} checked={visibility[layer.id]} onToggle={onToggle} />
            ))}
          </ul>
          {group === "Points of interest" && <IconStyleSelector value={poiStyle} onChange={onPoiStyleChange} />}
        </div>
      ))}
    </div>
  )
}
