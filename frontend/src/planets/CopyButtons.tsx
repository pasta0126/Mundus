import { Braces, Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type Copied = "seed" | "json" | "failed" | null

/**
 * "Copy seed" puts the name that regenerates this planet or system on the
 * clipboard; "Copy JSON" puts its full description there (for a system: the
 * central bodies, the orbits and every planet), pretty-printed.
 */
export function CopyButtons({ seed, json }: { seed: string; json: unknown }) {
  const [copied, setCopied] = useState<Copied>(null)

  async function copy(kind: "seed" | "json", text: string) {
    let result: Copied = kind
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      result = "failed"
    }
    setCopied(result)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => void copy("seed", seed)} className="flex-1">
          {copied === "seed" ? <Check /> : <Copy />}
          {copied === "seed" ? "Copied!" : "Copy seed"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void copy("json", JSON.stringify(json, null, 2))} className="flex-1">
          {copied === "json" ? <Check /> : <Braces />}
          {copied === "json" ? "Copied!" : "Copy JSON"}
        </Button>
      </div>
      {copied === "failed" && <p className="text-muted-foreground text-center text-xs">Couldn&apos;t copy. Check the browser&apos;s clipboard permission.</p>}
    </div>
  )
}
