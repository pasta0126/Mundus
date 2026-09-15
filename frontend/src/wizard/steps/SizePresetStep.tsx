import { ChoiceGrid } from "@/wizard/ChoiceGrid"
import type { SizePreset } from "@/wizard/types"

const CHOICES = [
  { value: "Small" as SizePreset, label: "Small", description: "32 × 32 cells" },
  { value: "Medium" as SizePreset, label: "Medium", description: "64 × 64 cells" },
  { value: "Large" as SizePreset, label: "Large", description: "128 × 128 cells" },
  { value: "Huge" as SizePreset, label: "Huge", description: "256 × 256 cells" },
]

interface SizePresetStepProps {
  value: SizePreset | null
  onChange: (value: SizePreset) => void
}

export function SizePresetStep({ value, onChange }: SizePresetStepProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Size</div>
      <ChoiceGrid choices={CHOICES} value={value} onChange={onChange} />
    </div>
  )
}
