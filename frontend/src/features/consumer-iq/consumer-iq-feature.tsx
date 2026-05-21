import { nanoid } from 'nanoid'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  Compass,
  Database,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { PanelImperativeHandle } from 'react-resizable-panels'
import { toast } from 'sonner'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { ChatComposer } from '@/features/llm-chat/components/chat-composer'
import { ChatConversation } from '@/features/llm-chat/components/chat-conversation'
import { ChatPanel } from '@/features/llm-chat/components/chat-panel'
import { SuggestionList } from '@/features/llm-chat/components/suggestion-list'
import { initialMessages, suggestions } from '@/features/llm-chat/data/chat-content'
import { buildMockResponse, delay } from '@/features/llm-chat/lib/mock-streaming'
import type { ChatStatus, MessageType } from '@/features/llm-chat/types'
import { cn } from '@/lib/utils'
import {
  AnalysisStep,
  GeneratingStep,
  SignupStep,
  WhiteSpaceStep,
} from './founder-form'
import { submitFounderForm } from './founder-form/api'
import type { FounderFormPayload, FounderFormState } from './founder-form/types'

const STREAM_FRAME_MS = 16
const STREAM_CHARS_PER_FRAME = 8

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pulse', label: 'Demand Pulse', icon: TrendingUp },
  { id: 'persona', label: 'Persona Decode', icon: Users },
  { id: 'competitor', label: 'Competitor Mirror', icon: Target },
  { id: 'compass', label: 'Launch Compass', icon: Compass },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

const pipelineSteps = [
  { label: 'Marketplaces', icon: Globe2, caption: 'External Source' },
  { label: 'Web Unlocker', icon: ShieldCheck, caption: 'Anti Bot Bypass' },
  { label: 'Parsers', icon: FileText, caption: 'Schema Mapping' },
  { label: 'Data Lake', icon: Database, caption: 'Caches & Diffs' },
  { label: 'Frontend', icon: BarChart3, caption: 'Presentation' },
] as const

type DashboardSection = (typeof navItems)[number]['id']

export function ConsumerIQExperience() {
  const [isOnboarded, setIsOnboarded] = useState(false)
  const chatPanelRef = useRef<PanelImperativeHandle>(null)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const handleToggleChat = useCallback(() => {
    if (isChatOpen) {
      chatPanelRef.current?.collapse()
      setIsChatOpen(false)
      return
    }

    chatPanelRef.current?.expand()
    setIsChatOpen(true)
  }, [isChatOpen])

  if (!isOnboarded) {
    return <ConsumerIQOnboarding onComplete={() => setIsOnboarded(true)} />
  }

  if (!isDesktop) {
    return (
      <main className="h-screen overflow-hidden bg-background text-foreground">
        <ConsumerIQDashboard className="h-screen" />
      </main>
    )
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <ResizablePanelGroup
        className="h-screen min-h-0"
        orientation="horizontal"
      >
        <ResizablePanel className="min-w-0" defaultSize="68%" minSize="46%">
          <ConsumerIQDashboard className="h-screen" />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          className="min-w-0"
          collapsedSize="4%"
          collapsible
          defaultSize="32%"
          maxSize="42%"
          minSize="26%"
          onResize={(panelSize: { asPercentage: number }) => {
            setIsChatOpen(panelSize.asPercentage > 6)
          }}
          panelRef={chatPanelRef}
        >
          <FounderChat isOpen={isChatOpen} onToggle={handleToggleChat} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const handleChange = () => setMatches(media.matches)

    handleChange()
    media.addEventListener('change', handleChange)

    return () => media.removeEventListener('change', handleChange)
  }, [query])

  return matches
}

function AnimatedPage({
  children,
  className,
  transitionKey,
}: {
  children: ReactNode
  className?: string
  transitionKey: string | number
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(false)

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true))
    })

    return () => window.cancelAnimationFrame(firstFrame)
  }, [transitionKey])

  return (
    <div
      className={cn(
        'will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        isVisible
          ? 'translate-y-0 scale-100 opacity-100 blur-0'
          : 'translate-y-4 scale-[0.985] opacity-0 blur-[1px]',
        className,
      )}
      key={transitionKey}
    >
      {children}
    </div>
  )
}

