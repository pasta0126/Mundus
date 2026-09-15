import { useState } from "react"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"

type MapDto = components["schemas"]["Map"]

interface MapParamsPanelProps {
  map: MapDto
}

/**
 * The values that produced the currently viewed window, so they can be
 * copied and pasted back into the Seed/Start Position fields to
 * reproduce this exact view - same seed + coordinate always generates
 * the same terrain.
 */
export function MapParamsPanel({ map }: MapParamsPanelProps) {
  const [copied, setCopied] = useState(false)
  const rows: [string, string][] = [
    ["Seed", map.seed],
    ["Position", `(${map.originX}, ${map.originY})`],
  ]

  async function copySeed() {
    await navigator.clipboard.writeText(map.seed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="w-56 space-y-2">
      <dl className="divide-border divide-y rounded-lg border text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-2 px-3 py-1.5">
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
