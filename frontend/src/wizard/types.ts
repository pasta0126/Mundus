import type { components } from "@/api/schema"

export type SizePreset = components["schemas"]["SizePreset"]

export interface WizardState {
  seed: string
  sizePreset: SizePreset | null
}

export const INITIAL_WIZARD_STATE: WizardState = {
  seed: "",
  sizePreset: null,
}

export const WIZARD_STEPS = ["seed", "sizePreset", "review"] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]
