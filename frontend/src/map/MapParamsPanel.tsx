import { useState } from "react"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"

type MapDto = components["schemas"]["Map"]

interface MapParamsPanelProps {
  map: MapDto
}

/**
 * The values that produced this map, so they can be copied and pasted
 * back into the Seed field to reproduce it exactly - same seed + size
 * always generates the same map.
 */
export function MapParamsPanel({ map }: MapParamsPanelProps) {
  const [copied, setCopied] = useState(false)
  const rows: [string, string][] = [
    ["Seed", map.seed],
    ["Size", map.sizePreset],
  ]

  async function copySeed() {
    await navigator.clipboard.writeText(map.seed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="text-sm font-medium">Used to generate this map</div>
      <dl className="divide-border divide-y rounded-lg border text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-2 px-4 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate font-mono font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      <Button variant="outline" size="sm" onClick={() => void copySeed()} className="w-full">
        {copied ? "Copied!" : "Copy seed"}
      </Button>
    </div>
  )
}
