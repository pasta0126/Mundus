import { BIOME_COLORS } from "@/map/biomeColors"

/** A small swatch + name for every documented biome, in the same dry->wet, lowland->peak order as BIOME_COLORS. */
export function BiomeLegend() {
  return (
    <div className="bg-card w-40 space-y-2 rounded-lg border p-3 shadow-lg">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Legend</h2>
      <ul className="space-y-1.5">
        {Object.entries(BIOME_COLORS).map(([biome, color]) => (
          <li key={biome} className="flex items-center gap-2 text-sm">
            <span className="size-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color }} />
            {biome}
          </li>
        ))}
      </ul>
    </div>
  )
}