export function ConsumerIQOnboarding({
  onComplete,
}: {
  onComplete: () => void
}) {
  const [step, setStep] = useState(1)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FounderFormState>({
    fullName: '',
    workEmail: '',
    password: '',
    workspaceName: '',
    industry: '',
    region: '',
    marketplace: '',
    competitors: ['', '', ''],
    searchIntentKeywords: '',
    customerSegment: '',
    painPoint: '',
    priceRangeMin: 89000,
    priceRangeMax: 159000,
  })

  const updateField = useCallback(
    <T extends keyof FounderFormState>(field: T, value: FounderFormState[T]) => {
      setFormState((current: FounderFormState) => ({
        ...current,
        [field]: value,
      }))
    },
    [],
  )

  const updateCompetitor = useCallback((index: number, value: string) => {
    setFormState((current: FounderFormState) => {
      const nextCompetitors = [...current.competitors]
      nextCompetitors[index] = value
      return { ...current, competitors: nextCompetitors }
    })
  }, [])

  const handleComplete = useCallback(async () => {
    if (submitStatus === 'success') {
      onComplete()
      return
    }

    if (submitStatus === 'submitting') {
      return
    }

    setSubmitStatus('submitting')
    setSubmittedFormId(null)

    const payload: FounderFormPayload = {
      fullName: formState.fullName,
      workEmail: formState.workEmail,
      password: formState.password,
      workspaceName: formState.workspaceName,
      industry: formState.industry,
      region: formState.region,
      marketplace: formState.marketplace,
      competitors: formState.competitors
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      searchIntentKeywords: formState.searchIntentKeywords
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      customerSegment: formState.customerSegment,
      painPoint: formState.painPoint,
      priceRangeMin: formState.priceRangeMin,
      priceRangeMax: formState.priceRangeMax,
    }

    try {
      const response = await submitFounderForm(payload)
      setSubmittedFormId(response.id)
      setSubmitStatus('success')
    } catch (error) {
      setSubmitStatus('error')
      toast.error('Unable to submit the founder form')
    }
  }, [formState, onComplete, submitStatus])

  const isSignupValid =
    formState.fullName.trim().length > 0 &&
    formState.workEmail.includes('@') &&
    formState.password.trim().length >= 8
  const isAnalysisValid =
    formState.workspaceName.trim().length > 0 &&
    formState.industry.trim().length > 0 &&
    formState.region.trim().length > 0 &&
    formState.marketplace.trim().length > 0
  const isWhiteSpaceValid =
    formState.competitors.some((entry: string) => entry.trim().length > 0) &&
    formState.searchIntentKeywords.trim().length > 0 &&
    formState.customerSegment.trim().length > 0 &&
    formState.painPoint.trim().length > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <AnimatedPage className="flex w-full justify-center" transitionKey={step}>
          {step === 1 ? (
            <SignupStep
              onNext={() => setStep(2)}
              fullName={formState.fullName}
              workEmail={formState.workEmail}
              password={formState.password}
              onFullNameChange={(value) => updateField('fullName', value)}
              onWorkEmailChange={(value) => updateField('workEmail', value)}
              onPasswordChange={(value) => updateField('password', value)}
              isNextDisabled={!isSignupValid}
            />
          ) : step === 2 ? (
            <AnalysisStep
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              region={formState.region}
              marketplace={formState.marketplace}
              onWorkspaceNameChange={(value) =>
                updateField('workspaceName', value)
              }
              onIndustryChange={(value) => updateField('industry', value)}
              onRegionChange={(value) => updateField('region', value)}
              onMarketplaceChange={(value) => updateField('marketplace', value)}
              isNextDisabled={!isAnalysisValid}
            />
          ) : step === 3 ? (
            <WhiteSpaceStep
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              competitors={formState.competitors}
              searchIntentKeywords={formState.searchIntentKeywords}
              customerSegment={formState.customerSegment}
              painPoint={formState.painPoint}
              onCompetitorChange={updateCompetitor}
              onSearchIntentKeywordsChange={(value) =>
                updateField('searchIntentKeywords', value)
              }
              onCustomerSegmentChange={(value) =>
                updateField('customerSegment', value)
              }
              onPainPointChange={(value) => updateField('painPoint', value)}
              isNextDisabled={!isWhiteSpaceValid}
            />
          ) : (
            <GeneratingStep
              onComplete={handleComplete}
              submitStatus={submitStatus}
              formId={submittedFormId}
            />
          )}
        </AnimatedPage>
      </div>
    </main>
  )
}

