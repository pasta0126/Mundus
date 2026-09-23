import { Coffee, Dices, Globe, Map as MapIcon, Orbit, type LucideIcon } from "lucide-react"
import { useState, type FormEvent } from "react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
