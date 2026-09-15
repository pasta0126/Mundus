import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MapCanvas } from "@/map/MapCanvas"
import { MapCreationWizard } from "@/wizard/MapCreationWizard"
import { INITIAL_WIZARD_STATE, type WizardState } from "@/wizard/types"

type MapDto = components["schemas"]["Map"]
type ViewState =
  | { kind: "wizard" }
  | { kind: "generating" }
  | { kind: "rendering"; map: MapDto }
  | { kind: "error"; message: string }
  | { kind: "result"; map: MapDto }

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function App() {
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_WIZARD_STATE)
  const [stepIndex, setStepIndex] = useState(0)
  const [view, setView] = useState<ViewState>({ kind: "wizard" })
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null)

  async function generate(gridType: WizardState["gridType"], sizePreset: WizardState["sizePreset"], seed: string) {
    if (!gridType || !sizePreset) return

    setView({ kind: "generating" })
    const { data, error } = await api.GET("/api/Maps", {
      params: { query: { seed, gridType, sizePreset } },
    })

    if (error !== undefined || !data) {
      setView({ kind: "error", message: "Failed to generate the map. Please try again." })
      return
    }

    // Brief "rendering" status so contour extraction (synchronous, can
    // take a moment on Huge maps) always shows feedback instead of the
    // UI appearing to freeze - see design.md ("Progress/status feedback").
    setView({ kind: "rendering", map: data })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setView({ kind: "result", map: data }))
    })
  }

  function handleConfirm() {
    const seed = wizardState.seed.trim() || randomSeed()
    void generate(wizardState.gridType, wizardState.sizePreset, seed)
  }

  function regenerate() {
    void generate(wizardState.gridType, wizardState.sizePreset, randomSeed())
  }

  function restartWizard() {
    setWizardState(INITIAL_WIZARD_STATE)
    setStepIndex(0)
    setView({ kind: "wizard" })
  }

  function backToWizardAfterError() {
    setView({ kind: "wizard" })
  }

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
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Mundus</h1>

      <AnimatePresence mode="wait">
        {view.kind === "wizard" && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full justify-center"
          >
            <MapCreationWizard
              state={wizardState}
              onChange={setWizardState}
              stepIndex={stepIndex}
              onStepIndexChange={setStepIndex}
              onConfirm={handleConfirm}
            />
          </motion.div>
        )}

        {view.kind === "generating" && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex w-full max-w-sm flex-col items-center gap-3"
          >
            <p className="text-sm">Generating your map…</p>
            <Progress value={60} className="w-full" />
          </motion.div>
        )}

        {(view.kind === "rendering" || view.kind === "result") && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-3"
          >
            {view.kind === "rendering" && (
              <div className="flex w-full max-w-sm flex-col items-center gap-3">
                <p className="text-sm">Rendering map…</p>
                <Progress value={90} className="w-full" />
              </div>
            )}
            <div className={view.kind === "rendering" ? "hidden" : "contents"}>
              <MapCanvas map={view.map} onCanvasReady={setCanvasEl} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={regenerate}>
                  Regenerate
                </Button>
                <Button variant="outline" onClick={restartWizard}>
                  Restart wizard
                </Button>
                <Button variant="outline" onClick={downloadMap}>
                  Download
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {view.kind === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <p className="text-destructive text-sm">{view.message}</p>
            <Button variant="outline" onClick={backToWizardAfterError}>
              Back to wizard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
