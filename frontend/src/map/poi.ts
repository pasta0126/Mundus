/**
 * Points-of-interest icons. The catalog (which icons exist, their labels,
 * categories, rarity...) lives in the backend and is fetched from
 * /api/PointsOfInterest/catalog; only the artwork is here: each catalog id
 * has a PNG in every style, assets/poi-suite/<style>/<id>.png.
 */
import { api } from "@/api/client"
import type { components } from "@/api/schema"

export type PoiEntry = components["schemas"]["PoiEntry"]
export type PoiCategory = components["schemas"]["PoiCategory"]
export type PoiRole = components["schemas"]["PoiRole"]
export type SettlementTier = NonNullable<components["schemas"]["SettlementTier"]>

export type PoiStyle = "color" | "fantasy" | "line"

export const POI_STYLES: readonly { id: PoiStyle; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "fantasy", label: "Fantasy" },
  { id: "line", label: "Line" },
]

export const DEFAULT_POI_STYLE: PoiStyle = "color"

const STYLE_STORAGE_KEY = "mundus.poiStyle"

/** The style the user last picked - localStorage may be unavailable or hold junk, so anything unexpected falls back to the default. */
export function loadPoiStyle(): PoiStyle {
  try {
    const stored = localStorage.getItem(STYLE_STORAGE_KEY)
    return POI_STYLES.some((s) => s.id === stored) ? (stored as PoiStyle) : DEFAULT_POI_STYLE
  } catch {
    return DEFAULT_POI_STYLE
  }
}

export function savePoiStyle(style: PoiStyle): void {
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, style)
  } catch {
    // Not worth failing over - the choice just won't survive a reload.
  }
}

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

const iconUrls = import.meta.glob("../assets/poi-suite/{color,fantasy,line}/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

export function poiIconUrl(style: PoiStyle, id: string): string | undefined {
  return iconUrls[`../assets/poi-suite/${style}/${id}.png`]
}

const iconCache = new Map<string, Promise<HTMLImageElement | null>>()

/** Decodes each requested icon once per style and caches it, so drawing never waits on the network again. */
export async function loadPoiIcons(style: PoiStyle, ids: Iterable<string>): Promise<Map<string, HTMLImageElement>> {
  const wanted = [...new Set(ids)]
  const loaded = await Promise.all(
    wanted.map((id) => {
      const key = `${style}/${id}`
      let promise = iconCache.get(key)
      if (!promise) {
        promise = new Promise<HTMLImageElement | null>((resolve) => {
          const url = poiIconUrl(style, id)
          if (!url) return resolve(null)
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = url
        })
        iconCache.set(key, promise)
      }
      return promise.then((img) => [id, img] as const)
    }),
  )
  return new Map(loaded.filter((entry): entry is [string, HTMLImageElement] => entry[1] !== null))
}

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
