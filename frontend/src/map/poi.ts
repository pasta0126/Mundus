/**
 * Points-of-interest icons. The catalog (which icons exist, their labels,
 * categories, rarity...) lives in the backend and is fetched from
 * /api/PointsOfInterest/catalog; only the artwork is here: each catalog id
 * has a PNG, assets/poi/<id>.png.
 */
import { api } from "@/api/client"
import type { components } from "@/api/schema"

export type PoiEntry = components["schemas"]["PoiEntry"]
export type PoiCategory = components["schemas"]["PoiCategory"]
export type PoiRole = components["schemas"]["PoiRole"]
export type SettlementTier = NonNullable<components["schemas"]["SettlementTier"]>

export interface PoiCatalog {
  categories: PoiCategory[]
  entries: Map<string, PoiEntry>
}

let catalogPromise: Promise<PoiCatalog | null> | null = null

/** Fetched once per page load; a failed fetch is retried on the next call. */
export function loadPoiCatalog(): Promise<PoiCatalog | null> {
  catalogPromise ??= api.GET("/api/PointsOfInterest/catalog").then(({ data }) => {
    if (!data) {
      catalogPromise = null
      return null
    }
    return { categories: data.categories, entries: new Map(data.entries.map((e) => [e.id, e])) }
  })
  return catalogPromise
}

const iconUrls = import.meta.glob("../assets/poi/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

export function poiIconUrl(id: string): string | undefined {
  return iconUrls[`../assets/poi/${id}.png`]
}

/** Decodes each requested icon once and caches it, so drawing never waits on the network again. */
export function createIconLoader(urlOf: (id: string) => string | undefined) {
  const cache = new Map<string, Promise<HTMLImageElement | null>>()
  return async (ids: Iterable<string>): Promise<Map<string, HTMLImageElement>> => {
    const wanted = [...new Set(ids)]
    const loaded = await Promise.all(
      wanted.map((id) => {
        let promise = cache.get(id)
        if (!promise) {
          promise = new Promise<HTMLImageElement | null>((resolve) => {
            const url = urlOf(id)
            if (!url) return resolve(null)
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
            img.src = url
          })
          cache.set(id, promise)
        }
        return promise.then((img) => [id, img] as const)
      }),
    )
    return new Map(loaded.filter((entry): entry is [string, HTMLImageElement] => entry[1] !== null))
  }
}

export const loadPoiIcons = createIconLoader(poiIconUrl)

/**
 * Settlement satellites (the services around a town's anchor) are hidden
 * once zoomed out past this sampling stride: at a wide view a city should
 * read as one anchor icon, not a crowd.
 */
export const SATELLITE_MAX_STEP = 4

/** Longest side, in CSS pixels, an icon is drawn at - constant across zoom levels, like every other overlay. Bigger settlements get a bigger anchor. */
export function poiIconPx(role: PoiRole, tier: SettlementTier | null | undefined): number {
  if (role === "Satellite") return 30
  if (role === "Anchor") {
    switch (tier) {
      case "Point":
        return 40
      case "Medium":
        return 54
      case "Large":
        return 64
      case "Huge":
        return 76
      default:
        return 46
    }
  }
  return 46
}
