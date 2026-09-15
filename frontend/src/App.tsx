import { AnimatePresence, motion } from "motion/react"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CELL_PX, MAX_WINDOW_DIMENSION } from "@/map/constants"
import { MapCanvas } from "@/map/MapCanvas"
import { MapParamsPanel } from "@/map/MapParamsPanel"
import { MapCreationWizard } from "@/wizard/MapCreationWizard"
import { INITIAL_WIZARD_STATE, type WizardState } from "@/wizard/types"

type MapDto = components["schemas"]["Map"]
type Phase = "wizard" | "result" | "error"

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function parseCoordinate(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === "") return 0
  const n = Number.parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : 0
}

/** How many cells (per axis) are needed to cover the current viewport at CELL_PX each, capped at the API's max window dimension. */
function windowSizeForViewport() {
  const width = Math.min(MAX_WINDOW_DIMENSION, Math.max(1, Math.ceil(window.innerWidth / CELL_PX)))
  const height = Math.min(MAX_WINDOW_DIMENSION, Math.max(1, Math.ceil(window.innerHeight / CELL_PX)))
  return { width, height }
}

function App() {
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_WIZARD_STATE)
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("wizard")
  const [map, setMap] = useState<MapDto | null>(null)
  const [seed, setSeed] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  async function fetchWindow(nextSeed: string, x: number, y: number) {
    setLoading(true)
    const { width, height } = windowSizeForViewport()
    const { data, error } = await api.GET("/api/Maps", {
      params: { query: { seed: nextSeed, x, y, width, height } },
    })
    setLoading(false)

    if (error !== undefined || !data) {
      // Only the very first generation (no map yet) gets a full error
      // screen - a failed pan/regenerate/resize re-fetch just leaves the
      // last good map on screen so exploring the world never blanks out.
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

  function handleConfirm() {
    const nextSeed = wizardState.seed.trim() || randomSeed()
    void fetchWindow(nextSeed, parseCoordinate(wizardState.x), parseCoordinate(wizardState.y))
  }

  function regenerate() {
    void fetchWindow(randomSeed(), 0, 0)
  }

  function restartWizard() {
    setWizardState(INITIAL_WIZARD_STATE)
    setStepIndex(0)
    setPhase("wizard")
  }

  function backToWizardAfterError() {
    setPhase("wizard")
  }

  function pan(dx: number, dy: number) {
    if (!map) return
    const stepX = Math.max(1, Math.round(Number(map.width) / 2))
    const stepY = Math.max(1, Math.round(Number(map.height) / 2))
    void fetchWindow(seed, Number(map.originX) + dx * stepX, Number(map.originY) + dy * stepY)
  }

  // Re-fetch the same origin at the new viewport-derived window size on
  // resize, so the map keeps covering the full page background. Refs
  // (not state) so the resize listener always reads the latest map/seed
  // without needing to be torn down and re-added on every fetch.
  const mapRef = useRef(map)
  const seedRef = useRef(seed)
  useEffect(() => {
    mapRef.current = map
    seedRef.current = seed
  }, [map, seed])
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function onResize() {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const current = mapRef.current
        if (!current) return
        void fetchWindow(seedRef.current, Number(current.originX), Number(current.originY))
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
    <main className="bg-background relative min-h-screen w-full overflow-hidden">
      {map && <MapCanvas map={map} onCanvasReady={setCanvasEl} />}

      <AnimatePresence mode="wait">
        {phase === "wizard" && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex items-center justify-center p-6"
          >
            <div className="bg-card w-full max-w-md space-y-4 rounded-lg border p-6 shadow-lg">
              <h1 className="text-center text-2xl font-semibold tracking-tight">Mundus</h1>
              <MapCreationWizard
                state={wizardState}
                onChange={setWizardState}
                stepIndex={stepIndex}
                onStepIndexChange={setStepIndex}
                onConfirm={handleConfirm}
              />
            </div>
          </motion.div>
        )}

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
              <Button variant="outline" onClick={backToWizardAfterError}>
                Back to wizard
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
                <Button variant="outline" size="sm" onClick={restartWizard}>
                  Restart wizard
                </Button>
                <Button variant="outline" size="sm" onClick={downloadMap}>
                  Download
                </Button>
              </div>
            </div>
          </div>

          <div className="fixed right-4 bottom-4 z-10 grid grid-cols-3 grid-rows-3 gap-1">
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
        </>
      )}
    </main>
  )
}

export default App
