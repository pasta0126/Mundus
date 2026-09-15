import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { GridTypeStep } from "@/wizard/steps/GridTypeStep"
import { ReviewStep } from "@/wizard/steps/ReviewStep"
import { SeedStep } from "@/wizard/steps/SeedStep"
import { ShapeArchetypeStep } from "@/wizard/steps/ShapeArchetypeStep"
import { SizePresetStep } from "@/wizard/steps/SizePresetStep"
import { WIZARD_STEPS, type WizardState } from "@/wizard/types"

interface MapCreationWizardProps {
  state: WizardState
  onChange: (state: WizardState) => void
  stepIndex: number
  onStepIndexChange: (index: number) => void
  onConfirm: () => void
}

export function MapCreationWizard({
  state,
  onChange,
  stepIndex,
  onStepIndexChange,
  onConfirm,
}: MapCreationWizardProps) {
  const step = WIZARD_STEPS[stepIndex]

  const canAdvance =
    (step !== "gridType" || state.gridType !== null) &&
    (step !== "sizePreset" || state.sizePreset !== null) &&
    (step !== "shapeArchetype" || state.shapeArchetype !== null)

  const isFirst = stepIndex === 0
  const isLast = step === "review"

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex justify-center gap-1.5">
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s}
            className={i === stepIndex ? "bg-primary h-1.5 w-6 rounded-full" : "bg-muted h-1.5 w-6 rounded-full"}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {step === "seed" && (
            <SeedStep value={state.seed} onChange={(seed) => onChange({ ...state, seed })} />
          )}
          {step === "gridType" && (
            <GridTypeStep
              value={state.gridType}
              onChange={(gridType) => onChange({ ...state, gridType })}
            />
          )}
          {step === "sizePreset" && (
            <SizePresetStep
              value={state.sizePreset}
              onChange={(sizePreset) => onChange({ ...state, sizePreset })}
            />
          )}
          {step === "shapeArchetype" && (
            <ShapeArchetypeStep
              value={state.shapeArchetype}
              onChange={(shapeArchetype) => onChange({ ...state, shapeArchetype })}
            />
          )}
          {step === "review" && <ReviewStep state={state} />}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button variant="outline" disabled={isFirst} onClick={() => onStepIndexChange(stepIndex - 1)}>
          Back
        </Button>
        {isLast ? (
          <Button onClick={onConfirm}>Generate map</Button>
        ) : (
          <Button disabled={!canAdvance} onClick={() => onStepIndexChange(stepIndex + 1)}>
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
