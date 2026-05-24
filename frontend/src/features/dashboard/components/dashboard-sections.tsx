import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth";
import { PERSONA_TASK_KEY } from "@/features/onboarding/founder-form/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pipelineSteps } from "../constants";
import {
  HealthRow,
  LineGraph,
  MapCard,
  MetricCard,
  Panel,
  PlatformShareChart,
  SmallStat,
} from "./dashboard-primitives";

function EmptyDataState({
  message = "Analysis pending — data will appear here after scraping completes.",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[8rem] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-10 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function MarketOverview() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
        <MetricCard label="Trend Velocity" status="No data yet" title="—" />
        <MetricCard label="Est. Demand" status="No data yet" title="—" />
        <MetricCard label="Price Target" status="No data yet" title="—" />
        <MetricCard label="Market Gaps" status="No data yet" title="—" />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Panel
          title="Marketplace Pulse"
          subtitle="Real-time SKU tracking across platforms"
        >
          <EmptyDataState />
        </Panel>

        <Panel
          title="Demand Density"
          subtitle="Geographic distribution of interest"
        >
          <MapCard />
          <EmptyDataState message="No regional data yet." />
        </Panel>
      </div>
    </div>
  );
}

export function DemandPulse() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
        <Panel
          title="Trend Velocity Index"
          subtitle="Global aggregate interest momentum"
        >
          <LineGraph />
          <div className="mt-4 flex items-end justify-between border-t pt-3">
            <div className="grid grid-cols-2 gap-5">
              <SmallStat label="Current Velocity" value="—" />
              <SmallStat label="Acceleration" value="—" />
            </div>
          </div>
        </Panel>

        <Panel>
          <EmptyDataState message="AI recommendation will appear after market analysis completes." />
        </Panel>

        <Panel title="Marketplace Share" subtitle="Dominance by platform segment">
          <PlatformShareChart />
        </Panel>

        <Panel>
          <EmptyDataState message="Search intent data pending." />
        </Panel>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Product Opportunity Matrix</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            High demand, low competitor saturation niches
          </p>
        </div>
        <EmptyDataState />
      </section>
    </div>
  );
}

