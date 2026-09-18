import { useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import compassIcon from "@/assets/compass.png"

export interface CompassInfo {
  bearing: number
  img: HTMLImageElement
}

interface CompassRoseProps {
  /** Only the seed matters - the bearing is fixed per seed, independent of pan/zoom/coordinate. */
  seed: string
  visible: boolean
  /** Reports the rendered compass's bearing and image element, or null while hidden/not yet loaded - lets App.tsx composite it into the downloaded PNG at the exact position/rotation shown on screen. */
  onReady?: (info: CompassInfo | null) => void
}

/**
 * Fixed-position overlay showing the seed's north bearing. Refetches only
 * when the seed itself changes, never on pan/zoom/coordinate changes -
 * see openspec/changes/add-map-overlays/specs/compass-rose/spec.md.
 */
export function CompassRose({ seed, visible, onReady }: CompassRoseProps) {
  const [bearing, setBearing] = useState<number | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    let cancelled = false
    void api.GET("/api/Compass", { params: { query: { seed } } }).then(({ data, error }) => {
      if (cancelled || error !== undefined || !data) return
      setBearing(Number(data.bearingDegrees))
    })
    return () => {
      cancelled = true
    }
  }, [seed])

  useEffect(() => {
    if (!visible || bearing === null || !imgRef.current) {
      onReady?.(null)
      return
    }
    onReady?.({ bearing, img: imgRef.current })
  }, [visible, bearing, onReady])

  if (!visible || bearing === null) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-10">
      <img
        ref={imgRef}
        src={compassIcon}
        alt="Compass rose"
        className="size-14 drop-shadow-lg"
        style={{ transform: `rotate(${bearing}deg)` }}
      />
    </div>
  )
}
