import { Globe, Home, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PageId = "home" | "maps" | "planets" | "systems"

/** Pages that are not in the row: reached from elsewhere (a dungeon opens from the map), so every button is shown. */
type OffRowPage = "dungeons"

const PAGES: readonly { id: PageId; href: string; label: string; icon: LucideIcon }[] = [
  { id: "home", href: "/", label: "Home", icon: Home },
  { id: "maps", href: "/maps", label: "Map", icon: MapIcon },
  { id: "planets", href: "/planets", label: "Planets", icon: Globe },
  { id: "systems", href: "/systems", label: "Systems", icon: Orbit },
]

/** The row of white buttons below every page's panel: one for each of the other pages. `mapHref` sends the map button somewhere specific (a dungeon returns to where it came from). */
export function PageNav({ current, mapHref }: { current: PageId | OffRowPage; mapHref?: string }) {
  return (
    <div className="flex gap-2">
      {PAGES.filter((page) => page.id !== current).map(({ id, href, label, icon: Icon }) => (
        <Button key={id} asChild variant="outline" className="flex-1 shadow-lg">
          <a href={id === "maps" && mapHref ? mapHref : href}>
            <Icon />
            {label}
          </a>
        </Button>
      ))}
    </div>
  )
}