export function ConsumerIQDashboard({ className }: { className?: string }) {
  const [active, setActive] = useState<DashboardSection>('dashboard')
  const isNavDesktop = useMediaQuery('(min-width: 768px)')
  const ActiveIcon = navItems.find((item) => item.id === active)?.icon ?? Search

  return (
    <section
      className={cn(
        'flex h-full min-h-0 overflow-hidden bg-background text-foreground',
        className,
      )}
    >
      {isNavDesktop ? (
        <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-sidebar px-5 py-6 text-sidebar-foreground">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">ConsumerIQ</h1>
            <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Market Intelligence
            </p>
          </div>

          <nav className="mt-10 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = active === item.id

              return (
                <button
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors duration-200 ease-out',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto border-t pt-6">
            <Button className="w-full bg-foreground text-background hover:bg-foreground/90">
              <MessageSquare className="size-4" />
              Founder Chat
            </Button>
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-5">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 border-border bg-muted/40 pl-9"
              placeholder="Search insights..."
            />
          </div>

          <div className="ml-4 flex items-center gap-3">
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground xl:flex">
              <span className="font-medium text-foreground">Overview</span>
              <span>Network</span>
              <span>Status</span>
            </nav>
            <Button className="hidden bg-foreground text-background hover:bg-foreground/90 sm:inline-flex">
              New Project
            </Button>
            <Bell className="size-5 text-muted-foreground" />
            <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              JD
            </div>
          </div>
        </header>

        {!isNavDesktop ? (
          <MobileSectionNav active={active} onChange={setActive} />
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-5 py-8">
            <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  Analysis <ChevronRight className="size-3" />
                  <span className="font-medium text-foreground">
                    {navItems.find((item) => item.id === active)?.label}
                  </span>
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {getSectionTitle(active)}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {getSectionLabel(active)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button variant="outline">
                  <CalendarDays className="size-4" />
                  Last 30 Days
                </Button>
                <Button className="bg-foreground text-background hover:bg-foreground/90">
                  <ActiveIcon className="size-4" />
                  Analyze
                </Button>
              </div>
            </div>

            <AnimatedPage transitionKey={active}>
              {active === 'dashboard' && <MarketOverview />}
              {active === 'pulse' && <DemandPulse />}
              {active === 'persona' && <PersonaDecode />}
              {active === 'competitor' && <CompetitorMirror />}
              {active === 'compass' && <LaunchCompass />}
              {active === 'settings' && <DataSettings />}
            </AnimatedPage>
          </div>
        </main>
      </div>
    </section>
  )
}

function FounderChat({
  className,
  isOpen,
  onToggle,
}: {
  className?: string
  isOpen: boolean
  onToggle: () => void
}) {
  const streamAbortRef = useRef(false)
  const pendingResponseTimeoutRef = useRef<number | null>(null)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [messages, setMessages] = useState<MessageType[]>(initialMessages)
  const [, setStreamingMessageId] = useState<string | null>(null)

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (message.versions.some((version) => version.id === messageId)) {
            return {
              ...message,
              versions: message.versions.map((version) =>
                version.id === messageId
                  ? { ...version, content: newContent }
                  : version,
              ),
            }
          }

          return message
        }),
      )
    },
    [],
  )

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      streamAbortRef.current = false
      setStatus('streaming')
      setStreamingMessageId(messageId)

      let currentContent = ''

      for (
        let index = STREAM_CHARS_PER_FRAME;
        index <= content.length + STREAM_CHARS_PER_FRAME;
        index += STREAM_CHARS_PER_FRAME
      ) {
        if (streamAbortRef.current) {
          setStatus('ready')
          setStreamingMessageId(null)
          return
        }

        currentContent = content.slice(0, index)
        updateMessageContent(messageId, currentContent)
        await delay(STREAM_FRAME_MS)
      }

      setStatus('ready')
      setStreamingMessageId(null)
    },
    [updateMessageContent],
  )

  const addUserMessage = useCallback(
    (content: string) => {
      const prompt = content.trim() || 'Sent with attachments'
      const userMessage: MessageType = {
        from: 'user',
        key: nanoid(),
        versions: [{ content: prompt, id: nanoid() }],
      }

      streamAbortRef.current = false
      setMessages((previousMessages) => [...previousMessages, userMessage])

      pendingResponseTimeoutRef.current = window.setTimeout(() => {
        pendingResponseTimeoutRef.current = null

        if (streamAbortRef.current) {
          return
        }

        const assistantMessageId = nanoid()
        const assistantMessage: MessageType = {
          from: 'assistant',
          key: nanoid(),
          reasoning: {
            content:
              'I treated the prompt as an insights request, selected the most relevant seeded ConsumerIQ patterns, then prepared a concise response for an analyst workflow.',
            duration: 5,
          },
          versions: [{ content: '', id: assistantMessageId }],
        }

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantMessage,
        ])
        void streamResponse(assistantMessageId, buildMockResponse(prompt))
      }, 500)
    },
    [streamResponse],
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (status !== 'ready') {
        return
      }

      const prompt = message.text.trim()
      const hasText = Boolean(prompt)
      const hasAttachments = Boolean(message.files.length)

      if (!(hasText || hasAttachments)) {
        return
      }

      setStatus('submitted')

      if (hasAttachments) {
        toast.success('Files attached', {
          description: `${message.files.length} file(s) attached to message`,
        })
      }

      addUserMessage(prompt || 'Sent with attachments')
      setText('')
    },
    [addUserMessage, status],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (status !== 'ready') {
        return
      }

      setStatus('submitted')
      addUserMessage(suggestion)
    },
    [addUserMessage, status],
  )

  const handleStop = useCallback(() => {
    streamAbortRef.current = true

    if (pendingResponseTimeoutRef.current !== null) {
      window.clearTimeout(pendingResponseTimeoutRef.current)
      pendingResponseTimeoutRef.current = null
    }

    setStatus('ready')
    setStreamingMessageId(null)
    toast.info('Response stopped')
  }, [])

  useEffect(
    () => () => {
      streamAbortRef.current = true

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current)
      }
    },
    [],
  )

  return (
    <div className={cn('h-full min-h-0 bg-background', className)}>
      <ChatPanel
        className="!h-full !min-h-0 transition-[width] duration-200 ease-out"
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div className="relative flex size-full min-h-0 flex-col divide-y overflow-hidden">
          <ChatConversation messages={messages} />
          <div className="grid shrink-0 gap-4 pt-4">
            <SuggestionList
              disabled={status !== 'ready'}
              onSuggestionClick={handleSuggestionClick}
              suggestions={suggestions}
            />
            <ChatComposer
              onStop={handleStop}
              onSubmit={handleSubmit}
              onTextChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setText(event.target.value)
              }
              status={status}
              text={text}
            />
          </div>
        </div>
      </ChatPanel>
    </div>
  )
}

