export interface WizardState {
  seed: string
  /** Raw text input for the start position, parsed with a "0" fallback when blank - see App.tsx's parseCoordinate. */
  x: string
  y: string
}

export const INITIAL_WIZARD_STATE: WizardState = {
  seed: "",
  x: "",
  y: "",
}

export const WIZARD_STEPS = ["seed", "startPosition", "review"] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]
