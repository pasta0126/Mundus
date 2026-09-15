import { ChoiceGrid } from "@/wizard/ChoiceGrid"
import type { GridType } from "@/wizard/types"

const CHOICES = [
  { value: "Square" as GridType, label: "Square", description: "A plain rectangular grid" },
  { value: "Hex" as GridType, label: "Hex", description: "Hexagonal tabletop-style grid" },
]

interface GridTypeStepProps {
  value: GridType | null
  onChange: (value: GridType) => void
}

export function GridTypeStep({ value, onChange }: GridTypeStepProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Grid type</div>
      <ChoiceGrid choices={CHOICES} value={value} onChange={onChange} />
    </div>
  )
}
