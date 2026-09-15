import type { components } from "@/api/schema"

export type GridType = components["schemas"]["GridType"]
export type SizePreset = components["schemas"]["SizePreset"]
// The generated schema marks this one nullable (an artifact of the
// backend's OpenAPI document, not a real "no archetype" value) - narrow
// it back to the seven real archetypes.
export type ShapeArchetype = NonNullable<components["schemas"]["ShapeArchetype"]>

export interface WizardState {
  seed: string
  gridType: GridType | null
  sizePreset: SizePreset | null
  shapeArchetype: ShapeArchetype | null
}

export const INITIAL_WIZARD_STATE: WizardState = {
  seed: "",
  gridType: null,
  sizePreset: null,
  shapeArchetype: null,
}

export const WIZARD_STEPS = [
  "seed",
  "gridType",
  "sizePreset",
  "shapeArchetype",
  "review",
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]

export function isReadyForReview(state: WizardState): boolean {
  return state.gridType !== null && state.sizePreset !== null && state.shapeArchetype !== null
}
