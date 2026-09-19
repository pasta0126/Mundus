import { Smartphone, X } from "lucide-react"
import { useState } from "react"

/**
 * True on phones and tablets: the primary input is a touch screen (coarse pointer, no hover).
 * A laptop with a touch screen still has a mouse or trackpad as its primary pointer, so it is left alone.
 */
function isTouchFirstDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(hover: none)").matches
}

/** A small, dismissible heads-up shown above the controls on phones and tablets, where the map's hover-based details and small controls don't work well yet. */
export function MobileNotice() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !isTouchFirstDevice()) return null

  return (
    <div role="note" className="bg-card text-muted-foreground flex max-w-64 items-start gap-2 rounded-lg border p-2.5 text-xs shadow-lg">
      <Smartphone className="mt-0.5 size-3.5 shrink-0" />
      <p className="leading-snug">Mundus isn&apos;t optimized for phones or tablets yet. For the best experience, use a desktop browser.</p>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="hover:text-foreground -mt-0.5 -mr-1 shrink-0 rounded p-0.5">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
