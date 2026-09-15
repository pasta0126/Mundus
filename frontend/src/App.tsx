import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type World = {
  specVersion: number
  seed: string
  size: 'Small' | 'Medium' | 'Large'
  biome: string
}

function App() {
  const [seed, setSeed] = useState('northern-archive')
  const [world, setWorld] = useState<World | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setError(null)
    try {
      const res = await fetch(`/api/worlds/${encodeURIComponent(seed)}`)
      if (!res.ok) throw new Error(`API returned ${res.status}`)
      setWorld((await res.json()) as World)
    } catch (err) {
      setWorld(null)
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Mundus</h1>

      <div className="flex w-full gap-2">
        <input
          className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="seed"
        />
        <button
          type="button"
          onClick={generate}
          className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
        >
          Generate
        </button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <AnimatePresence mode="wait">
        {world && (
          <motion.div
            key={`${world.seed}-${world.size}-${world.biome}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
            <Card>
              <CardHeader>
                <CardTitle>{world.seed}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Size: {world.size}</p>
                <p>Biome: {world.biome}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

export default App
