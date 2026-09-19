import type { PlanetDto } from "./planetTexture"

export const TYPE_LABELS: Record<PlanetDto["type"], string> = {
  Rocky: "Rocky",
  Desert: "Desert",
  Oceanic: "Oceanic",
  Ice: "Ice",
  Lava: "Lava",
  Toxic: "Toxic",
  GasGiant: "Gas giant",
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

export function PlanetSheet({ planet }: { planet: PlanetDto }) {
  const atmosphere = planet.atmosphere ? (planet.atmosphere.clouds ? "Cloudy" : "Clear") : "None"
  const moons = planet.moons.length
  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-lg leading-tight font-semibold">{planet.name}</h2>
        <p className="text-muted-foreground text-xs">{TYPE_LABELS[planet.type]} planet</p>
      </div>
      <p className="text-sm leading-snug">{planet.description}</p>
      <dl className="space-y-1 text-xs">
        <Row label="Radius" value={`${Number(planet.radius).toFixed(1)} Earth`} />
        <Row label="Day" value={`${Math.round(Number(planet.rotationPeriodSeconds))} s`} />
        <Row label="Axial tilt" value={`${Math.round(Number(planet.axialTiltDegrees))}°`} />
        <Row label="Atmosphere" value={atmosphere} />
        <Row label="Rings" value={planet.rings ? "Yes" : "None"} />
        <Row label="Asteroid field" value={planet.asteroidField ? "Yes" : "None"} />
        <Row label="Moons" value={String(moons)} />
      </dl>
      <div className="flex gap-1.5" aria-label="Palette">
        {planet.palette.map((color) => (
          <span key={color} className="size-4 rounded-full border" style={{ backgroundColor: color }} title={color} />
        ))}
      </div>
    </div>
  )
}
