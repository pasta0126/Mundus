import { ChoiceGrid } from "@/wizard/ChoiceGrid"
import type { ShapeArchetype } from "@/wizard/types"

const CHOICES = [
  { value: "Continent" as ShapeArchetype, label: "Continent", description: "One large landmass" },
  { value: "Island" as ShapeArchetype, label: "Island", description: "One landmass, ocean all around" },
  { value: "Archipelago" as ShapeArchetype, label: "Archipelago", description: "Several separate landmasses" },
  { value: "Peninsula" as ShapeArchetype, label: "Peninsula", description: "Land attached to one edge" },
  { value: "IsthmusLandBridge" as ShapeArchetype, label: "Isthmus / Land Bridge", description: "Land spanning two opposite edges" },
  { value: "InlandSea" as ShapeArchetype, label: "Inland Sea", description: "Land enclosing a body of water" },
  { value: "Unconstrained" as ShapeArchetype, label: "Unconstrained", description: "No shape guarantee, purely emergent" },
]

interface ShapeArchetypeStepProps {
  value: ShapeArchetype | null
  onChange: (value: ShapeArchetype) => void
}

export function ShapeArchetypeStep({ value, onChange }: ShapeArchetypeStepProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Shape</div>
      <ChoiceGrid choices={CHOICES} value={value} onChange={onChange} />
    </div>
  )
}
