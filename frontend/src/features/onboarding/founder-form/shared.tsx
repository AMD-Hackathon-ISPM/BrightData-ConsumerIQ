import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ProgressBar({ value }: { value: number }) {
  return (
    <div aria-hidden className="relative h-px w-full overflow-hidden bg-border-default">
      <div
        className="absolute inset-y-0 left-0 bg-foreground-default/70 transition-all duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function StepContext({ items }: { items: string[] }) {
  const filtered = items.filter((entry) => entry && entry.trim().length > 0)
  if (filtered.length === 0) {
    return null
  }
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-foreground-muted">
      {filtered.map((entry, index) => (
        <span key={entry}>
          {index > 0 ? <span className="px-2 opacity-50">·</span> : null}
          {entry}
        </span>
      ))}
    </p>
  )
}

export function OnboardingShell({
  children,
  step,
  totalSteps,
  progress,
  context,
}: {
  children: ReactNode
  step?: number
  totalSteps?: number
  progress: number
  context?: ReactNode
}) {
  const showStep = typeof step === 'number' && typeof totalSteps === 'number'
  return (
    <div className="w-full max-w-2xl">
      {showStep || context ? (
        <div className="mb-6 flex items-center justify-between">
          {showStep ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
              Step {String(step).padStart(2, '0')} /{' '}
              {String(totalSteps).padStart(2, '0')}
            </span>
          ) : (
            <span />
          )}
          {context}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border-default bg-background-surface-100">
        <ProgressBar value={progress} />
        <div className="px-8 py-10 sm:px-10 sm:py-12">{children}</div>
      </div>
    </div>
  )
}

export function ChipToggleGroup({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((entry) => entry !== option))
    } else {
      onChange([...value, option])
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            aria-pressed={selected}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              selected
                ? 'border-brand-default bg-brand-default text-foreground-contrast'
                : 'border-border-default bg-background-surface-100 text-foreground-default hover:border-brand-default/40 hover:bg-background-muted',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'inline-block size-1.5 rounded-full',
                selected ? 'bg-foreground-contrast' : 'bg-foreground-muted/40',
              )}
            />
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function StatusLine({
  children,
  state,
  delayMs = 0,
}: {
  children: ReactNode
  state: 'queued' | 'running' | 'done'
  delayMs?: number
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 font-mono text-sm transition-all duration-500 ease-out',
        state === 'queued' && 'translate-y-1 opacity-30',
        state === 'running' && 'translate-y-0 text-foreground-default opacity-100',
        state === 'done' && 'translate-y-0 text-foreground-muted opacity-80',
      )}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      <span
        aria-hidden
        className={cn(
          state === 'done' ? 'text-foreground-default/70' : 'text-foreground-muted',
        )}
      >
        →
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}

export function StepFooter({
  onBack,
  isSubmitting,
  isDisabled,
  primaryLabel = 'Continue',
}: {
  onBack?: () => void
  isSubmitting?: boolean
  isDisabled?: boolean
  primaryLabel?: string
}) {
  return (
    <div className="mt-2 flex items-center justify-end gap-3 pt-2">
      {onBack ? (
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Back
        </Button>
      ) : null}
      <Button
        size="sm"
        type="submit"
        disabled={isDisabled || isSubmitting}
      >
        {primaryLabel}
      </Button>
    </div>
  )
}
