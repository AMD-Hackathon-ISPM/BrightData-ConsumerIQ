import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusLine } from './shared'

type GeneratingStepProps = {
  onComplete: () => void
  submitStatus: 'idle' | 'submitting' | 'success' | 'error'
  formId: string | null
  region?: string
  industry?: string
}

export function GeneratingStep({
  onComplete,
  submitStatus,
  formId,
  region,
  industry,
}: GeneratingStepProps) {
  const lines = useMemo(() => {
    const scopeLabel = industry?.toLowerCase() ?? 'category'
    const firstLine =
      region && industry
        ? `Scanning ${region} marketplaces for ${scopeLabel} listings…`
        : 'Scanning marketplace listings…'
    return [
      firstLine,
      '47 listings found across 23 brands',
      'Reading 1,247 verified-purchase reviews…',
      'Identifying customer patterns',
      'Cross-referencing social demand signals',
      'Detecting market gaps',
      'Building your dashboard',
    ]
  }, [region, industry])

  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (revealed >= lines.length) return
    const timeoutId = window.setTimeout(
      () => setRevealed((current) => current + 1),
      revealed === 0 ? 600 : 950,
    )
    return () => window.clearTimeout(timeoutId)
  }, [revealed, lines.length])

  const allDone = revealed >= lines.length

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        aria-hidden
        className="relative mx-auto mb-12 grid size-24 place-items-center"
      >
        <span
          className="absolute inset-0 rounded-full bg-foreground/[0.04]"
          style={{ animation: 'pulse 2.4s ease-in-out infinite' }}
        />
        <span
          className="absolute inset-[14px] rounded-full bg-foreground/[0.08]"
          style={{
            animation: 'pulse 2.4s ease-in-out infinite',
            animationDelay: '0.4s',
          }}
        />
        <span className="size-3 rounded-full bg-foreground/80" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Assembling your notebook
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Usually takes 60–90 seconds
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-md space-y-3">
        {lines.map((line, index) => {
          if (index > revealed) return null
          const state =
            index < revealed - 1 || allDone
              ? 'done'
              : index === revealed - 1
                ? 'running'
                : 'queued'
          return (
            <StatusLine key={line} state={state}>
              {line}
            </StatusLine>
          )
        })}
      </div>

      <div className="mt-14 flex flex-col items-center gap-4">
        {submitStatus === 'success' && formId ? (
          <p className="font-mono text-xs text-muted-foreground">
            <span className="opacity-70">Run id</span>{' '}
            <span className="text-foreground">{formId}</span>
          </p>
        ) : null}
        {submitStatus === 'error' ? (
          <p className="text-sm text-destructive">
            Submission failed. You can still open the dashboard.
          </p>
        ) : null}
        <Button
          onClick={onComplete}
          disabled={submitStatus === 'submitting' || !allDone}
          className={cn(
            'h-11 min-w-48 gap-2 px-5 transition-opacity duration-500',
            allDone ? 'opacity-100' : 'opacity-60',
          )}
        >
          {submitStatus === 'submitting' ? 'Submitting…' : 'Open dashboard'}
        </Button>
      </div>
    </div>
  )
}
