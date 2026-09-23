import { Coffee, Dices, Globe, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"

interface Feature {
  title: string
  description: string
  icon: LucideIcon
}

const FEATURES: readonly Feature[] = [
  { title: "Map", description: "An endless world of oceans, mountains and forests, dotted with places to find.", icon: MapIcon },
  { title: "Planet", description: "Spin a planet from its name alone: its surface, its clouds, its rings and its moons.", icon: Globe },
  { title: "System", description: "Watch a whole planetary system orbit, or build one from planets of your own.", icon: Orbit },
  { title: "Dice", description: "Drop any mix of dice into a physics-real tray and roll them all at once.", icon: Dices },
]

/** Explains what Mundus is and offers, for people arriving from a shared link. */
export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 p-6 sm:p-10">
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <a href="/" className="flex flex-col items-center gap-3" aria-label="Back to home">
          <img src={mundusIcon} alt="" className="size-16" />
          <h1 className="text-4xl font-semibold tracking-tight">Mundus</h1>
        </a>
        <p className="text-muted-foreground max-w-md text-sm">
          Everything a tabletop needs to come alive - worlds to explore, dungeons to brave, and dice to throw - so your table can play, organically. Free, in your browser, no account needed.
        </p>
      </header>

      <section aria-label="What Mundus offers" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map(({ title, description, icon: Icon }) => (
          <div key={title} className="bg-card flex items-start gap-3 rounded-lg border p-4">
            <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
        ))}
      </section>

      <section aria-label="Support this project" className="bg-card flex flex-col items-center gap-3 rounded-lg border p-6 text-center">
        <h2 className="font-semibold">Support this project</h2>
        <p className="text-muted-foreground max-w-sm text-sm">Mundus is free and made for fun. If you'd like to help keep it running, you can buy me a coffee.</p>
        <Button asChild>
          <a href="https://www.buymeacoffee.com/pasta0126" target="_blank" rel="noopener noreferrer">
            <Coffee />
            Buy me a coffee
          </a>
        </Button>
      </section>
    </main>
  )
}
