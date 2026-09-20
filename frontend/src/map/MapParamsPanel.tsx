import { Check, Copy, Navigation, Sparkles } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface MapParamsPanelProps {
  seed: string
  originX: number
  originY: number
  /** Jumps the view to a specific world coordinate at the current zoom level. */
  onGoTo: (x: number, y: number) => void
  /** Generates a fresh view from a user-chosen seed, resetting to the origin at the default zoom. */
  onGenerateSeed: (seed: string) => void
}

/**
 * The values that produced the currently viewed window, so they can be
 * copied and pasted back into the Seed/Start Position fields to
 * reproduce this exact view - same seed + coordinate always generates
 * the same terrain. Also lets the user jump straight to any coordinate,
 * or generate a fresh view from their own chosen seed.
 */
export function MapParamsPanel({ seed, originX, originY, onGoTo, onGenerateSeed }: MapParamsPanelProps) {
  const [copied, setCopied] = useState(false)
  const [goToX, setGoToX] = useState("")
  const [goToY, setGoToY] = useState("")
  const [customSeed, setCustomSeed] = useState("")
  const rows: [string, string][] = [
    ["Seed", seed],
    ["Position", `(${originX}, ${originY})`],
  ]

  async function copySeed() {
    await navigator.clipboard.writeText(seed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function submitGoTo(e: FormEvent) {
    e.preventDefault()
    const x = Number.parseInt(goToX, 10)
    const y = Number.parseInt(goToY, 10)
    if (Number.isNaN(x) || Number.isNaN(y)) return
    onGoTo(x, y)
  }

  function submitCustomSeed(e: FormEvent) {
    e.preventDefault()
    if (!customSeed.trim()) return
    onGenerateSeed(customSeed)
    setCustomSeed("")
  }

  return (
    <div className="w-full space-y-2">
      <dl className="divide-border divide-y rounded-lg border text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="flex items-center justify-between gap-2 px-3 py-1.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="truncate font-mono font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      <Button variant="outline" size="sm" onClick={() => void copySeed()} className="w-full">
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied!" : "Copy seed"}
      </Button>

      <form onSubmit={submitCustomSeed} className="space-y-1.5">
        <Input
          type="text"
          placeholder="Custom seed"
          value={customSeed}
          onChange={(e) => setCustomSeed(e.target.value)}
          aria-label="Custom seed"
        />
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <Sparkles />
          Generate from seed
        </Button>
      </form>

      <form onSubmit={submitGoTo} className="space-y-1.5">
        <div className="flex gap-1.5">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="X"
            value={goToX}
            onChange={(e) => setGoToX(e.target.value)}
            aria-label="Go to X coordinate"
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Y"
            value={goToY}
            onChange={(e) => setGoToY(e.target.value)}
            aria-label="Go to Y coordinate"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          <Navigation />
          Go to coordinates
        </Button>
      </form>
    </div>
  )
}
