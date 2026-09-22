import { cn } from "cn"
import { BIOME_COLORS } from "@/map/biomeColors"

/** A small swatch + name for every documented biome, in the same dry->wet, lowland->peak order as BIOME_COLORS. Points-of-interest icons explain themselves on hover instead (see PointsOfInterestLayer). */
export function BiomeLegend({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card max-h-[calc(100dvh-2rem)] w-40 space-y-2 overflow-y-auto rounded-lg border p-3 shadow-lg", className)}>
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
