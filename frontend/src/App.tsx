import NumberFlow from '@number-flow/react'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, SparklesIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import {
  Conversation,
  ConversationContent,
} from '@/components/ai-elements/conversation'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Separator } from '@/components/ui/separator'

const chartData = [
  { month: 'Jan', score: 42 },
  { month: 'Feb', score: 55 },
  { month: 'Mar', score: 48 },
  { month: 'Apr', score: 63 },
  { month: 'May', score: 71 },
  { month: 'Jun', score: 84 },
]

const chartConfig = {
  score: {
    label: 'Consumer signal score',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const starterMetrics = [
  { label: 'Signals indexed', value: 12840, suffix: '' },
  { label: 'Segments active', value: 42, suffix: '' },
  { label: 'Insight confidence', value: 91, suffix: '%' },
]

const starterMarkdown = `### Starter insight

- TanStack Query is ready for API-backed market signals.
- AI Elements are installed for chat surfaces.
- Recharts and shadcn charts are wired for analytics views.`

type StarterMetric = (typeof starterMetrics)[number]

function useNarrowViewport() {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsNarrow(mediaQuery.matches)

    handleChange()
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isNarrow
}

function App() {
  const isNarrow = useNarrowViewport()
  const [promptCount, setPromptCount] = useState(0)
  const [lastPrompt, setLastPrompt] = useState(
    'Compare consumer sentiment across premium snack brands.',
  )

  const { data: metrics = starterMetrics } = useQuery({
    queryKey: ['frontend-starter-metrics'],
    queryFn: async () => starterMetrics,
    staleTime: 60_000,
  })

  const totalSignals = useMemo(
    () => metrics.reduce((total, metric) => total + metric.value, 0),
    [metrics],
  )

  const handleExportPdf = async () => {
    const { Document, Page, StyleSheet, Text, View, pdf } = await import(
      '@react-pdf/renderer'
    )
    const pdfStyles = StyleSheet.create({
      page: {
        padding: 32,
        fontSize: 12,
        fontFamily: 'Helvetica',
        color: '#171717',
      },
      section: {
        gap: 8,
      },
      title: {
        fontSize: 20,
        marginBottom: 12,
      },
      row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e5e5',
        paddingBottom: 6,
        paddingTop: 6,
      },
    })

    function SnapshotDocument({ metrics }: { metrics: StarterMetric[] }) {
      return (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.section}>
              <Text style={pdfStyles.title}>ConsumerIQ frontend snapshot</Text>
              {metrics.map((metric) => (
                <View key={metric.label} style={pdfStyles.row}>
                  <Text>{metric.label}</Text>
                  <Text>
                    {metric.value}
                    {metric.suffix}
                  </Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      )
    }

    const blob = await pdf(<SnapshotDocument metrics={metrics} />).toBlob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = 'consumeriq-frontend-snapshot.pdf'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('PDF snapshot generated')
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-8">
        <header className="flex flex-col gap-5 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div className="flex max-w-3xl flex-col gap-3">
            <Badge className="w-fit" variant="secondary">
              BrightData ConsumerIQ
            </Badge>
            <div className="flex flex-col gap-2">
              <h1 className="font-heading text-3xl font-semibold tracking-normal md:text-5xl">
                Frontend workspace
              </h1>
              <p className="max-w-2xl text-muted-foreground">
                React, Vite, Tailwind, shadcn/ui, AI Elements, analytics,
                motion, PDF export, and deployment config are ready inside this
                folder.
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf} type="button" variant="outline">
            <DownloadIcon data-icon="inline-start" />
            Export PDF
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-3xl">
                  <NumberFlow suffix={metric.suffix} value={metric.value} />
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <ResizablePanelGroup
          className="min-h-[940px] rounded-xl border md:min-h-[520px]"
          orientation={isNarrow ? 'vertical' : 'horizontal'}
        >
          <ResizablePanel defaultSize={isNarrow ? 54 : 58} minSize={32}>
            <div className="flex h-full flex-col gap-5 p-4">
              <Card className="border-0 bg-muted/30 ring-0">
                <CardHeader>
                  <CardTitle>Signal momentum</CardTitle>
                  <CardDescription>
                    <NumberFlow value={totalSignals} /> combined indexed events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    className="h-[260px] w-full"
                    config={chartConfig}
                  >
                    <AreaChart accessibilityLayer data={chartData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        axisLine={false}
                        dataKey="month"
                        tickLine={false}
                        tickMargin={8}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <Area
                        dataKey="score"
                        fill="var(--color-score)"
                        fillOpacity={0.18}
                        stroke="var(--color-score)"
                        strokeWidth={2}
                        type="natural"
                      />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border bg-background p-4"
                initial={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {starterMarkdown}
                </ReactMarkdown>
              </motion.div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={isNarrow ? 46 : 42} minSize={32}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-4 text-muted-foreground" />
                  <span className="font-medium">AI analyst</span>
                </div>
                <Badge variant="outline">Vercel AI SDK</Badge>
              </div>

              <Conversation className="min-h-0">
                <ConversationContent>
                  <div className="flex max-w-[95%] flex-col gap-2">
                    <div className="w-fit text-sm text-foreground">
                      ConsumerIQ can surface opportunity gaps, compare
                      sentiment, and summarize consumer review themes.
                    </div>
                  </div>

                  <AnimatePresence mode="popLayout">
                    {lastPrompt ? (
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        initial={{ opacity: 0, y: 8 }}
                        key={`${promptCount}-${lastPrompt}`}
                      >
                        <div className="ml-auto flex max-w-[95%] flex-col gap-2">
                          <div className="ml-auto w-fit rounded-lg bg-secondary px-4 py-3 text-sm text-foreground">
                            {lastPrompt}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </ConversationContent>
              </Conversation>

              <Separator />

              <div className="p-4">
                <PromptInput
                  onSubmit={(message) => {
                    const prompt = message.text.trim()

                    if (!prompt) {
                      return
                    }

                    setLastPrompt(prompt)
                    setPromptCount((value) => value + 1)
                    toast.info('Prompt captured in the local starter UI')
                  }}
                >
                  <PromptInputBody>
                    <PromptInputTextarea placeholder="Ask about a consumer trend..." />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <Badge variant="secondary">local demo</Badge>
                    </PromptInputTools>
                    <PromptInputSubmit status="ready" />
                  </PromptInputFooter>
                </PromptInput>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </section>
    </main>
  )
}

export default App
