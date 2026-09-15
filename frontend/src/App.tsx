import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, RefreshCw, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CHUNK_CONCURRENCY, CHUNK_SIZE, MAX_TOTAL_DIMENSION, ZOOM_LEVELS_PX } from "@/map/constants"
import { MapCanvas } from "@/map/MapCanvas"
import { MapParamsPanel } from "@/map/MapParamsPanel"
import { computeChunkGrid, runWithConcurrency } from "@/map/tiling"

type MapDto = components["schemas"]["Map"]
type Phase = "result" | "error"

interface ViewWindow {
  seed: string
  originX: number
  originY: number
  width: number
  height: number
  cellPx: number
  generation: number
}

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** How many cells (per axis) are needed to cover the current viewport at the given cell size, capped only by the frontend's generous pathological-case safety net (see MAX_TOTAL_DIMENSION) - the real per-request cap is handled by tiling, not by shrinking this. */
function windowSizeForViewport(cellPx: number) {
  const width = Math.min(MAX_TOTAL_DIMENSION, Math.max(1, Math.ceil(window.innerWidth / cellPx)))
  const height = Math.min(MAX_TOTAL_DIMENSION, Math.max(1, Math.ceil(window.innerHeight / cellPx)))
  return { width, height }
}

/** Default zoom step: start fully zoomed out (the last, smallest cellPx step) so the whole world is visible, then zoom in from there. */
const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS_PX.length - 1

