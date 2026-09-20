/**
 * Dungeon artwork: one PNG per catalog id (bosses, treasures, the hoard,
 * the three layout styles as `style-<id>`) plus the shared marks `entrance`,
 * `boss`, `final-boss` and `dungeon-badge`, in assets/dungeon/<id>.png.
 * What each id means (label, description, rarity) is the backend's catalog.
 */
import { createIconLoader } from "@/map/poi"

const iconUrls = import.meta.glob("../assets/dungeon/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

export function dungeonIconUrl(id: string): string | undefined {
  return iconUrls[`../assets/dungeon/${id}.png`]
}

export const loadDungeonIcons = createIconLoader(dungeonIconUrl)
