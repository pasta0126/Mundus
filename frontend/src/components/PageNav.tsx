import { Globe, Home, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PageId = "home" | "maps" | "planets" | "systems"

const PAGES: readonly { id: PageId; href: string; label: string; icon: LucideIcon }[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "maps", href: "/maps", label: "Map", icon: MapIcon },
  { id: "planets", href: "/planets", label: "Planets", icon: Globe },
  { id: "systems", href: "/systems", label: "Systems", icon: Orbit },
]

/** The row of white buttons below every page's panel: one for each of the other pages. */
export function PageNav({ current }: { current: PageId }) {
  return (
    <div className="flex gap-2">
      {PAGES.filter((page) => page.id !== current).map(({ id, href, label, icon: Icon }) => (
        <Button key={id} asChild variant="outline" className="flex-1 shadow-lg">
          <a href={href}>
            <Icon />
            {label}
          </a>
        </Button>
      ))}
    </div>
  )
}