function App() {
  const [phase, setPhase] = useState<Phase>("result")
  const [viewWindow, setViewWindow] = useState<ViewWindow | null>(null)
  const [chunks, setChunks] = useState<MapDto[]>([])
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState("")
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  const generationRef = useRef(0)
  // Whether any view has ever loaded successfully - not component state,
  // since it's read synchronously inside a concurrent chunk-loading loop
  // where a state value could be stale.
  const hasViewRef = useRef(false)

  async function fetchTiled(nextSeed: string, x: number, y: number, px: number) {
    const generation = ++generationRef.current
    const { width, height } = windowSizeForViewport(px)
    const chunkSpecs = computeChunkGrid(x, y, width, height, CHUNK_SIZE)

    setLoading(true)
    setProgress({ loaded: 0, total: chunkSpecs.length })

    let loaded = 0
    let switchedOver = false

    await runWithConcurrency(chunkSpecs, CHUNK_CONCURRENCY, async (spec) => {
      const { data, error } = await api.GET("/api/Maps", {
        params: { query: { seed: nextSeed, x: spec.x, y: spec.y, width: spec.width, height: spec.height } },
      })
      if (generationRef.current !== generation) return // a newer fetch superseded this one - drop it

      if (error !== undefined || !data) return

      if (!switchedOver) {
        // First real data for this generation: swap the view over now,
        // not when the fetch started, so the previous view stays on
        // screen for the entire network-only wait.
        switchedOver = true
        hasViewRef.current = true
        setChunks([data])
        setViewWindow({ seed: nextSeed, originX: x, originY: y, width, height, cellPx: px, generation })
        setPhase("result")
      } else {
        setChunks((prev) => [...prev, data])
      }

      loaded += 1
      setProgress({ loaded, total: chunkSpecs.length })
    })

    if (generationRef.current !== generation) return
    setLoading(false)

    if (!switchedOver && !hasViewRef.current) {
      setErrorMessage("Failed to generate the map. Please try again.")
      setPhase("error")
    }
    // else: either it succeeded, or it failed but a previous view is
    // still showing - nothing more to do either way.
  }

  // No user input is collected: the first map generates itself, for a
  // fresh random seed centered on (0, 0), the moment the page loads.
  useEffect(() => {
    void fetchTiled(randomSeed(), 0, 0, ZOOM_LEVELS_PX[DEFAULT_ZOOM_INDEX])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function regenerate() {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
    void fetchTiled(randomSeed(), 0, 0, ZOOM_LEVELS_PX[DEFAULT_ZOOM_INDEX])
  }

  function pan(dx: number, dy: number) {
    if (!viewWindow) return
    const stepX = Math.max(1, Math.round(viewWindow.width / 2))
    const stepY = Math.max(1, Math.round(viewWindow.height / 2))
    void fetchTiled(viewWindow.seed, viewWindow.originX + dx * stepX, viewWindow.originY + dy * stepY, viewWindow.cellPx)
  }

  /** Jumps straight to a given world coordinate, re-centering the current zoom level's full window on it - a full recalculation of the visible map, not a pan. */
  function goToPosition(x: number, y: number) {
    if (!viewWindow) return
    const { width, height } = windowSizeForViewport(viewWindow.cellPx)
    void fetchTiled(viewWindow.seed, x - Math.floor(width / 2), y - Math.floor(height / 2), viewWindow.cellPx)
  }

  function zoom(direction: 1 | -1) {
    const nextIndex = Math.min(ZOOM_LEVELS_PX.length - 1, Math.max(0, zoomIndex + direction))
    if (nextIndex === zoomIndex) return
    setZoomIndex(nextIndex)
    if (!viewWindow) return

    // Re-center on the same point the current window is centered on, at
    // the new cell size's window dimensions - a zoom, not a pan.
    const nextPx = ZOOM_LEVELS_PX[nextIndex]
    const centerX = viewWindow.originX + Math.floor(viewWindow.width / 2)
    const centerY = viewWindow.originY + Math.floor(viewWindow.height / 2)
    const { width, height } = windowSizeForViewport(nextPx)
    void fetchTiled(viewWindow.seed, centerX - Math.floor(width / 2), centerY - Math.floor(height / 2), nextPx)
  }

  // Re-fetch the same origin at the new viewport-derived window size on
  // resize, so the map keeps covering the full page background. A ref
  // (not state) so the resize listener always reads the latest view
  // without needing to be torn down and re-added on every fetch.
  const viewWindowRef = useRef(viewWindow)
  useEffect(() => {
    viewWindowRef.current = viewWindow
  }, [viewWindow])
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function onResize() {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const current = viewWindowRef.current
        if (!current) return
        void fetchTiled(current.seed, current.originX, current.originY, current.cellPx)
      }, 200)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      clearTimeout(timeout)
    }
  }, [])

  /** e.g. "mundus-6gzdh5ph-x-257-y334-2026年09月15日_18時30分.png" - seed and origin needed to reproduce this exact view, plus a timestamp (Japanese year-month-day order) so repeated downloads don't collide. */
  function downloadFilename(view: ViewWindow): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const timestamp = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日_${pad(now.getHours())}時${pad(now.getMinutes())}分`
    return `mundus-${view.seed}-x${view.originX}-y${view.originY}-${timestamp}.png`
  }

  function downloadMap() {
    if (!canvasEl || !viewWindow) return
    const filename = downloadFilename(viewWindow)
    canvasEl.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }, "image/png")
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      {viewWindow && (
        <MapCanvas
          chunks={chunks}
          originX={viewWindow.originX}
          originY={viewWindow.originY}
          width={viewWindow.width}
          height={viewWindow.height}
          cellPx={viewWindow.cellPx}
          generation={viewWindow.generation}
          onCanvasReady={setCanvasEl}
        />
      )}

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
                <RefreshCw />
                Retry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 shadow-lg">
            <p className="text-center text-sm">
              Loading map{progress.total > 1 ? ` (${progress.loaded}/${progress.total})` : "…"}
            </p>
            <Progress value={progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0} className="w-full" />
          </div>
        </div>
      )}

      {phase === "result" && viewWindow && (
        <>
          <div className="fixed top-4 left-4 z-10 space-y-3">
            <div className="bg-card space-y-3 rounded-lg border p-3 shadow-lg">
              <h1 className="text-lg font-semibold tracking-tight">Mundus</h1>
              <MapParamsPanel seed={viewWindow.seed} originX={viewWindow.originX} originY={viewWindow.originY} onGoTo={goToPosition} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={regenerate} className="flex-1">
                  <RefreshCw />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMap} className="flex-1">
                  <Download />
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