function MobileSectionNav({
  active,
  onChange,
}: {
  active: DashboardSection
  onChange: (section: DashboardSection) => void
}) {
  return (
    <div className="shrink-0 overflow-x-auto border-b bg-background px-4 py-3 md:hidden">
      <div className="flex min-w-max gap-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id

          return (
            <button
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-card text-muted-foreground',
              )}
              key={item.id}
              onClick={() => onChange(item.id)}
              type="button"
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MarketOverview() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-4">
        <MetricCard
          label="Trend Velocity"
          status="+12% from last month"
          title="+67%"
          tone="success"
        />
        <MetricCard
          label="Est. Demand"
          status="High confidence signal"
          title="12.4K"
        />
        <MetricCard label="Price Target" status="Optimal market fit" title="Rp119K" />
        <MetricCard label="Market Gaps" status="High potential entry" title="3 Found" tone="danger" />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-6">
        <Panel title="Marketplace Pulse" subtitle="Real-time SKU tracking across platforms">
          <div className="mb-4 flex gap-2">
            {['Shopee', 'Lazada', 'TikTok'].map((item, index) => (
              <span
                className={cn(
                  'rounded-md border px-3 py-1 text-xs font-medium',
                  index === 0 && 'bg-muted text-foreground',
                )}
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            {[
              ['Hyalu-Boost B5', 'GlowIndo Official', 'Rp125,000', '82%', '+12.4%'],
              ['Aqua-Lock Serum', 'DewySkin Lab', 'Rp98,000', 'Low Stock', '+28.1%'],
              ['Ceramide+ Intense', 'Purendo Wellness', 'Rp142,000', '55%', '-1.2%'],
            ].map((row) => (
              <div
                className="grid grid-cols-[1.3fr_0.8fr_1fr_0.7fr] items-center border-b px-5 py-4 text-sm last:border-b-0"
                key={row[0]}
              >
                <div>
                  <p className="font-semibold">{row[0]}</p>
                  <p className="text-xs text-muted-foreground">{row[1]}</p>
                </div>
                <p className="font-medium">{row[2]}</p>
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-20 rounded-full bg-muted">
                    <span className="block h-full w-2/3 rounded-full bg-foreground" />
                  </span>
                  <span className="text-xs">{row[3]}</span>
                </div>
                <p
                  className={cn(
                    'text-right font-medium',
                    row[4].startsWith('+') ? 'text-chart-4' : 'text-muted-foreground',
                  )}
                >
                  {row[4]}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Demand Density" subtitle="Geographic distribution of interest">
          <MapCard />
          <RegionBars
            rows={[
              ['Jabodetabek', 58.2],
              ['Surabaya', 19.4],
              ['Bandung', 12.1],
            ]}
          />
        </Panel>
      </div>
    </div>
  )
}

function DemandPulse() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
      <Panel title="Trend Velocity Index" subtitle="Global aggregate interest momentum">
        <LineGraph />
        <div className="mt-8 flex items-end justify-between border-t pt-6">
          <div className="grid grid-cols-2 gap-12">
            <SmallStat label="Current Velocity" value="42.8m/s" />
            <SmallStat label="Acceleration" value="+12.4%" tone="danger" />
          </div>
          <Button variant="ghost">
            Export SVGs
            <Download className="size-4" />
          </Button>
        </div>
      </Panel>

      <Panel title="Top Rising Formats">
        <div className="grid gap-3">
          {[
            ['Hydrating Serum', '+88%', '42% of total reach'],
            ['Ceramide Barrier', '+54%', '12% penetration'],
            ['Sensitive Skin SPF', '+31%', 'High LTV segments'],
          ].map(([name, growth, caption]) => (
            <div className="rounded-lg border p-4" key={name}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{name}</p>
                <p className="text-xl font-semibold">{growth}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Marketplace Share" subtitle="Dominance by platform segment">
        <div className="flex items-center gap-8">
          <div className="grid size-36 place-items-center rounded-full border-[18px] border-foreground border-l-muted">
            <div className="text-center">
              <p className="text-2xl font-semibold">64%</p>
              <p className="text-[10px] uppercase tracking-[0.16em]">Leader</p>
            </div>
          </div>
          <div className="grid flex-1 gap-3 text-sm">
            <Legend label="Shopee" value="64.2%" />
            <Legend label="Tokopedia" value="22.8%" muted />
            <Legend label="TikTok Shop" value="13.0%" muted />
          </div>
        </div>
      </Panel>

      <div className="rounded-xl bg-foreground p-6 text-background">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Search Intent Analysis</h3>
            <p className="text-xs opacity-70">Live SERP clustering</p>
          </div>
          <span className="rounded bg-background/10 px-2 py-1 text-[10px] uppercase">
            Live
          </span>
        </div>
        {[
          ['"hydrating serum spf"', 'Commercial', '144K'],
          ['"serum kulit sensitif"', 'Informational', '82K'],
          ['"ceramide serum murah"', 'Transactional', '36K'],
        ].map(([keyword, intent, volume]) => (
          <div className="mb-3 rounded-lg border border-background/20 p-4" key={keyword}>
            <div className="flex items-center justify-between">
              <p className="font-medium">{keyword}</p>
              <ArrowRight className="size-4 opacity-70" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] uppercase">
              <span className="rounded bg-background/15 px-2 py-1">{intent}</span>
              <span className="rounded bg-background/15 px-2 py-1">Volume: {volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PersonaDecode() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
      <div className="rounded-xl bg-foreground p-8 text-background">
        <div className="flex items-center gap-2">
          <span className="rounded bg-background/15 px-2 py-1 text-[10px] font-semibold uppercase">
            Target Segment
          </span>
          <span className="size-2 rounded-full bg-chart-4" />
          <span className="text-xs">High Priority</span>
        </div>
        <h3 className="mt-8 text-2xl font-semibold">Stressed Young Professional</h3>
        <p className="mt-4 max-w-xl text-sm leading-7 opacity-90">
          High-income urban buyers prioritize trustworthy efficacy over lowest
          price. They react strongly to barrier repair claims and are likely to
          repurchase premium hydrating products every 6-8 weeks.
        </p>
        <div className="mt-24 grid grid-cols-3 gap-5">
          <SmallStat label="Market Size" value="1.2M" />
          <SmallStat label="Avg. LTV" value="$4.8K" />
          <SmallStat label="Churn Risk" value="12.4%" />
        </div>
      </div>

      <Panel title="Pain Point Clusters">
        <div className="grid gap-4">
          {[
            ['AC Dehydration', '88% mention dry office skin by 4 PM', 'Major', 88],
            ['Barrier Damage', 'Users switch between 4+ actives per week', 'Mid', 67],
            ['Packaging Leakage', 'High complaint rate in marketplace reviews', 'Low', 42],
          ].map(([name, desc, severity, width]) => (
            <div className="rounded-lg border bg-muted/40 p-4" key={name}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{name}</p>
                <span className="rounded bg-card px-2 py-1 text-[10px] font-semibold uppercase">
                  {severity}
                </span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${width}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Willingness-to-Pay Range" subtitle="Price elasticity across the segment">
        <BarGraph />
      </Panel>

      <Panel title="Demographic Mix">
        <div className="grid gap-6">
          <IconStat icon={<Globe2 />} label="Primary Region" value="Jabodetabek (72%)" />
          <IconStat icon={<CalendarDays />} label="Age Median" value="23 - 30 Years" />
          <IconStat icon={<MessageSquare />} label="Dominant Platform" value="Shopee & TikTok (84%)" />
          <Button variant="outline">View Raw Data</Button>
        </div>
      </Panel>
    </div>
  )
}

function CompetitorMirror() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
        <Panel title="Search Share of Voice (SOV)">
          <SovGraph />
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <InfoTile label="Leader" value="Skintific" caption="+12.4%" />
            <InfoTile label="Growth Leader" value="Somethinc" caption="+28.1%" />
            <InfoTile label="Keyword Gap" value="420" caption="Opportunities" />
            <InfoTile label="Ad Spend" value="$12.5k" caption="Daily Avg" />
          </div>
        </Panel>
        <Panel title="Price Alerts">
          <div className="grid gap-3">
            {[
              ['Skintific', 'Mugwort Mask 55g', '$12.90', '-28%'],
              ['Somethinc', 'Low pH Cleanser 100ml', '$11.20', '-20%'],
              ['Avoskin', 'Refining Toner', '$15.40', '-30%'],
            ].map(([brand, sku, price, drop]) => (
              <div className="rounded-lg border p-4" key={sku}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded bg-muted px-2 py-1 text-[10px]">
                      {brand}
                    </span>
                    <p className="mt-2 text-sm font-semibold">{sku}</p>
                    <p className="font-semibold">{price}</p>
                  </div>
                  <span className="text-xs text-destructive">{drop}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Competitor Matrix">
        <div className="overflow-hidden rounded-lg border">
          {[
            ['Somethinc', '7.8', 'High Local Affinity', '$4.2M', 'Mainstream Leader'],
            ['Avoskin', '8.2', 'Clean Formulation', '$3.1M', 'Steady Challenger'],
            ['Skintific', '9.1', 'Supply Chain Edge', '$6.8M', 'Fast Growth Giant'],
          ].map((row) => (
            <div
              className="grid grid-cols-[1.4fr_0.8fr_1.2fr_0.8fr_1fr_0.5fr] items-center border-b px-5 py-4 text-sm last:border-b-0"
              key={row[0]}
            >
              <p className="font-semibold">{row[0]}</p>
              <p>{row[1]}</p>
              <span className="w-fit rounded-full border px-2 py-1 text-xs">
                {row[2]}
              </span>
              <p>{row[3]}</p>
              <p className="text-chart-4">{row[4]}</p>
              <Button size="sm" variant="ghost">Analyze</Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function LaunchCompass() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
        <Panel>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-8">
            <div>
              <span className="rounded bg-foreground px-2 py-1 text-[10px] font-semibold uppercase text-background">
                AI Recommended Decision
              </span>
              <h3 className="mt-6 text-5xl font-semibold leading-none tracking-tight">
                GO TO
                <br />
                MARKET
              </h3>
              <p className="mt-6 max-w-sm leading-7 text-muted-foreground">
                All primary indicators align for a high-impact launch. Demand
                signals in the target demographic have peaked at a 24-month high.
              </p>
              <div className="mt-7 flex gap-3">
                <Button className="bg-foreground text-background hover:bg-foreground/90">
                  Initiate Rollout
                </Button>
                <Button variant="outline">Export Logic</Button>
              </div>
            </div>
            <div className="grid place-items-center border-l">
              <div className="text-center">
                <div className="mx-auto grid size-36 place-items-center rounded-full border-[14px] border-foreground border-r-muted">
                  <div>
                    <p className="text-4xl font-semibold">92</p>
                    <p className="text-[10px] uppercase tracking-[0.18em]">
                      Score
                    </p>
                  </div>
                </div>
                <p className="mt-6 font-semibold">Market Gap Score</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Extreme validation against current competitor saturation.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Pricing Strategy">
          <div className="rounded-lg border bg-muted/30 p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">Introductory Tier</span>
              <p className="text-2xl font-semibold">Rp119K</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Penetration pricing model with 35% margin floor.
            </p>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs">
              <span>Elasticity Range</span>
              <span>Rp89K - Rp159K</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-foreground" />
            </div>
          </div>
          <Button className="mt-6 w-full" variant="outline">
            Review Profit Models
          </Button>
        </Panel>
      </div>

      <Panel title="Channel Rollout Sequence" subtitle="Prioritized phases based on CAC efficiency">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] gap-4">
          {[
            ['1', 'Shopee Beta', 'Top 500 wishlist users'],
            ['2', 'Organic Search', 'SEO keyword injection'],
            ['3', 'TikTok Amplify', 'Creator affiliate test'],
            ['4', 'Mass Market', 'Lazada expansion'],
          ].map(([num, title, desc], index) => (
            <div className="rounded-lg border p-5" key={title}>
              <div
                className={cn(
                  'mb-5 grid size-9 place-items-center rounded-full border font-semibold',
                  index === 0 && 'bg-foreground text-background',
                )}
              >
                {num}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em]">
                {title}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
        <Panel title="Strategic Moat Analysis">
          <div className="grid gap-3">
            <MoatRow icon={<Lock />} label="Data Propriety" value="High" />
            <MoatRow icon={<Zap />} label="Execution Velocity" value="Extreme" />
            <MoatRow icon={<Sparkles />} label="Switching Costs" value="Medium" />
          </div>
        </Panel>
        <Panel title="Intelligence Feed" subtitle="Global market signals tracked hourly">
          {[
            'Beauty challenger adjusts pricing for Southeast Asia.',
            'Consumer interest in sensitive skin spikes +12%.',
            'Search trend for ceramide barrier continues upward.',
          ].map((item, index) => (
            <div className="border-b py-4 text-sm last:border-b-0" key={item}>
              <p className="text-xs text-muted-foreground">
                {index === 0 ? '2m ago' : index === 1 ? '15m ago' : '1h ago'}
              </p>
              <p className="mt-1 font-medium">{item}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  )
}

function DataSettings() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,23rem),1fr))] gap-6">
        <Panel title="Network Health">
          <div className="grid gap-4 text-sm">
            <HealthRow label="Bright Data" value="99.9% Uptime" />
            <HealthRow label="Shopee Connect" value="12ms" />
            <HealthRow label="Tokopedia Stream" value="18ms" />
          </div>
          <Button className="mt-6" variant="ghost">
            View incident history
            <ArrowRight className="size-4" />
          </Button>
        </Panel>

        <Panel title="Pipeline Architecture" subtitle="v4.2.0-stable">
          <div className="grid gap-4 md:grid-cols-5">
            {pipelineSteps.map(({ caption, icon: Icon, label }) => {
              return (
                <div className="text-center" key={label}>
                  <div className="mx-auto grid size-12 place-items-center rounded-lg border bg-card">
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{caption}</p>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Bright Data Integrations">
        <div className="overflow-hidden rounded-lg border">
          {[
            ['SERP API', 'Google/Bing organic ranks', 'Active', '2 mins ago', '42.5k req', '120ms'],
            ['Web Scraper API', 'Shopee storefronts', 'Active', '15 mins ago', '1.2M req', '850ms'],
            ['Scraper Studio', 'Custom Tokopedia parser', 'Throttled', '1 hr ago', '850k req', '2.4s'],
            ['Web Unlocker', 'Bypass anti-bot systems', 'Active', 'Real-time', '500k req', '45ms'],
          ].map((row) => (
            <div
              className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.7fr] items-center border-b px-5 py-4 text-sm last:border-b-0"
              key={row[0]}
            >
              <div>
                <p className="font-semibold">{row[0]}</p>
                <p className="text-xs text-muted-foreground">{row[1]}</p>
              </div>
              <span
                className={cn(
                  'w-fit rounded border px-2 py-1 text-xs',
                  row[2] === 'Active'
                    ? 'border-chart-4/40 text-chart-4'
                    : 'border-chart-3/40 text-chart-3',
                )}
              >
                {row[2]}
              </span>
              <p>{row[3]}</p>
              <p>{row[4]}</p>
              <p className={row[5] === '2.4s' ? 'text-destructive' : ''}>
                {row[5]}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function getSectionTitle(section: DashboardSection) {
  switch (section) {
    case 'dashboard':
      return 'Market Intelligence'
    case 'pulse':
      return 'Demand Pulse'
    case 'persona':
      return 'Persona Decode'
    case 'competitor':
      return 'Competitor Mirror'
    case 'compass':
      return 'Launch Compass'
    case 'settings':
      return 'Data Sources & Infrastructure'
  }
}

function getSectionLabel(section: DashboardSection) {
  switch (section) {
    case 'dashboard':
      return 'Pusat kendali data pasar dengan metrik Trend Velocity, Estimated Demand, dan Market Gaps.'
    case 'pulse':
      return 'Analisis real-time pergerakan tren dan sinyal pencarian konsumen (SERP data).'
    case 'persona':
      return 'Segmentasi mendalam dan pemetaan perilaku pembeli berdasarkan ekstraksi ulasan.'
    case 'competitor':
      return 'Monitoring performa relatif, harga, dan Share of Voice dibandingkan pesaing.'
    case 'compass':
      return 'Strategi peluncuran optimal dengan rekomendasi Go-to-Market berbasis data.'
    case 'settings':
      return 'Transparansi teknis infrastruktur Bright Data (Web Unlocker, Scraper API, dll).'
  }
}

function Panel({
  children,
  subtitle,
  title,
}: {
  children: ReactNode
  subtitle?: string
  title?: string
}) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      {title ? (
        <div className="mb-5">
          <h3 className="font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

function MetricCard({
  label,
  status,
  title,
  tone,
}: {
  label: string
  status: string
  title: string
  tone?: 'success' | 'danger'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 shadow-sm',
        tone === 'danger' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-5 text-3xl font-semibold tracking-tight',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          'mt-3 text-sm text-muted-foreground',
          tone === 'success' && 'text-chart-4',
          tone === 'danger' && 'text-destructive',
        )}
      >
        {status}
      </p>
      <div className="mt-5 h-1.5 rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full bg-foreground',
            tone === 'danger' && 'bg-destructive',
          )}
          style={{ width: tone === 'danger' ? '45%' : '67%' }}
        />
      </div>
    </div>
  )
}

function SmallStat({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'danger'
  value: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={cn('mt-1 text-xl font-semibold', tone === 'danger' && 'text-destructive')}>
        {value}
      </p>
    </div>
  )
}

function IconStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="grid size-12 place-items-center rounded-full border">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

function InfoTile({
  caption,
  label,
  value,
}: {
  caption: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-chart-4">{caption}</p>
    </div>
  )
}

function Legend({
  label,
  muted,
  value,
}: {
  label: string
  muted?: boolean
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-2">
        <span
          className={cn('size-3 bg-foreground', muted && 'bg-muted-foreground')}
        />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  )
}

function MapCard() {
  return (
    <div className="relative mb-6 grid aspect-[1.35] place-items-center rounded-lg border bg-muted/30">
      <Globe2 className="size-24 text-muted-foreground/15" />
      <span className="absolute left-[28%] top-[42%] size-4 rounded-full bg-foreground shadow" />
      <span className="absolute right-[30%] top-[52%] size-3 rounded-full bg-muted-foreground shadow" />
    </div>
  )
}

function RegionBars({ rows }: { rows: [string, number][] }) {
  return (
    <div className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{label}</span>
            <span>{value}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function LineGraph() {
  return (
    <svg className="h-72 w-full" role="img" viewBox="0 0 640 260">
      <title>Trend velocity line graph</title>
      {[40, 90, 140, 190, 240].map((y) => (
        <line key={y} stroke="currentColor" strokeOpacity="0.08" x1="0" x2="640" y1={y} y2={y} />
      ))}
      <polyline
        fill="none"
        points="0,210 40,190 80,200 120,175 160,182 200,150 240,160 280,125 320,135 360,100 400,112 440,88 480,104 520,82 560,96 600,65 640,70"
        stroke="currentColor"
        strokeWidth="3"
      />
      <circle cx="440" cy="88" fill="currentColor" r="4" />
    </svg>
  )
}

function BarGraph() {
  return (
    <div className="flex h-72 items-end gap-8 px-3">
      {[58, 76, 94, 68].map((height, index) => (
        <div className="flex flex-1 flex-col items-center gap-3" key={height}>
          <div className="flex h-56 w-full items-end rounded-t bg-muted">
            <div
              className="w-full rounded-t bg-foreground"
              style={{ height: `${height}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            L{index + 1} {['Core', 'Pro', 'Expert', 'Org'][index]}
          </span>
        </div>
      ))}
    </div>
  )
}

function SovGraph() {
  return (
    <div className="relative h-64 border-b">
      <div className="absolute inset-x-0 bottom-8 flex items-end gap-10 px-12">
        {[70, 86, 52, 31].map((height, index) => (
          <div className="flex flex-1 flex-col items-center gap-3" key={height}>
            <div
              className="w-full rounded-t bg-foreground"
              style={{ height: `${height * 1.8}px` }}
            />
            <span className="text-xs text-muted-foreground">
              {['Skintific', 'Somethinc', 'Avoskin', 'Others'][index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MoatRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-md bg-muted">
          {icon}
        </span>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Unique access to niche behavioral data sets.
          </p>
        </div>
      </div>
      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase text-chart-4">
        {value}
      </span>
    </div>
  )
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Database className="size-4" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  )
}
