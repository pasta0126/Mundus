import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MAX_WINDOW_DIMENSION, ZOOM_LEVELS_PX } from "@/map/constants"
import { MapCanvas } from "@/map/MapCanvas"
import { MapParamsPanel } from "@/map/MapParamsPanel"

type MapDto = components["schemas"]["Map"]
type Phase = "result" | "error"

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** How many cells (per axis) are needed to cover the current viewport at the given cell size, capped at the API's max window dimension. */
function windowSizeForViewport(cellPx: number) {
  const width = Math.min(MAX_WINDOW_DIMENSION, Math.max(1, Math.ceil(window.innerWidth / cellPx)))
  const height = Math.min(MAX_WINDOW_DIMENSION, Math.max(1, Math.ceil(window.innerHeight / cellPx)))
  return { width, height }
}

function App() {
  const [phase, setPhase] = useState<Phase>("result")
  const [map, setMap] = useState<MapDto | null>(null)
  const [seed, setSeed] = useState("")
  const [zoomIndex, setZoomIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  const cellPx = ZOOM_LEVELS_PX[zoomIndex]

  async function fetchWindow(nextSeed: string, x: number, y: number, px: number = cellPx) {
    setLoading(true)
    const { width, height } = windowSizeForViewport(px)
    const { data, error } = await api.GET("/api/Maps", {
      params: { query: { seed: nextSeed, x, y, width, height } },
    })
    setLoading(false)

    if (error !== undefined || !data) {
      // Only the very first generation (no map yet) gets a full error
      // screen - a failed pan/zoom/regenerate/resize re-fetch just
      // leaves the last good map on screen so exploring the world never
      // blanks out.
      if (!map) {
        setErrorMessage("Failed to generate the map. Please try again.")
        setPhase("error")
      }
      return
    }

    setSeed(nextSeed)
    setMap(data)
    setPhase("result")
  }

  // No user input is collected: the first map generates itself, for a
  // fresh random seed centered on (0, 0), the moment the page loads.
  useEffect(() => {
    void fetchWindow(randomSeed(), 0, 0, ZOOM_LEVELS_PX[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function regenerate() {
    setZoomIndex(0)
    void fetchWindow(randomSeed(), 0, 0, ZOOM_LEVELS_PX[0])
  }

  function pan(dx: number, dy: number) {
    if (!map) return
    const stepX = Math.max(1, Math.round(Number(map.width) / 2))
    const stepY = Math.max(1, Math.round(Number(map.height) / 2))
    void fetchWindow(seed, Number(map.originX) + dx * stepX, Number(map.originY) + dy * stepY)
  }

  function zoom(direction: 1 | -1) {
    const nextIndex = Math.min(ZOOM_LEVELS_PX.length - 1, Math.max(0, zoomIndex + direction))
    if (nextIndex === zoomIndex) return
    setZoomIndex(nextIndex)
    if (!map) return

    // Re-center on the same point the current window is centered on, at
    // the new cell size's window dimensions - a zoom, not a pan.
    const nextPx = ZOOM_LEVELS_PX[nextIndex]
    const centerX = Number(map.originX) + Math.floor(Number(map.width) / 2)
    const centerY = Number(map.originY) + Math.floor(Number(map.height) / 2)
    const { width, height } = windowSizeForViewport(nextPx)
    void fetchWindow(seed, centerX - Math.floor(width / 2), centerY - Math.floor(height / 2), nextPx)
  }

  // Re-fetch the same origin at the new viewport-derived window size on
  // resize, so the map keeps covering the full page background. Refs
  // (not state) so the resize listener always reads the latest
  // map/seed/zoom without needing to be torn down and re-added on every
  // fetch.
  const mapRef = useRef(map)
  const seedRef = useRef(seed)
  const cellPxRef = useRef(cellPx)
  useEffect(() => {
    mapRef.current = map
    seedRef.current = seed
    cellPxRef.current = cellPx
  }, [map, seed, cellPx])
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function onResize() {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const current = mapRef.current
        if (!current) return
        void fetchWindow(seedRef.current, Number(current.originX), Number(current.originY), cellPxRef.current)
      }, 200)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      clearTimeout(timeout)
    }
  }, [])

  function downloadMap() {
    if (!canvasEl) return
    canvasEl.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "mundus-map.png"
      link.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {map && <MapCanvas map={map} cellPx={cellPx} onCanvasReady={setCanvasEl} />}

      <AnimatePresence mode="wait">
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex items-center justify-center p-6"
          >
            <div className="bg-card flex flex-col items-center gap-3 rounded-lg border p-6 shadow-lg">
              <p className="text-destructive text-sm">{errorMessage}</p>
              <Button variant="outline" onClick={regenerate}>
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 shadow-lg">
            <p className="text-center text-sm">Loading map…</p>
            <Progress value={60} className="w-full" />
          </div>
        </div>
      )}

      {phase === "result" && map && (
        <>
          <div className="fixed top-4 left-4 z-10 space-y-3">
            <div className="bg-card space-y-3 rounded-lg border p-3 shadow-lg">
              <h1 className="text-lg font-semibold tracking-tight">Mundus</h1>
              <MapParamsPanel map={map} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={regenerate}>
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMap}>
                  Download
                </Button>
              </div>
            </div>
          </div>

          <div className="fixed right-4 bottom-4 z-10 flex items-end gap-3">
            <div className="bg-card flex flex-col gap-1 rounded-lg border p-1 shadow-lg">
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoom(-1)}
                disabled={zoomIndex === 0}
                aria-label="Zoom in"
              >
                <ZoomIn />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoom(1)}
                disabled={zoomIndex === ZOOM_LEVELS_PX.length - 1}
                aria-label="Zoom out"
              >
                <ZoomOut />
              </Button>
            </div>

            <div className="grid grid-cols-3 grid-rows-3 gap-1">
              <div />
              <Button variant="outline" size="icon" className="bg-card shadow-lg" onClick={() => pan(0, -1)} aria-label="Pan north">
                <ArrowUp />
              </Button>
              <div />
              <Button variant="outline" size="icon" className="bg-card shadow-lg" onClick={() => pan(-1, 0)} aria-label="Pan west">
                <ArrowLeft />
              </Button>
              <div />
              <Button variant="outline" size="icon" className="bg-card shadow-lg" onClick={() => pan(1, 0)} aria-label="Pan east">
                <ArrowRight />
              </Button>
              <div />
              <Button variant="outline" size="icon" className="bg-card shadow-lg" onClick={() => pan(0, 1)} aria-label="Pan south">
                <ArrowDown />
              </Button>
              <div />
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default App
