import { useEffect, useState } from 'react'
import { CheckCircle2, Database, LoaderCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MiniMetric, ProgressBar } from './shared'

type GeneratingStepProps = {
  onComplete: () => void
  submitStatus: 'idle' | 'submitting' | 'success' | 'error'
  formId: string | null
}

export function GeneratingStep({
  onComplete,
  submitStatus,
  formId,
}: GeneratingStepProps) {
  const [progress, setProgress] = useState(18)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => setIsVisible(true))
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 93) {
          window.clearInterval(progressTimer)
          return 93
        }

        return Math.min(93, current + 5)
      })
    }, 180)

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.clearInterval(progressTimer)
    }
  }, [])

  const processRows = [
    'Establishing secure connection',
    'Connecting API infrastructure',
    'Syncing historical market data',
    'Optimizing predictive algorithms',
    'Running Bright Data synthesis',
  ]
  const activeIndex = Math.min(
    processRows.length - 1,
    Math.floor((progress / 100) * processRows.length),
  )
  const ringAngle = progress * 3.6

  return (
    <div className="w-full max-w-3xl text-center">
      <ProgressBar value={progress} />
      <h1
        className={cn(
          'mt-12 text-3xl font-semibold tracking-tight transition-all duration-500 ease-out',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        Building your Intelligence Engine...
      </h1>
      <p
        className={cn(
          'mx-auto mt-4 max-w-sm text-muted-foreground transition-all delay-100 duration-500 ease-out',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        )}
      >
        We're synthesizing your custom market parameters into a live,
        predictive data model.
      </p>

      <div
        className={cn(
          'relative mx-auto mt-12 grid size-44 place-items-center transition-all delay-150 duration-700 ease-out will-change-transform',
          isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0',
        )}
      >
        <div
          className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
          style={{
            background: `conic-gradient(var(--foreground) ${ringAngle}deg, var(--muted) ${ringAngle}deg 360deg)`,
          }}
        />
        <div className="absolute inset-[18px] rounded-full bg-background" />
        <div
          className="absolute -inset-2 rounded-full border border-transparent border-t-foreground/80"
          style={{ animation: 'spin 1.6s linear infinite' }}
        />
        <div
          className="absolute inset-5 rounded-full border border-border/70"
          style={{ animation: 'pulse 1.8s ease-in-out infinite' }}
        />
        <span className="relative text-3xl font-semibold">93%</span>
      </div>

      <div
        className={cn(
          'mx-auto mt-10 max-w-xl rounded-xl border bg-card p-5 text-left transition-all delay-200 duration-500 ease-out',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.22em]">
            System Processes
          </p>
          <p className="font-mono text-xs">{activeIndex + 1}/5 Active</p>
        </div>
        {processRows.map((label, index) => {
          const status =
            progress >= 93 || index < activeIndex
              ? 'DONE'
              : index === activeIndex
                ? 'RUNNING'
                : 'QUEUED'

          return (
            <div
              className={cn(
                'flex items-center justify-between py-2 text-sm transition-all duration-500 ease-out',
                isVisible ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0',
              )}
              key={label}
              style={{ transitionDelay: `${250 + index * 90}ms` }}
            >
              <span className="flex items-center gap-3">
                {status === 'DONE' ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <LoaderCircle
                    className="size-4"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                )}
                {label}
              </span>
              <span
                className={cn(
                  'rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground',
                )}
                style={
                  status !== 'DONE'
                    ? { animation: 'pulse 1.4s ease-in-out infinite' }
                    : undefined
                }
              >
                {status}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-9 grid justify-items-center gap-3">
        {submitStatus === 'success' && formId ? (
          <div className="rounded-lg border bg-card px-4 py-3 text-sm">
            <span className="text-muted-foreground">Form id</span>
            <span className="ml-2 font-semibold text-foreground">{formId}</span>
          </div>
        ) : null}
        {submitStatus === 'error' ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Submission failed. Please retry.
          </div>
        ) : null}
        <Button
          className={cn(
            'h-12 min-w-56 bg-foreground text-background transition-all duration-300 hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.99]',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          )}
          onClick={onComplete}
          disabled={submitStatus === 'submitting'}
        >
          {submitStatus === 'submitting'
            ? 'Submitting...'
            : submitStatus === 'success'
              ? 'Continue to dashboard'
              : submitStatus === 'error'
                ? 'Retry submission'
                : 'Launch Dashboard'}
        </Button>
      </div>
      <div
        className={cn(
          'mx-auto mt-7 grid max-w-xl gap-4 transition-all delay-300 duration-500 ease-out sm:grid-cols-2',
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
      >
        <MiniMetric icon={<Zap className="size-5" />} label="Speed" value="0.4s Latency" />
        <MiniMetric
          icon={<Database className="size-5" />}
          label="Data Points"
          value="12.4M Analyzed"
        />
      </div>
    </div>
  )
}