export function CompetitorMirror() {
  return (
    <div className="grid min-w-0 gap-3">
      <Panel title="Top Competitor Matrix">
        <EmptyDataState />
      </Panel>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Panel title="Pricing Sweet Spot">
          <EmptyDataState />
        </Panel>
        <Panel title="Avg Sales Movement">
          <EmptyDataState />
        </Panel>
      </div>

      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recommendation
            </p>
            <div className="mt-3">
              <EmptyDataState message="Competitor positioning analysis will appear after scraping completes." />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

type PersonaCard = {
  name: string;
  age: string;
  tone: "high" | "medium" | "growth";
  description: string;
  painPoints: string[];
  goals: string;
};

type PersonaResult = {
  personas?: PersonaCard[];
  stp?: {
    segmentation?: string;
    targeting?: string;
    positioning?: string;
    geographic?: string;
    demographic?: string;
    psychographic?: string;
    behavioral?: string;
    needs?: string;
  };
  advisorIntelligence?: {
    recommendation?: string;
    keyPainPoint?: string;
    brandMessage?: string;
    marketOpportunity?: string;
  };
};

async function fetchTaskStatus(taskId: string) {
  const token = getAuthToken();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await fetch(`/api/task-status/${taskId}`, { headers });
  if (!res.ok) throw new Error("task status failed");
  return res.json() as Promise<{
    taskId: string;
    status: string;
    result?: { personaData?: PersonaResult };
  }>;
}

const PERSONA_DATA_KEY = "ciq_persona_data";

function loadStoredPersonaData(): PersonaResult | null {
  try {
    const raw = localStorage.getItem(PERSONA_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersonaResult;
    return Array.isArray(parsed.personas) && parsed.personas.length > 0
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function PersonaDecode() {
  const [liveData, setLiveData] = useState<PersonaResult | null>(
    () => loadStoredPersonaData(),
  );
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const taskId = localStorage.getItem(PERSONA_TASK_KEY);
    if (!taskId) return;
    setLoading(true);

    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) break;
        try {
          const res = await fetchTaskStatus(taskId);
          if (res.status === "completed") {
            const data = res.result?.personaData;
            if (data && Array.isArray(data.personas) && data.personas.length > 0) {
              setLiveData(data);
              try {
                localStorage.setItem(PERSONA_DATA_KEY, JSON.stringify(data));
              } catch {}
            }
            localStorage.removeItem(PERSONA_TASK_KEY);
            setLoading(false);
            break;
          }
          if (res.status === "failed") {
            localStorage.removeItem(PERSONA_TASK_KEY);
            setLoading(false);
            break;
          }
        } catch {
          setLoading(false);
          break;
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const personaCards: PersonaCard[] = liveData?.personas
    ? liveData.personas.map((p) => ({
        ...p,
        tone: (["high", "medium", "growth"].includes(p.tone)
          ? p.tone
          : "medium") as "high" | "medium" | "growth",
      }))
    : [];

  const stp = liveData?.stp ?? null;
  const advisor = liveData?.advisorIntelligence ?? null;

  const initials = (name: string) =>
    name
      .split(/[\s-]+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

  const avatarToneClass: Record<"high" | "medium" | "growth", string> = {
    high: "border-destructive-500/40 bg-destructive-500/15 text-destructive-500",
    medium:
      "border-warning-500/40 bg-warning-500/15 text-warning-600 dark:text-warning-500",
    growth:
      "border-[#98971a]/40 bg-[#98971a]/15 text-[#98971a] dark:border-[#b8bb26]/40 dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]",
  };

  const cardHoverBorderClass: Record<"high" | "medium" | "growth", string> = {
    high: "hover:border-destructive-500/50",
    medium: "hover:border-warning-500/50",
    growth: "hover:border-[#98971a]/50 dark:hover:border-[#b8bb26]/50",
  };

  return (
    <div className="grid gap-3">
      <section>
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <h2 className="break-words text-base font-semibold">User Personas</h2>
          {loading && (
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
              Analyzing with AI…
            </span>
          )}
        </div>
        {personaCards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto_auto_auto]">
            {personaCards.map((persona) => (
              <article
                className={cn(
                  "relative grid gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors md:row-span-6 md:grid-rows-subgrid",
                  cardHoverBorderClass[persona.tone],
                )}
                key={persona.name}
              >
                {persona.tone === "high" ? (
                  <span className="absolute right-3 top-0 -translate-y-1/2 rounded-full bg-background-default px-px py-px">
                    <span className="block rounded-full bg-destructive-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive-500">
                      High Priority
                    </span>
                  </span>
                ) : null}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
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
                ? "Analyzing customer data with AI…"
                : "Persona analysis will appear here after market analysis completes."
            }
          />
        )}
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Segmentation, Targeting, and Positioning">
          {loading && !stp ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
              Analyzing your market…
            </div>
          ) : stp ? (
            <>
              <div className="grid gap-2">
                {[
                  { letter: "S", title: "Segmentation", text: stp.segmentation },
                  { letter: "T", title: "Targeting", text: stp.targeting },
                  { letter: "P", title: "Positioning", text: stp.positioning },
                ]
                  .filter((row) => row.text)
                  .map((row) => (
                    <div
                      className="grid grid-cols-[2.25rem_1fr] items-center gap-3"
                      key={row.letter}
                    >
                      <span className="text-center font-mono text-4xl font-bold leading-none text-destructive-500">
                        {row.letter}
                      </span>
                      <div className="rounded-lg border bg-background-default px-3 py-2.5">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {row.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground-light">
                          {row.text}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="mt-4 grid gap-1.5">
                {[
                  { title: "Geographic", text: stp.geographic },
                  { title: "Demographic", text: stp.demographic },
                  { title: "Psychographic", text: stp.psychographic },
                  { title: "Behavioral", text: stp.behavioral },
                  { title: "Needs", text: stp.needs },
                ]
                  .filter((item) => item.text)
                  .map((item) => (
                    <div
                      className="grid grid-cols-[8rem_1fr] items-stretch gap-2"
                      key={item.title}
                    >
                      <div className="flex items-center rounded-lg bg-destructive-500/15 px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-destructive-500">
                        {item.title}
                      </div>
                      <p className="rounded-lg border bg-background-default px-3 py-2 text-sm leading-relaxed text-foreground-light">
                        {item.text}
                      </p>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <EmptyDataState message="STP analysis will appear after persona decode completes." />
          )}
        </Panel>

        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">TAM / SAM / SOM</h3>
          </div>
          <EmptyDataState message="Market sizing will appear after analysis completes." />
        </section>
      </div>

      {advisor ? (
        <AdvisorIntelligence
          recommendation={advisor.recommendation ?? ""}
          signals={[
            { label: "Key Pain Point", value: advisor.keyPainPoint ?? "—" },
            { label: "Brand Message", value: advisor.brandMessage ?? "—" },
            { label: "Market Opportunity", value: advisor.marketOpportunity ?? "—" },
          ]}
        />
      ) : (
        <section className="relative overflow-hidden rounded-xl border border-chart-5/25 bg-card shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-chart-5/70 to-chart-4/60" />
          <div className="relative p-4 xl:p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-[18px] shrink-0 text-chart-5" />
              <p className="bg-gradient-to-r from-chart-5 to-chart-4 bg-clip-text text-base font-semibold tracking-tight text-transparent">
                Advisor Intelligence
              </p>
            </div>
            <div className="mt-4">
              <EmptyDataState message="Strategic recommendations will appear after analysis completes." />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export function LaunchCompass() {
  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Panel>
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">Interactive Heatmap</h3>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              Demand area by sales and expansion opportunity by competitor position
            </p>
          </div>
          <EmptyDataState />
        </Panel>

        <Panel>
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">City Sales Signals</h3>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              Amazon and Temu only
            </p>
          </div>
          <EmptyDataState />
        </Panel>
      </div>

      <Panel>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recommendation
            </p>
            <div className="mt-3">
              <EmptyDataState message="Launch strategy will appear after market analysis completes." />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

export function DataSettings() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel title="Network Health">
          <div className="grid gap-3 text-sm">
            <HealthRow label="Bright Data" value="—" />
            <HealthRow label="Amazon Connect" value="—" />
            <HealthRow label="Temu Stream" value="—" />
          </div>
          <Button className="mt-4" variant="ghost">
            View incident history
            <ArrowRight className="size-4" />
          </Button>
        </Panel>

        <Panel title="Pipeline Architecture" subtitle="v4.2.0-stable">
          <div className="grid gap-3 md:grid-cols-5">
            {pipelineSteps.map(({ caption, icon: Icon, label }) => {
              return (
                <div className="text-center" key={label}>
                  <div className="mx-auto grid size-10 place-items-center rounded-lg border bg-card">
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{caption}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <ToastDebugPanel />

      <Panel title="Bright Data Integrations">
        <EmptyDataState message="Integration stats will appear once active scraping jobs are running." />
      </Panel>
    </div>
  );
}

function ToastDebugPanel() {
  const fireDefault = () => toast("Default notification message");
  const fireSuccess = () =>
    toast.success("Data sync completed successfully");
  const fireInfo = () => toast.info("Fresh insights are available");
  const fireWarning = () =>
    toast.warning("Rate limit approaching for SERP API");
  const fireError = () => toast.error("Failed to refresh dataset");
  const fireLoading = () => {
    const id = toast.loading("Crunching numbers…");
    setTimeout(() => toast.success("Done", { id }), 1800);
  };
  const fireDescription = () =>
    toast.success("Persona snapshot saved", {
      description: "All 3 personas were exported to the shared workspace.",
    });
  const fireAction = () =>
    toast("New release deployed", {
      action: {
        label: "View",
        onClick: () => toast.info("Pretend we navigated to the release"),
      },
    });

  return (
    <Panel
      title="Toast Debug"
      subtitle="Trigger each Sonner variant to inspect styling"
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={fireDefault}>
          Default
        </Button>
        <Button variant="outline" size="sm" onClick={fireSuccess}>
          Success
        </Button>
        <Button variant="outline" size="sm" onClick={fireInfo}>
          Info
        </Button>
        <Button variant="outline" size="sm" onClick={fireWarning}>
          Warning
        </Button>
        <Button variant="outline" size="sm" onClick={fireError}>
          Error
        </Button>
        <Button variant="outline" size="sm" onClick={fireLoading}>
          Loading → Success
        </Button>
        <Button variant="outline" size="sm" onClick={fireDescription}>
          With description
        </Button>
        <Button variant="outline" size="sm" onClick={fireAction}>
          With action
        </Button>
      </div>
    </Panel>
  );
}

interface AdvisorSignal {
  label: string;
  value: string;
}

interface AdvisorIntelligenceProps {
  recommendation: string;
  signals: AdvisorSignal[];
}

function AdvisorIntelligence({
  recommendation,
  signals,
}: AdvisorIntelligenceProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-chart-5/25 bg-card shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-chart-5/70 to-chart-4/60" />
      <div className="pointer-events-none absolute -left-24 -top-24 size-56 rounded-full bg-chart-5/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 size-64 rounded-full bg-chart-4/[0.06] blur-3xl" />

      <div className="relative p-4 xl:p-5">
        <div className="flex items-center gap-2">
          <Sparkles
            className="size-[18px] shrink-0"
            color="url(#advisor-ai-icon-gradient)"
          >
            <defs>
              <linearGradient
                id="advisor-ai-icon-gradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop stopColor="var(--chart-5)" />
                <stop offset="100%" stopColor="var(--chart-4)" />
              </linearGradient>
            </defs>
          </Sparkles>
          <p className="bg-gradient-to-r from-chart-5 to-chart-4 bg-clip-text text-base font-semibold tracking-tight text-transparent">
            Advisor Intelligence
          </p>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-foreground-light">
          {recommendation}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {signals.map((signal) => (
            <div
              className="group/signal relative overflow-hidden rounded-lg border border-chart-5/20 bg-background-default/60 p-3 transition-colors hover:border-chart-5/40"
              key={signal.label}
            >
              <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-chart-5/70 via-chart-5/30 to-chart-4/60" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-lighter">
                {signal.label}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground-default">
                {signal.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
