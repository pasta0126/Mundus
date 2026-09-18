import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Info, Layers, RefreshCw, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { BiomeLegend } from "@/map/BiomeLegend"
import { Button } from "@/components/ui/button"
import { CompassRose, type CompassInfo } from "@/map/CompassRose"
import { defaultLayerVisibility, type LayerId } from "@/map/layers"
import { LayersPanel } from "@/map/LayersPanel"
import { Progress } from "@/components/ui/progress"
import { CHUNK_CONCURRENCY, CHUNK_SIZE, MAX_TOTAL_DIMENSION, ZOOM_LEVELS } from "@/map/constants"
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
  step: number
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

/** Default zoom step: index 2 - displayed as "3" on the zoom indicator (see ZOOM_LEVELS). */
const DEFAULT_ZOOM_INDEX = 2

function App() {
  const [phase, setPhase] = useState<Phase>("result")
  const [viewWindow, setViewWindow] = useState<ViewWindow | null>(null)
  const [chunks, setChunks] = useState<MapDto[]>([])
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [errorMessage, setErrorMessage] = useState("")
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)
  const [showLegend, setShowLegend] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [layerVisibility, setLayerVisibility] = useState<Record<LayerId, boolean>>(defaultLayerVisibility)
  const [compassInfo, setCompassInfo] = useState<CompassInfo | null>(null)

  function toggleLayer(id: LayerId) {
    setLayerVisibility((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const generationRef = useRef(0)
  // Whether any view has ever loaded successfully - not component state,
  // since it's read synchronously inside a concurrent chunk-loading loop
  // where a state value could be stale.
  const hasViewRef = useRef(false)

  async function fetchTiled(nextSeed: string, x: number, y: number, px: number, step: number) {
    const generation = ++generationRef.current
    const { width, height } = windowSizeForViewport(px)
    const chunkSpecs = computeChunkGrid(x, y, width, height, CHUNK_SIZE, step)

    setLoading(true)
    setProgress({ loaded: 0, total: chunkSpecs.length })

    let loaded = 0
    let switchedOver = false

    await runWithConcurrency(chunkSpecs, CHUNK_CONCURRENCY, async (spec) => {
      const { data, error } = await api.GET("/api/Maps", {
        params: { query: { seed: nextSeed, x: spec.x, y: spec.y, width: spec.width, height: spec.height, step: spec.step } },
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
        setViewWindow({ seed: nextSeed, originX: x, originY: y, width, height, cellPx: px, step, generation })
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
    const { cellPx, step } = ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]
    void fetchTiled(randomSeed(), 0, 0, cellPx, step)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function regenerate() {
    setZoomIndex(DEFAULT_ZOOM_INDEX)
    const { cellPx, step } = ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]
    void fetchTiled(randomSeed(), 0, 0, cellPx, step)
  }

  /** Generates a fresh view from a user-chosen seed instead of a random one - same reset-to-origin/default-zoom behavior as Regenerate. */
  function generateFromSeed(seed: string) {
    const trimmed = seed.trim()
    if (!trimmed) return
    setZoomIndex(DEFAULT_ZOOM_INDEX)
    const { cellPx, step } = ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]
    void fetchTiled(trimmed, 0, 0, cellPx, step)
  }

  function pan(dx: number, dy: number) {
    if (!viewWindow) return
    // Half the current window, in *world* units - the window's width/
    // height are sample counts, so this must scale by `step` too, or
    // panning at a wide-stride zoom level would barely move at all.
    const stepX = Math.max(1, Math.round(viewWindow.width / 2)) * viewWindow.step
    const stepY = Math.max(1, Math.round(viewWindow.height / 2)) * viewWindow.step
    void fetchTiled(
      viewWindow.seed,
      viewWindow.originX + dx * stepX,
      viewWindow.originY + dy * stepY,
      viewWindow.cellPx,
      viewWindow.step,
    )
  }

  /** Jumps straight to a given world coordinate, re-centering the current zoom level's full window on it - a full recalculation of the visible map, not a pan. */
  function goToPosition(x: number, y: number) {
    if (!viewWindow) return
    const { width, height } = windowSizeForViewport(viewWindow.cellPx)
    void fetchTiled(
      viewWindow.seed,
      x - Math.floor(width / 2) * viewWindow.step,
      y - Math.floor(height / 2) * viewWindow.step,
      viewWindow.cellPx,
      viewWindow.step,
    )
  }

  function zoom(direction: 1 | -1) {
    const nextIndex = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, zoomIndex + direction))
    if (nextIndex === zoomIndex) return
    setZoomIndex(nextIndex)
    if (!viewWindow) return

    // Re-center on the same point the current window is centered on, at
    // the new cell size/step's window dimensions - a zoom, not a pan.
    const { cellPx: nextPx, step: nextStep } = ZOOM_LEVELS[nextIndex]
    const centerX = viewWindow.originX + Math.floor(viewWindow.width / 2) * viewWindow.step
    const centerY = viewWindow.originY + Math.floor(viewWindow.height / 2) * viewWindow.step
    const { width, height } = windowSizeForViewport(nextPx)
    void fetchTiled(
      viewWindow.seed,
      centerX - Math.floor(width / 2) * nextStep,
      centerY - Math.floor(height / 2) * nextStep,
      nextPx,
      nextStep,
    )
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
        void fetchTiled(current.seed, current.originX, current.originY, current.cellPx, current.step)
      }, 200)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      clearTimeout(timeout)
    }
  }, [])

  /** e.g. "mundus-6gzdh5ph-x-257-y334-20260915_183042.png" - seed and origin needed to reproduce this exact view, plus a timestamp (Japanese YYYYMMDD_HHmmss convention) so repeated downloads don't collide. */
  function downloadFilename(view: ViewWindow): string {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    return `mundus-${view.seed}-x${view.originX}-y${view.originY}-${timestamp}.png`
  }

  /**
   * Composites the biome canvas plus every currently-visible overlay onto
   * one offscreen canvas before exporting - a hidden layer is simply never
   * drawn onto it. The compass is a fixed-position screen icon (not a
   * world-space canvas like future rivers/borders/routes), so it's
   * redrawn here at its on-screen rect and rotation rather than composited
   * via drawImage(canvasEl, ...) like a peer canvas would be.
   */
  function downloadMap() {
    if (!canvasEl || !viewWindow) return
    const filename = downloadFilename(viewWindow)

    const composite = document.createElement("canvas")
    composite.width = canvasEl.width
    composite.height = canvasEl.height
    const ctx = composite.getContext("2d")
    if (!ctx) return
    ctx.drawImage(canvasEl, 0, 0)

    if (layerVisibility.compass && compassInfo) {
      const dpr = window.devicePixelRatio || 1
      const rect = compassInfo.img.getBoundingClientRect()
      ctx.save()
      ctx.translate((rect.left + rect.width / 2) * dpr, (rect.top + rect.height / 2) * dpr)
      ctx.rotate((compassInfo.bearing * Math.PI) / 180)
      ctx.drawImage(compassInfo.img, (-rect.width / 2) * dpr, (-rect.height / 2) * dpr, rect.width * dpr, rect.height * dpr)
      ctx.restore()
    }

    composite.toBlob((blob) => {
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
          step={viewWindow.step}
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
          <CompassRose seed={viewWindow.seed} visible={layerVisibility.compass} onReady={setCompassInfo} />

          <div className="fixed top-4 left-4 z-10 flex items-start gap-3">
            <div className="bg-card space-y-3 rounded-lg border p-3 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-semibold tracking-tight">
                  <button
                    type="button"
                    onClick={regenerate}
                    className="flex items-center gap-2 hover:opacity-80"
                    aria-label="Back to home"
                  >
                    <img src={mundusIcon} alt="" className="size-6" />
                    Mundus
                  </button>
                </h1>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowLayers((v) => !v)}
                    aria-label="Toggle layers panel"
                    aria-expanded={showLayers}
                  >
                    <Layers />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowLegend((v) => !v)}
                    aria-label="Toggle terrain legend"
                    aria-expanded={showLegend}
                  >
                    <Info />
                  </Button>
                  <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
                </div>
              </div>
              <MapParamsPanel
                seed={viewWindow.seed}
                originX={viewWindow.originX}
                originY={viewWindow.originY}
                onGoTo={goToPosition}
                onGenerateSeed={generateFromSeed}
              />
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
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {showLayers && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <LayersPanel visibility={layerVisibility} onToggle={toggleLayer} />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showLegend && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <BiomeLegend />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="fixed right-4 bottom-4 z-10 flex items-end gap-3">
            <div className="bg-card flex flex-col items-center gap-1 rounded-lg border p-1 shadow-lg">
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoom(-1)}
                disabled={zoomIndex === 0}
                aria-label="Zoom in"
              >
                <ZoomIn />
              </Button>
              {/* Plain zoom step number, 1-indexed - matches zoomIndex's own order directly (1 = most zoomed in, ZOOM_LEVELS.length = most zoomed out). Deliberately not a multiplier/"xN" label. */}
              <span
                className="text-muted-foreground select-none font-mono text-[10px]"
                aria-label={`Zoom level ${zoomIndex + 1} of ${ZOOM_LEVELS.length}`}
              >
                {zoomIndex + 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => zoom(1)}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
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
