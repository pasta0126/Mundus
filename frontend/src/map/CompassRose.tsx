import { useEffect, useState } from "react"
import { api } from "@/api/client"
import compassIcon from "@/assets/compass.png"

interface CompassRoseProps {
  /** Only the seed matters - the bearing is fixed per seed, independent of pan/zoom/coordinate. */
  seed: string
}

/**
 * Fixed-position overlay showing the seed's north bearing. Refetches only
 * when the seed itself changes, never on pan/zoom/coordinate changes -
 * see openspec/changes/add-map-overlays/specs/compass-rose/spec.md.
 */
export function CompassRose({ seed }: CompassRoseProps) {
  const [bearing, setBearing] = useState<number | null>(null)

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

  if (bearing === null) return null

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-10">
      <img
        src={compassIcon}
        alt="Compass rose"
        className="size-14 drop-shadow-lg"
        style={{ transform: `rotate(${bearing}deg)` }}
      />
    </div>
  )
}
