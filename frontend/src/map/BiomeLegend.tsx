import { useEffect, useState } from "react"
import { BIOME_COLORS } from "@/map/biomeColors"
import { loadPoiCatalog, poiIconUrl, type PoiCatalog, type PoiStyle } from "@/map/poi"

interface BiomeLegendProps {
  /** Points-of-interest icon types visible in the current view - listed under the biome swatches, each with what it means. */
  poiTypes?: string[]
  /** The icon style in use, so the legend shows the same artwork as the map. */
  poiStyle: PoiStyle
}

/** A small swatch + name for every documented biome, in the same dry->wet, lowland->peak order as BIOME_COLORS - plus, below, the icons currently on screen. */
export function BiomeLegend({ poiTypes = [], poiStyle }: BiomeLegendProps) {
  const [catalog, setCatalog] = useState<PoiCatalog | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadPoiCatalog().then((loaded) => {
      if (!cancelled) setCatalog(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const icons = poiTypes.flatMap((id) => {
    const entry = catalog?.entries.get(id)
    const url = poiIconUrl(poiStyle, id)
    return entry && url ? [{ ...entry, url }] : []
  })

  return (
    <div className={`bg-card max-h-[calc(100vh-2rem)] space-y-2 overflow-y-auto rounded-lg border p-3 shadow-lg ${icons.length > 0 ? "w-56" : "w-40"}`}>
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Legend</h2>
      <ul className="space-y-1.5">
        {Object.entries(BIOME_COLORS).map(([biome, color]) => (
          <li key={biome} className="flex items-center gap-2 text-sm">
            <span className="size-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />
            {biome}
          </li>
        ))}
      </ul>

      {icons.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Icons in view</h3>
          <ul className="space-y-1.5">
            {icons.map((icon) => (
              <li key={icon.id} className="flex items-center gap-2">
                <img src={icon.url} alt="" className="size-7 shrink-0" />
                <span className="text-sm leading-tight">
                  {icon.label}
                  <span className="text-muted-foreground block text-xs">{icon.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
