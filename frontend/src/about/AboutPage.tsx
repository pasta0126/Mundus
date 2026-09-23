import { ArrowRight, Castle, Coffee, Dices, Globe, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Section {
  title: string
  href: string
  linkLabel: string
  summary: string
  features: readonly string[]
  icon: LucideIcon
}

const SECTIONS: readonly Section[] = [
  {
    title: "Map",
    href: "/maps",
    linkLabel: "Open the map",
    summary: "An endless world generated from a seed - the same seed always gives the same land, so you can share a place by its link.",
    features: [
      "Pan by dragging and zoom through several levels, or jump to exact coordinates",
      "Oceans, beaches, deserts, grasslands, forests, mountains, snow and more, with a biome legend",
      "Points of interest - monuments, legends and whole settlements - that name themselves on hover or tap",
      "Toggleable layers: compass rose, region borders and each kind of point of interest",
      "Type any seed to explore its world, or regenerate for a random one",
      "Download the current view as a PNG, showing only the layers you have on",
    ],
    icon: MapIcon,
  },
  {
    title: "Dungeons",
    href: "/maps",
    linkLabel: "Find one on the map",
    summary: "Some points of interest on the map hide a dungeon. Tap or click one to enter it.",
    features: [
      "A single-floor dungeon per place - rooms and corridors, or tunnels and chambers for caves",
      "An entrance, treasures of several rarities, and bosses - one final boss plus lesser ones",
      "Always the same dungeon for the same place, with a button back to where you left the map",
      "Copy the seed and specs to reuse a dungeon at your table",
    ],
    icon: Castle,
  },
  {
    title: "Planet",
    href: "/planets",
    linkLabel: "Spin a planet",
    summary: "A rotatable 3D planet created from nothing but a name.",
    features: [
      "Drag to rotate; each planet has its own type, surface, atmosphere and clouds",
      "Rings, asteroid fields and moons where the seed calls for them",
      "A sheet describing the planet and its notable features",
      "Random pronounceable names, shareable links, and copy-seed / copy-specs buttons",
    ],
    icon: Globe,
  },
  {
    title: "System",
    href: "/systems",
    linkLabel: "Watch a system",
    summary: "A whole planetary system in motion around one or two central bodies.",
    features: [
      "Planets on their own orbits, with at most one asteroid belt, all in deterministic motion",
      "Open any planet from the system to look at it up close",
      "Build a custom system: choose a central seed and add up to eight planet seeds and an optional belt",
      "A custom system lives entirely in its link - nothing is saved on a server",
    ],
    icon: Orbit,
  },
  {
    title: "Dice",
    href: "/dice",
    linkLabel: "Roll some dice",
    summary: "A 3D tray with real physics for the dice your table needs.",
    features: [
      "d4, d6, d8, d10, d12, d20 and d100 - any mix, any number",
      "Roll everything at once, or click a single die to throw only that one; on a phone, shake to roll",
      "Give each die its own colour and name, and see a live total",
      "Every roll is kept in a history (last 100) that you can download as JSON or clear",
    ],
    icon: Dices,
  },
]

const FEEDBACK_KINDS = [
  { value: "Comment", label: "Comment" },
  { value: "Bug", label: "Bug report" },
  { value: "Feature", label: "Feature request" },
] as const

type FeedbackStatus = "idle" | "sending" | "sent" | "error"

const inputClasses =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"

/** Explains what Mundus is and offers, for people arriving from a shared link. */
export default function AboutPage() {
  const [kind, setKind] = useState<(typeof FEEDBACK_KINDS)[number]["value"]>("Comment")
  const [message, setMessage] = useState("")
  const [name, setName] = useState("")
  const [status, setStatus] = useState<FeedbackStatus>("idle")

  async function submitFeedback(e: FormEvent) {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || status === "sending") return

    setStatus("sending")
    try {
      const response = await fetch("/api/Feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: trimmed, name: name.trim() || undefined }),
      })
      if (!response.ok) throw new Error("request failed")
      setStatus("sent")
      setMessage("")
      setName("")
    } catch {
      setStatus("error")
    }
  }

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

      <section aria-label="About Mundus" className="space-y-2 text-sm leading-relaxed">
        <p>
          Mundus is a free toolbox of generators for tabletop games and worldbuilding. Everything is created from a <strong>seed</strong> - a name or a few characters - so the same seed always gives the same world, planet, system or dungeon, and you can share any of them just by sharing its link. There is nothing to install, no account to make, and nothing is stored on a server.
        </p>
        <p className="text-muted-foreground">
          Made by Guille, an independent developer based in Barcelona, as part of Northern Archive. Every page works on phones and tablets as well as on a computer.
        </p>
      </section>

      <section aria-label="What each page does" className="flex flex-col gap-4">
        {SECTIONS.map(({ title, href, linkLabel, summary, features, icon: Icon }) => (
          <div key={title} className="bg-card flex flex-col gap-3 rounded-lg border p-5">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-muted-foreground text-sm">{summary}</p>
              </div>
            </div>
            <ul className="text-muted-foreground list-disc space-y-1 pl-9 text-sm">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <a href={href} className="hover:text-foreground flex items-center gap-1 self-start pl-9 text-sm font-medium underline underline-offset-2">
              {linkLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
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

      <section aria-label="Send feedback" className="bg-card flex flex-col gap-3 rounded-lg border p-6">
        <div>
          <h2 className="font-semibold">Comments, bugs and ideas</h2>
          <p className="text-muted-foreground text-sm">Send it straight to the person behind Mundus - nothing here is stored.</p>
        </div>
        <form onSubmit={submitFeedback} className="flex flex-col gap-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className={inputClasses}
            aria-label="Feedback kind"
          >
            {FEEDBACK_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            required
            maxLength={4000}
            rows={4}
            className={inputClasses}
          />
          <Button type="submit" disabled={status === "sending" || !message.trim()}>
            {status === "sending" ? "Sending…" : "Send"}
          </Button>
          {status === "sent" && <p className="text-sm text-emerald-600 dark:text-emerald-400">Thanks - it's on its way!</p>}
          {status === "error" && <p className="text-destructive text-sm">Something went wrong. Please try again.</p>}
        </form>
      </section>
    </main>
  )
}
