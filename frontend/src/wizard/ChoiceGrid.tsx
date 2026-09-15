import { cn } from "@/lib/utils"

interface Choice<T extends string> {
  value: T
  label: string
  description?: string
}

interface ChoiceGridProps<T extends string> {
  choices: readonly Choice<T>[]
  value: T | null
  onChange: (value: T) => void
}

export function ChoiceGrid<T extends string>({ choices, value, onChange }: ChoiceGridProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {choices.map((choice) => {
        const selected = choice.value === value
        return (
          <button
            key={choice.value}
            type="button"
            onClick={() => onChange(choice.value)}
            className={cn(
              "rounded-lg border px-4 py-3 text-left transition-colors",
              selected
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-muted",
            )}
          >
            <div className="text-sm font-medium">{choice.label}</div>
            {choice.description && (
              <div className="text-muted-foreground text-xs">{choice.description}</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
