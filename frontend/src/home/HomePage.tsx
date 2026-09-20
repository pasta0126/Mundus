import { Globe, Map as MapIcon, Orbit, Skull, type LucideIcon } from "lucide-react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { MobileNotice } from "@/components/MobileNotice"

interface Card {
  href: string
  title: string
  description: string
  icon: LucideIcon
}

const CARDS: readonly Card[] = [
  { href: "/maps", title: "Map", description: "Explore an endless world of oceans, mountains and forests, dotted with places to find.", icon: MapIcon },
  { href: "/planets", title: "Planet", description: "Spin a planet from its name alone: its surface, its clouds, its rings and its moons.", icon: Globe },
  { href: "/systems", title: "System", description: "Watch a whole planetary system orbit, or build one from planets of your own.", icon: Orbit },
  { href: "/maps", title: "Dungeons", description: "Some places on the map hide a dungeon. Find one and step inside.", icon: Skull },
]

/** The landing page: a hub that only links out. It makes no request and loads no map or 3D code. */
export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center gap-8 p-6 sm:p-10">
      <div className="w-full max-w-3xl">
        <MobileNotice />
      </div>
      <header className="flex flex-col items-center gap-3 pt-6 text-center">
        <img src={mundusIcon} alt="" className="size-16" />
        <h1 className="text-4xl font-semibold tracking-tight">Mundus</h1>
        <p className="text-muted-foreground max-w-md text-sm">Worlds, planets and systems generated from a name. Same name, same world, every time.</p>
      </header>
      <nav aria-label="What to generate" className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, title, description, icon: Icon }) => (
          <a
            key={title}
            href={href}
            className="bg-card hover:border-foreground/30 group flex flex-col gap-3 rounded-xl border p-6 shadow-lg transition-colors"
          >
            <Icon className="size-8" aria-hidden />
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <p className="text-muted-foreground text-sm leading-snug">{description}</p>
          </a>
        ))}
      </nav>
      <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
    </main>
  )
}
