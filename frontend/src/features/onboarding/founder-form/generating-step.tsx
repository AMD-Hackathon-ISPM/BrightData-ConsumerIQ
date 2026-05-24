import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusLine } from './shared'
import { startPersonaDecode, PERSONA_TASK_KEY } from './api'
import { getAuthToken } from '@/lib/auth'
import type { FounderFormState } from './types'

type PipelineStatus = {
  scraping: { status: string; signalsStored: number }
  inference: { status: string }
}

async function fetchPipelineStatus(formId: string): Promise<PipelineStatus | null> {
  try {
    const token = getAuthToken()
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(`/api/form-pipeline/${formId}`, { headers })
    if (!res.ok) return null
    return res.json() as Promise<PipelineStatus>
  } catch {
    return null
  }
}

function pipelineTarget(p: PipelineStatus | null): number {
  if (!p) return 1
  const scrape = p.scraping.status
  const infer = p.inference.status
  if (infer === 'completed' || infer === 'skipped') return 7
  if (infer === 'processing') return 5
  if (infer === 'failed') return 5
  if (scrape === 'completed' || scrape === 'skipped') return 4
  if (scrape === 'failed') return 4
  if (scrape === 'processing') return 3
  return 1
}

type GeneratingStepProps = {
  onComplete: () => void
  submitStatus: 'idle' | 'submitting' | 'success' | 'error'
  formId: string | null
  formState: FounderFormState
  region?: string
  industry?: string
}

export function GeneratingStep({
  onComplete,
  submitStatus,
  formId,
  formState,
  region,
  industry,
}: GeneratingStepProps) {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null)
  const [revealed, setRevealed] = useState(0)
  const personaStarted = useRef(false)

  const signalsStored = pipeline?.scraping.signalsStored ?? 0

  const lines = useMemo(() => {
    const scopeLabel = industry?.toLowerCase() ?? 'category'
    const firstLine =
      region && industry
        ? `Scanning ${region} marketplaces for ${scopeLabel} listings…`
        : 'Scanning marketplace listings…'
    const signalsLine =
      signalsStored > 0
        ? `${signalsStored.toLocaleString()} market signals collected`
        : 'Gathering market signals…'
    return [
      firstLine,
      signalsLine,
      'Reading verified-purchase reviews…',
      'Identifying customer patterns',
      'Cross-referencing social demand signals',
      'Detecting market gaps',
      'Building your dashboard',
    ]
  }, [region, industry, signalsStored])

  useEffect(() => {
    if (!formId || submitStatus !== 'success') return
    let cancelled = false
    const poll = async () => {
      while (!cancelled) {
        const status = await fetchPipelineStatus(formId)
        if (!cancelled) setPipeline(status)
        if (status && pipelineTarget(status) >= lines.length) break
        await new Promise<void>((r) => setTimeout(r, 3000))
      }
    }
    poll()
    return () => {
      cancelled = true
    }
  }, [formId, submitStatus, lines.length])

  const target = pipelineTarget(pipeline)

  useEffect(() => {
    if (submitStatus !== 'success') return
    if (revealed >= target) return
    const id = window.setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 600 : 900)
    return () => window.clearTimeout(id)
  }, [revealed, target, submitStatus])

  useEffect(() => {
    if (submitStatus !== 'success' || personaStarted.current) return
    personaStarted.current = true
    startPersonaDecode(formState)
      .then(({ taskId }) => {
        try {
          localStorage.setItem(PERSONA_TASK_KEY, taskId)
        } catch {}
      })
      .catch(() => {})
  }, [submitStatus, formState])

  const allDone = revealed >= lines.length
  const canOpen = target >= 4 || submitStatus === 'error'

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        aria-hidden
        className="relative mx-auto mb-12 grid size-24 place-items-center"
      >
        <span
          className="absolute inset-0 rounded-full bg-foreground-default/[0.04]"
          style={{ animation: 'pulse 2.4s ease-in-out infinite' }}
        />
        <span
          className="absolute inset-[14px] rounded-full bg-foreground-default/[0.08]"
          style={{
            animation: 'pulse 2.4s ease-in-out infinite',
            animationDelay: '0.4s',
          }}
        />
        <span className="size-3 rounded-full bg-foreground-default/80" />
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-medium tracking-tight text-foreground-default">
          Assembling your notebook
        </h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-foreground-muted">
          Usually takes 60–90 seconds
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-md space-y-3">
        {lines.map((line, index) => {
          if (index >= revealed) return null
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
          <p className="font-mono text-xs text-foreground-muted">
            <span className="opacity-70">Run id</span>{' '}
            <span className="text-foreground-default">{formId}</span>
          </p>
        ) : null}
        {submitStatus === 'error' ? (
          <p className="text-sm text-destructive">
            Submission failed. You can still open the dashboard.
          </p>
        ) : null}
        <Button
          onClick={onComplete}
          disabled={submitStatus === 'submitting' || !canOpen}
          className={cn(
            'h-11 min-w-48 gap-2 px-5 transition-opacity duration-500',
            canOpen ? 'opacity-100' : 'opacity-60',
          )}
        >
          {submitStatus === 'submitting' ? 'Submitting…' : 'Open dashboard'}
        </Button>
      </div>
    </div>
  )
}
