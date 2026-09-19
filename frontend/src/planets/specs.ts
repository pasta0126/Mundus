import type { PlanetDto } from "./planetTexture"
import type { SystemDto } from "./SystemScene"

/**
 * What "Copy specs" puts on the clipboard. The viewer needs a planet's
 * surface features and texture seed to draw it, but they are drawing
 * details derived from its seed, not planetary information, so they are
 * left out of the copy.
 */
function planetSpecs(planet: PlanetDto): Partial<PlanetDto> {
  const specs: Partial<PlanetDto> = { ...planet }
  delete specs.features
  delete specs.textureSeed
  return specs
}

export function planetSpecsText(planet: PlanetDto): string {
  return JSON.stringify(planetSpecs(planet), null, 2)
}

/** A system's specs: a slot's own planet already carries its seed, so the slot does not repeat it. */
export function systemSpecsText(system: SystemDto): string {
  const specs = {
    ...system,
    slots: system.slots.map((slot) => {
      const { planetSeed, planet, ...rest } = slot
      void planetSeed
      return { ...rest, planet: planetSpecs(planet) }
    }),
  }
  return JSON.stringify(specs, null, 2)
}
