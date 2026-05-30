import { useEffect, useState } from 'react'
import { PERSONA_TASK_KEY } from '@/features/onboarding/founder-form/api'
import { getAuthToken } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  AdvisorIntelligence,
  type CardTone,
  cardHoverBorderClass,
} from './shared'

type PersonaCard = {
  name?: string
  age?: string
  tone?: string
  description?: string
  painPoints?: string[]
  goals?: string
}

type TamSamSomTier = {
  value?: string
  percentOfParent?: number
  description?: string
}

type PersonaResult = {
  personas?: PersonaCard[]
  stp?: {
    segmentation?: string
    targeting?: string
    positioning?: string
    geographic?: string
    demographic?: string
    psychographic?: string
    behavioral?: string
    needs?: string
  }
  advisorIntelligence?: {
    recommendation?: string
    keyPainPoint?: string
    brandMessage?: string
    marketOpportunity?: string
  }
  tamSamSom?: {
    tam?: TamSamSomTier
    sam?: TamSamSomTier
    som?: TamSamSomTier
    methodology?: string
  }
}

type TamSamSomKey = 'tam' | 'sam' | 'som'

function formatPercent(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const clamped = Math.min(100, Math.max(0, value))
  return `${clamped.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`
}

function parentLabel(key: TamSamSomKey) {
  if (key === 'tam') return 'global market'
  if (key === 'sam') return 'TAM'
  return 'SAM'
}

async function fetchTaskStatus(taskId: string) {
  const token = getAuthToken()
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}
  const res = await fetch(`/api/task-status/${taskId}`, { headers })
  if (!res.ok) throw new Error('task status failed')
  return res.json() as Promise<{
    taskId: string
    status: string
    result?: { personaData?: PersonaResult }
  }>
}

const PERSONA_DATA_KEY = 'ciq_persona_data'

