import type { WizardState } from "@/wizard/types"

interface ReviewStepProps {
  state: WizardState
}

export function ReviewStep({ state }: ReviewStepProps) {
  const rows: [string, string][] = [
    ["Seed", state.seed.trim() || "(random)"],
    ["Grid type", state.gridType ?? "-"],
    ["Size", state.sizePreset ?? "-"],
  ]

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Review</div>
      <dl className="divide-border divide-y rounded-lg border text-sm">
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between px-4 py-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
