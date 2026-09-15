interface SeedStepProps {
  value: string
  onChange: (value: string) => void
}

export function SeedStep({ value, onChange }: SeedStepProps) {
  return (
    <div className="space-y-2">
      <label htmlFor="seed" className="text-sm font-medium">
        Seed
      </label>
      <input
        id="seed"
        className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
        placeholder="Leave blank for a random seed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-muted-foreground text-xs">
        The same seed and parameters always produce the exact same map.
        Leave this blank to get a random one.
      </p>
    </div>
  )
}