function loadStoredPersonaData(): PersonaResult | null {
  try {
    const raw = localStorage.getItem(PERSONA_DATA_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersonaResult
    return Array.isArray(parsed.personas) && parsed.personas.length > 0
      ? parsed
      : null
  } catch {
    return null
  }
}

function EmptyDataState({
  message = 'Analysis pending - data will appear here after scraping completes.',
}: {
  message?: string
}) {
  return (
    <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-10 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function TamSamSomChart({
  data,
}: {
  data: NonNullable<PersonaResult['tamSamSom']>
}) {
  const tiers: Array<{
    key: TamSamSomKey
    label: string
    scope: string
    tier?: TamSamSomTier
    circleClass: string
    circleSlotClass: string
    cardClass: string
    dotClass: string
    labelClass: string
  }> = [
    {
      key: 'tam',
      label: 'TAM',
      scope: 'Total addressable market',
      tier: data.tam,
      circleClass: 'inset-0 border-chart-5/45 bg-chart-5/[0.08] text-chart-5',
      circleSlotClass: 'top-5',
      cardClass: 'border-chart-5/30 bg-chart-5/[0.07]',
      dotClass: 'bg-chart-5',
      labelClass: 'text-chart-5',
    },
    {
      key: 'sam',
      label: 'SAM',
      scope: 'Serviceable available market',
      tier: data.sam,
      circleClass:
        'inset-[17%] border-chart-4/45 bg-chart-4/[0.1] text-chart-4',
      circleSlotClass: 'top-3',
      cardClass: 'border-chart-4/30 bg-chart-4/[0.07]',
      dotClass: 'bg-chart-4',
      labelClass: 'text-chart-4',
    },
    {
      key: 'som',
      label: 'SOM',
      scope: 'Serviceable obtainable market',
      tier: data.som,
      circleClass:
        'inset-[34%] border-chart-3/50 bg-chart-3/[0.12] text-chart-3',
      circleSlotClass: 'inset-0 justify-center',
      cardClass: 'border-chart-3/30 bg-chart-3/[0.07]',
      dotClass: 'bg-chart-3',
      labelClass: 'text-chart-3',
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-center rounded-lg border bg-background-default/60 px-4 py-5">
        <div className="relative aspect-square w-full max-w-72">
          {tiers.map(({ key, label, tier, circleClass, circleSlotClass }) => {
            const percent = formatPercent(tier?.percentOfParent)
            return (
              <div
                className={cn(
                  'absolute flex rounded-full border shadow-sm',
                  circleClass,
                )}
                key={key}
              >
                <div
                  className={cn(
                    'absolute left-1/2 flex min-w-0 -translate-x-1/2 flex-col items-center text-center',
                    circleSlotClass,
                  )}
                >
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {label}
                  </span>
                  <span className="mt-1 max-w-28 truncate font-mono text-sm font-semibold leading-none tabular-nums sm:text-base">
                    {tier?.value || '-'}
                  </span>
                  {percent ? (
                    <span className="mt-1 max-w-28 truncate text-[10px] font-medium text-foreground-light">
                      {percent} of {parentLabel(key)}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {tiers.map(
          ({ key, label, scope, tier, cardClass, dotClass, labelClass }) => {
            const percent = formatPercent(tier?.percentOfParent)
            return (
              <div
                className={cn(
                  'min-w-0 rounded-lg border p-3 transition-colors',
                  cardClass,
                )}
                key={key}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn('size-2 shrink-0 rounded-full', dotClass)}
                  />
                  <p
                    className={cn(
                      'font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
                      labelClass,
                    )}
                  >
                    {label}
                  </p>
                </div>
                <p className="mt-2 truncate font-mono text-sm font-semibold tabular-nums">
                  {tier?.value || '-'}
                </p>
                <p className="mt-1 text-[11px] font-medium text-foreground-light">
                  {percent ? `${percent} of ${parentLabel(key)}` : scope}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-foreground-light">
                  {tier?.description?.trim() ||
                    'Sizing rationale unavailable yet.'}
                </p>
              </div>
            )
          },
        )}
      </div>

      {data.methodology ? (
        <p className="break-words border-t pt-2.5 text-[11px] leading-relaxed text-foreground-light">
          <span className="font-medium text-foreground-default">
            Methodology -{' '}
          </span>
          {data.methodology}
        </p>
      ) : null}
    </div>
  )
}

export function PersonaDecode() {
  const [liveData, setLiveData] = useState<PersonaResult | null>(() =>
    loadStoredPersonaData(),
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const taskId = localStorage.getItem(PERSONA_TASK_KEY)
    if (!taskId) return
    setLoading(true)

    let cancelled = false
    const poll = async () => {
      while (!cancelled) {
        await new Promise((resolve) => setTimeout(resolve, 3000))
        if (cancelled) break
        try {
          const res = await fetchTaskStatus(taskId)
          if (res.status === 'completed') {
            const data = res.result?.personaData
            if (
              data &&
              Array.isArray(data.personas) &&
              data.personas.length > 0
            ) {
              setLiveData(data)
              try {
                localStorage.setItem(PERSONA_DATA_KEY, JSON.stringify(data))
              } catch {}
            }
            localStorage.removeItem(PERSONA_TASK_KEY)
            setLoading(false)
            break
          }
          if (res.status === 'failed') {
            localStorage.removeItem(PERSONA_TASK_KEY)
            setLoading(false)
            break
          }
        } catch {
          setLoading(false)
          break
        }
      }
    }
    void poll()
    return () => {
      cancelled = true
    }
  }, [])

  const personaCards = liveData?.personas
    ? liveData.personas.map((p) => ({
        ...p,
        age: p.age ?? '',
        description: p.description ?? '',
        goals: p.goals ?? '',
        name: p.name ?? 'Unnamed Persona',
        painPoints: Array.isArray(p.painPoints) ? p.painPoints : [],
        tone: (['high', 'medium', 'growth'].includes(p.tone ?? '')
          ? p.tone
          : 'medium') as CardTone,
      }))
    : []

  const stp = liveData?.stp ?? null
  const advisor = liveData?.advisorIntelligence ?? null
  const tamSamSom = liveData?.tamSamSom ?? null

  const initials = (name: string) =>
    name
      .split(/[\s-]+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()

  const avatarToneClass: Record<CardTone, string> = {
    high: 'border-destructive-500/40 bg-destructive-500/15 text-destructive-500',
    medium:
      'border-warning-500/40 bg-warning-500/15 text-warning-600 dark:text-warning-500',
    growth:
      'border-[#98971a]/40 bg-[#98971a]/15 text-[#98971a] dark:border-[#b8bb26]/40 dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]',
  }

  return (
    <div className="grid gap-3">
      <section>
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <h2 className="break-words text-base font-semibold">User Personas</h2>
          {loading && (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
              Analyzing with AI...
            </span>
          )}
        </div>
        {personaCards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto_auto_auto]">
            {personaCards.map((persona) => (
              <article
                className={cn(
                  'relative grid gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors md:row-span-6 md:grid-rows-subgrid',
                  cardHoverBorderClass[persona.tone],
                )}
                key={persona.name}
              >
                {persona.tone === 'high' ? (
                  <span className="absolute right-3 top-0 -translate-y-1/2 rounded-full bg-background-default px-px py-px">
                    <span className="block rounded-full bg-destructive-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive-500">
                      High Priority
                    </span>
                  </span>
                ) : null}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      avatarToneClass[persona.tone],
                    )}
                  >
                    {initials(persona.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-tight">
                      {persona.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {persona.age}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground-light">
                  {persona.description}
                </p>
                <p className="-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Pain Points
                </p>
                <ul className="grid gap-1.5 pl-4 text-sm leading-relaxed text-foreground-light [&>li]:list-disc [&>li]:marker:text-muted-foreground">
                  {persona.painPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Goals
                </p>
                <p className="text-sm leading-relaxed text-foreground-light">
                  {persona.goals}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyDataState
            message={
              loading
                ? 'Analyzing customer data with AI...'
                : 'Persona analysis will appear here after market analysis completes.'
            }
          />
        )}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">
              Segmentation, Targeting, and Positioning
            </h3>
          </div>
          {loading && !stp ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
              Analyzing your market...
            </div>
          ) : stp ? (
            <>
              <div className="grid flex-1 auto-rows-fr gap-2">
                {[
                  {
                    letter: 'S',
                    title: 'Segmentation',
                    text: stp.segmentation,
                  },
                  { letter: 'T', title: 'Targeting', text: stp.targeting },
                  { letter: 'P', title: 'Positioning', text: stp.positioning },
                ]
                  .filter((row) => row.text)
                  .map((row) => (
                    <div
                      className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-stretch gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                      key={row.letter}
                    >
                      <span className="self-center text-center font-mono text-4xl font-bold leading-none text-destructive-500 sm:text-5xl">
                        {row.letter}
                      </span>
                      <div className="flex min-w-0 flex-col justify-center rounded-lg border bg-background-default px-3 py-3">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {row.title}
                        </p>
                        <p className="mt-1 break-words text-[15px] leading-relaxed text-foreground-light">
                          {row.text}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 grid gap-1.5">
                {[
                  { title: 'Geographic', text: stp.geographic },
                  { title: 'Demographic', text: stp.demographic },
                  { title: 'Psychographic', text: stp.psychographic },
                  { title: 'Behavioral', text: stp.behavioral },
                  { title: 'Needs', text: stp.needs },
                ]
                  .filter((item) => item.text)
                  .map((item) => (
                    <div
                      className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] lg:grid-cols-[8rem_minmax(0,1fr)]"
                      key={item.title}
                    >
                      <div className="flex items-center break-words rounded-lg bg-destructive-500/15 px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive-500 sm:px-3 sm:text-[11px] sm:tracking-[0.16em]">
                        {item.title}
                      </div>
                      <p className="min-w-0 break-words rounded-lg border bg-background-default px-3 py-2 text-sm leading-relaxed text-foreground-light">
                        {item.text}
                      </p>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <EmptyDataState message="STP analysis will appear after persona decode completes." />
          )}
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">TAM / SAM / SOM</h3>
          </div>
          {tamSamSom && (tamSamSom.tam || tamSamSom.sam || tamSamSom.som) ? (
            <TamSamSomChart data={tamSamSom} />
          ) : (
            <EmptyDataState
              message={
                loading
                  ? 'Calculating market sizing...'
                  : 'Market sizing will appear after analysis completes.'
              }
            />
          )}
        </section>
      </div>

      {advisor ? (
        <AdvisorIntelligence
          recommendation={advisor.recommendation ?? ''}
          signals={[
            { label: 'Key Pain Point', value: advisor.keyPainPoint ?? '-' },
            { label: 'Brand Message', value: advisor.brandMessage ?? '-' },
            {
              label: 'Market Opportunity',
              value: advisor.marketOpportunity ?? '-',
            },
          ]}
        />
      ) : (
        <section className="relative min-w-0 overflow-hidden rounded-xl border border-chart-5/25 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-chart-5/70 to-chart-4/60" />
          <div className="relative p-4 xl:p-5">
            <p className="bg-gradient-to-r from-chart-5 to-chart-4 bg-clip-text text-base font-semibold tracking-tight text-transparent">
              Advisor Intelligence
            </p>
            <div className="mt-4">
              <EmptyDataState message="Strategic recommendations will appear after analysis completes." />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
