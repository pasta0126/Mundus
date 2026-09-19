import { Braces, Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

type State = "idle" | "copied" | "failed"

/**
 * A full-width button that copies `text` and says so. It belongs directly
 * below the thing it copies: "seed" under a seed, "specs" (the
 * specifications as pretty-printed JSON, see specs.ts) under them.
 */
export function CopyButton({ kind, text }: { kind: "seed" | "specs"; text: string }) {
  const [state, setState] = useState<State>("idle")

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
    setTimeout(() => setState("idle"), 1500)
  }

  const Icon = state === "copied" ? Check : kind === "seed" ? Copy : Braces
  const label = state === "copied" ? "Copied!" : state === "failed" ? "Couldn't copy" : kind === "seed" ? "Copy seed" : "Copy specs"

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()} className="w-full">
      <Icon />
      {label}
    </Button>
  )
}
