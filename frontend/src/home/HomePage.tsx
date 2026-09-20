import { Globe, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { MobileNotice } from "@/components/MobileNotice"

interface Card {
  href: string
  title: string
  description: string
  icon: LucideIcon
  /** Pastel background, with a deep counterpart for a dark theme. */
  tint: string
}

const CARDS: readonly Card[] = [
  {
    href: "/maps",
    title: "Map",
    description: "Explore an endless world of oceans, mountains and forests, dotted with places to find.",
    icon: MapIcon,
    tint: "bg-emerald-100 hover:bg-emerald-200/80 dark:bg-emerald-950 dark:hover:bg-emerald-900",
  },
  {
    href: "/planets",
    title: "Planet",
    description: "Spin a planet from its name alone: its surface, its clouds, its rings and its moons.",
    icon: Globe,
    tint: "bg-violet-100 hover:bg-violet-200/80 dark:bg-violet-950 dark:hover:bg-violet-900",
  },
  {
    href: "/systems",
    title: "System",
    description: "Watch a whole planetary system orbit, or build one from planets of your own.",
    icon: Orbit,
    tint: "bg-amber-100 hover:bg-amber-200/80 dark:bg-amber-950 dark:hover:bg-amber-900",
  },
]

/** The landing page: a hub that only links out. It makes no request and loads no map or 3D code. */
export default function HomePage() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center gap-8 p-6 sm:p-10">
      <div className="w-full max-w-xl">
        <MobileNotice />
      </div>
      <header className="flex flex-col items-center gap-3 pt-2 text-center">
        <img src={mundusIcon} alt="" className="size-16" />
        <h1 className="text-4xl font-semibold tracking-tight">Mundus</h1>
        <p className="text-muted-foreground max-w-md text-sm">Worlds, planets and systems generated from a name. Same name, same world, every time.</p>
      </header>
      <nav aria-label="What to generate" className="flex w-full max-w-xl flex-1 flex-col gap-5">
        {CARDS.map(({ href, title, description, icon: Icon, tint }) => (
          <a
            key={title}
            href={href}
            className={`${tint} text-foreground flex min-h-44 flex-1 flex-col justify-center gap-3 rounded-2xl border p-8 shadow-md transition-colors`}
          >
            <Icon className="size-10" aria-hidden />
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm leading-snug">{description}</p>
          </a>
        ))}
      </nav>
      <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
    </main>
  )
}
