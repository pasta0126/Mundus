import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import { Button } from "@/components/ui/button"
import { MapCanvas } from "@/map/MapCanvas"
import { MapCreationWizard } from "@/wizard/MapCreationWizard"
import { INITIAL_WIZARD_STATE, WIZARD_STEPS, type WizardState } from "@/wizard/types"

type MapDto = components["schemas"]["Map"]
type ViewState =
  | { kind: "wizard" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; map: MapDto }

const REVIEW_STEP_INDEX = WIZARD_STEPS.indexOf("review")
const SEED_STEP_INDEX = WIZARD_STEPS.indexOf("seed")

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10)
}

function App() {
  const [wizardState, setWizardState] = useState<WizardState>(INITIAL_WIZARD_STATE)
  const [stepIndex, setStepIndex] = useState(0)
  const [view, setView] = useState<ViewState>({ kind: "wizard" })

  async function handleConfirm() {
    if (!wizardState.gridType || !wizardState.sizePreset || !wizardState.shapeArchetype) return

    setView({ kind: "loading" })
    const seed = wizardState.seed.trim() || randomSeed()
    const { data, error } = await api.GET("/api/Maps", {
      params: {
        query: {
          seed,
          gridType: wizardState.gridType,
          sizePreset: wizardState.sizePreset,
          shapeArchetype: wizardState.shapeArchetype,
        },
      },
    })

    if (error !== undefined || !data) {
      setView({ kind: "error", message: "Failed to generate map" })
      return
    }

    setView({ kind: "result", map: data })
  }

  function backToWizard() {
    setStepIndex(REVIEW_STEP_INDEX)
    setView({ kind: "wizard" })
  }

  function generateAnother() {
    setStepIndex(SEED_STEP_INDEX)
    setView({ kind: "wizard" })
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

        {view.kind === "loading" && (
          <motion.p
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-muted-foreground text-sm"
          >
            Generating map…
          </motion.p>
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
            <Button variant="outline" onClick={backToWizard}>
              Back to wizard
            </Button>
          </motion.div>
        )}

        {view.kind === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex w-full flex-col items-center gap-3"
          >
            <MapCanvas map={view.map} />
            <Button variant="outline" onClick={generateAnother}>
              Generate another
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
