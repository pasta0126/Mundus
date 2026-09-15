import type { components } from "@/api/schema"

export type GridType = components["schemas"]["GridType"]
export type SizePreset = components["schemas"]["SizePreset"]

export interface WizardState {
  seed: string
  gridType: GridType | null
  sizePreset: SizePreset | null
}

export const INITIAL_WIZARD_STATE: WizardState = {
  seed: "",
  gridType: null,
  sizePreset: null,
}

export const WIZARD_STEPS = ["seed", "gridType", "sizePreset", "review"] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]

export function isReadyForReview(state: WizardState): boolean {
  return state.gridType !== null && state.sizePreset !== null
}
