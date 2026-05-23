import {
  ArrowRight,
  Download,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { pipelineSteps } from "../constants";
import {
  HealthRow,
  LineGraph,
  MapCard,
  MetricCard,
  Panel,
  PlatformShareChart,
  PriceMovementChart,
  RegionBars,
  SmallStat,
} from "./dashboard-primitives";

export function MarketOverview() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
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
        <MetricCard
          label="Price Target"
          status="Optimal market fit"
          title="$19"
        />
        <MetricCard
          label="Market Gaps"
          status="High potential entry"
          title="3 Found"
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Panel
          title="Marketplace Pulse"
          subtitle="Real-time SKU tracking across platforms"
        >
          <div className="mb-2 flex gap-2">
            {["Amazon", "Temu"].map((item, index) => (
              <span
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium",
                  index === 0 && "bg-muted text-foreground",
                )}
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            {[
              [
                "Barrier Repair Serum",
                "Amazon Hero SKU",
                "$18.99",
                "82%",
                "+12.4%",
              ],
              [
                "SPF Moisture Duo",
                "Temu Bundle",
                "$14.50",
                "Low Stock",
                "+28.1%",
              ],
              [
                "Peptide Night Cream",
                "Amazon Premium",
                "$22.00",
                "55%",
                "-1.2%",
              ],
            ].map((row) => (
              <div
                className="grid grid-cols-[1.3fr_0.8fr_1fr_0.7fr] items-center border-b px-3 py-2.5 text-sm last:border-b-0"
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
                    "text-right font-medium",
                    row[4].startsWith("+")
                      ? "text-chart-4"
                      : "text-muted-foreground",
                  )}
                >
                  {row[4]}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Demand Density"
          subtitle="Geographic distribution of interest"
        >
          <MapCard />
          <RegionBars
            rows={[
              ["Los Angeles", 58.2],
              ["New York", 19.4],
              ["Dallas", 12.1],
            ]}
          />
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
              <SmallStat label="Current Velocity" value="42.8m/s" />
              <SmallStat label="Acceleration" value="+12.4%" tone="danger" />
            </div>
            <Button variant="ghost">
              Export SVGs
              <Download className="size-4" />
            </Button>
          </div>
        </Panel>

        <DemandPulseRecommendation />

        <Panel
          title="Marketplace Share"
          subtitle="Dominance by platform segment"
        >
          <PlatformShareChart />
        </Panel>

        <div className="rounded-xl bg-foreground p-4 text-background shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Search Intent Analysis</h3>
              <p className="text-xs opacity-70">Live SERP clustering</p>
            </div>
            <span className="rounded bg-background/10 px-2 py-1 text-[10px] uppercase">
              Live
            </span>
          </div>
          {[
            ['"barrier repair serum"', "Commercial", "144K"],
            ['"spf moisturizer sensitive skin"', "Informational", "82K"],
            ['"budget skincare bundle"', "Transactional", "36K"],
          ].map(([keyword, intent, volume]) => (
            <div
              className="mb-2 rounded-lg border border-background/20 p-3"
              key={keyword}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{keyword}</p>
                <ArrowRight className="size-4 opacity-70" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] uppercase">
                <span className="rounded bg-background/15 px-2 py-1">
                  {intent}
                </span>
                <span className="rounded bg-background/15 px-2 py-1">
                  Volume: {volume}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductOpportunityMatrix />
    </div>
  );
}

function DemandPulseRecommendation() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            AI Recommendation
          </p>
          <h3 className="mt-2 text-lg font-semibold">
            Lead with Amazon intent, amplify with Temu discovery.
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Prioritize Amazon for high-intent conversion because search demand
            is clustering around proof-based skincare terms. Use Sponsored
            Products on "barrier repair serum" and "sensitive skin SPF", then
            test Temu deal placements for bundle discovery and price-sensitive
            trial traffic.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Best Channel
          </p>
          <p className="mt-2 font-semibold">
            Amazon Search + Sponsored Products
          </p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ad Placement
          </p>
          <p className="mt-2 font-semibold">
            Temu in-app bundles + coupon feed
          </p>
        </div>
      </div>
    </Panel>
  );
}

function ProductOpportunityMatrix() {
  const opportunities = [
    {
      title: "Tinted Sunscreen SPF 50+",
      demand: "92/100",
      saturation: "Low",
      tags: ["Makeup-Skincare Hybrid", "Daily Wear"],
      icon: Sparkles,
    },
    {
      title: "Acne Spot Gel (Centella)",
      demand: "88/100",
      saturation: "Med",
      tags: ["Targeted Treatment", "Gen Z"],
      icon: TrendingUp,
    },
    {
      title: "Peptide Lip Treatment",
      demand: "85/100",
      saturation: "Low",
      tags: ["Premiumization", "Night Care"],
      icon: Target,
    },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Product Opportunity Matrix</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            High demand, low competitor saturation niches
          </p>
        </div>
        <Button className="text-chart-5" size="sm" variant="ghost">
          View Full Report
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {opportunities.map(
          ({ demand, icon: Icon, saturation, tags, title }) => (
            <article
              className="relative overflow-hidden rounded-lg border bg-muted/25 p-4"
              key={title}
            >
              <div className="absolute top-0 right-0 grid size-16 place-items-start justify-end rounded-bl-full bg-chart-5/10 p-3 text-chart-5">
                <Icon className="size-5" />
              </div>
              <h4 className="pr-12 text-base font-semibold">{title}</h4>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Demand Index: </span>
                  <strong>{demand}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Saturation: </span>
                  <strong>{saturation}</strong>
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    className="rounded bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}

export function PersonaDecode() {
  const personaCards = [
    {
      name: "Stressed Young Professional",
      age: "Age 18-26",
      tone: "high" as const,
      description:
        "Urban Gen Z women aged 18-26 who prioritize reliable daily hair solutions, value affordability, and respond to barrier-repair claims.",
      painPoints: [
        "Hair feels dry and damaged from heat styling and daily pollution exposure.",
        "Limited time for elaborate routines on a tight workday schedule.",
        "Premium products feel out of reach on an early-career budget.",
      ],
      goals:
        "Visible results within the first week, a reliable daily routine that fits a busy schedule, and affordable refills they can buy without overthinking.",
    },
    {
      name: "Budget-Conscious Trend Seeker",
      age: "Age 19-27",
      tone: "medium" as const,
      description:
        "Early adopters who follow social trends and switch brands quickly when price/value feels right.",
      painPoints: [
        "Brand fatigue and FOMO when a viral product takes off without them.",
        "Full-size purchases feel risky when the price doesn't match the hype.",
        "Afraid of getting stuck with a half-used product that disappoints.",
      ],
      goals:
        "Try whatever is trending without overspending, swap brands fast if the result disappoints, and share unboxing-worthy finds with their feed.",
    },
    {
      name: "Family Care Gatekeeper",
      age: "Age 28-40",
      tone: "growth" as const,
      description:
        "Household decision makers who prefer gentle daily solutions with proven safety and easy availability.",
      painPoints: [
        "Constant worry about harsh ingredients ending up near the kids.",
        "Juggling personal care needs across multiple family members.",
        "Hard to keep restocking when local shelves run spotty.",
      ],
      goals:
        "One gentle product the whole family can share, transparent ingredient labels, and reliable availability at nearby stores.",
    },
  ];

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
        <div className="mb-3 min-w-0">
          <h2 className="break-words text-base font-semibold">User Personas</h2>
        </div>
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
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="Segmentation, Targeting, and Positioning">
          <div className="grid gap-2">
            {[
              {
                letter: "S",
                title: "Segmentation",
                text: "Urban Gen Z women in Indonesia seeking affordable daily hair solutions with practical benefits.",
              },
              {
                letter: "T",
                title: "Targeting",
                text: "Price-sensitive consumers who buy shampoo frequently and are open to switching brands that feel trustworthy and convenient.",
              },
              {
                letter: "P",
                title: "Positioning",
                text: "A reliable, affordable daily shampoo that solves dryness and hair damage without premium price tradeoffs.",
              },
            ].map((row) => (
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
              {
                title: "Geographic",
                text: "Urban Indonesian cities with spillover from metros, high humidity, and pollution exposure.",
              },
              {
                title: "Demographic",
                text: "Women, Gen Z (18-26), students to early-career professionals.",
              },
              {
                title: "Psychographic",
                text: "Practical, budget-conscious, convenience oriented, value reliable daily results.",
              },
              {
                title: "Behavioral",
                text: "High usage frequency, low switching cost, open to social recommendations.",
              },
              {
                title: "Needs",
                text: "Hair solutions that feel compatible, are easy to access, budget-friendly, and suitable for long-term daily use.",
              },
            ].map((item) => (
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
        </Panel>

        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">TAM / SAM / SOM</h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid flex-1 content-center gap-4">
              <MarketSizingCircles />
            </div>
            <div className="mt-auto grid gap-2 pt-6 text-sm text-muted-foreground">
            <div className="rounded-lg border border-destructive-500/40 bg-destructive-500/25 p-3 text-foreground">
              All Women Gen Z in Indonesia (BPS, 2025)
            </div>
            <div className="rounded-lg border border-destructive-500/50 bg-destructive-500/50 p-3 text-foreground">
              Urban Gen Z women in Indonesia
            </div>
            <div className="rounded-lg border border-destructive-500/70 bg-destructive-500/90 p-3 text-white">
              The new attainable loyal segment for Sunsilk
            </div>
          </div>
          </div>
        </section>
      </div>

      <section className="relative bg-card p-3.5 pl-4 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-gradient-to-b before:from-brand-400 before:via-brand-500 before:to-brand-600 xl:p-4 xl:pl-5">
        <div className="flex items-center gap-2">
          <Sparkles
            className="size-4"
            color="url(#persona-ai-recommendation-gradient)"
          >
            <defs>
              <linearGradient id="persona-ai-recommendation-gradient">
                <stop stopColor="var(--brand-400)" />
                <stop offset="50%" stopColor="var(--brand-500)" />
                <stop offset="100%" stopColor="var(--brand-600)" />
              </linearGradient>
            </defs>
          </Sparkles>
          <p className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-clip-text text-base font-semibold text-transparent">
            Advisor Intelligence
          </p>
        </div>
        <p className="mt-3 text-sm text-foreground-light">
          Focus the first wave on urban Gen Z women who prioritize affordable
          daily hair solutions and respond to clear efficacy claims. Emphasize
          barrier-repair messaging, push social proof around consistent results,
          and keep entry pricing accessible to accelerate trial and repeat.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-light">
              Key Pain Point
            </p>
            <p className="mt-2 text-sm font-semibold">Amazon + Temu</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-light">
              Brand Message
            </p>
            <p className="mt-2 text-sm font-semibold">
              Daily relief, real results
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground-light">
              Market Opportunity
            </p>
            <p className="mt-2 text-sm font-semibold">Repeat purchase rate</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MarketSizingCircles() {
  const layers = [
    {
      key: "TAM",
      value: 37_032_414,
      label: "Total addressable market",
      opacity: 0.25,
      radius: 128,
    },
    {
      key: "SAM",
      value: 21_775_060,
      label: "Serviceable available market",
      opacity: 0.5,
      radius: 96,
    },
    {
      key: "SOM",
      value: 1_307_407,
      label: "Serviceable obtainable market",
      opacity: 0.9,
      radius: 64,
    },
  ];

  const formatCount = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
      : n.toLocaleString();

  const width = 360;
  const height = 300;
  const cx = width / 2;
  const baseline = height - 8;
  const radii = layers.map((l) => l.radius);

  return (
    <>
      <svg
        aria-hidden="true"
        className="mx-auto block w-full max-w-[360px]"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {radii.map((r, i) => (
          <circle
            cx={cx}
            cy={baseline - r}
            fill="var(--destructive-500)"
            fillOpacity={layers[i].opacity}
            key={layers[i].key}
            r={r}
            stroke="var(--destructive-500)"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        ))}
        {radii.map((r, i) => {
          const y =
            i === radii.length - 1
              ? baseline - r
              : baseline - 2 * r + 28;
          return (
            <g key={`${layers[i].key}-label`}>
              <text
                className="fill-foreground font-mono text-[11px] font-semibold"
                textAnchor="middle"
                x={cx}
                y={y}
              >
                {layers[i].key}
              </text>
              <text
                className={cn(
                  "text-[11px]",
                  layers[i].key === "SOM"
                    ? "fill-white"
                    : "fill-foreground-light"
                )}
                textAnchor="middle"
                x={cx}
                y={y + 14}
              >
                {formatCount(layers[i].value)} people
              </text>
            </g>
          );
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
        {layers.map((l) => (
          <div key={l.key}>
            <p className="font-mono font-semibold uppercase tracking-[0.16em] text-foreground-light">
              {l.key}
            </p>
            <p className="mt-1 leading-tight">{l.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export function CompetitorMirror() {
  const competitorRows = [
    {
      brand: "CeraVe",
      sku: "AM Facial Moisturizing Lotion SPF 30",
      avgPrice: "$16.99",
      priceDelta: "-2.1%",
      promoIntensity: "High",
      promoLevel: "high",
      monthlySales: "45.2K",
      salesDelta: "+5.4%",
      rating: "4.7",
      reviews: "94K",
    },
    {
      brand: "COSRX",
      sku: "Snail Mucin Essence 100ml",
      avgPrice: "$13.80",
      priceDelta: "-0.8%",
      promoIntensity: "Low",
      promoLevel: "low",
      monthlySales: "18.5K",
      salesDelta: "-1.2%",
      rating: "4.6",
      reviews: "72K",
    },
    {
      brand: "The Ordinary",
      sku: "Hyaluronic Acid 2% + B5",
      avgPrice: "$18.50",
      priceDelta: "+5.8%",
      promoIntensity: "Very High",
      promoLevel: "very-high",
      monthlySales: "82.1K",
      salesDelta: "+12.4%",
      rating: "4.5",
      reviews: "118K",
    },
  ];

  const promoBarClasses: Record<string, string> = {
    low: "w-1/4 bg-muted-foreground/50",
    medium: "w-1/2 bg-muted-foreground/70",
    high: "w-3/4 bg-foreground",
    "very-high": "w-5/6 bg-foreground",
  };

  return (
    <div className="grid min-w-0 gap-3">
      <CompetitorAiRecommendation />

      <Panel title="Top Competitor Matrix">
        <div className="grid gap-3 md:hidden">
          {competitorRows.map((row) => (
            <article
              className="min-w-0 rounded-lg border bg-muted/25 p-3"
              key={row.sku}
            >
              <div className="min-w-0">
                <p className="font-semibold">{row.brand}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {row.sku}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                  <p className="font-semibold">{row.avgPrice}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.priceDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.priceDelta}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Sales</p>
                  <p className="font-semibold">{row.monthlySales}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.salesDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.salesDelta}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Promo</p>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ??
                          "w-1/2 bg-foreground",
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs">{row.promoIntensity}</p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-semibold">{row.rating}</p>
                  <p className="text-xs text-muted-foreground">{row.reviews}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <div className="min-w-[52rem]">
            <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Brand / Hero SKU</span>
              <span>Avg Price (USD)</span>
              <span>Promo Intensity</span>
              <span>Est. Monthly Sales</span>
              <span>Rating / Reviews</span>
            </div>
            {competitorRows.map((row) => (
              <div
                className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] items-center border-b px-4 py-3 text-sm last:border-b-0"
                key={row.sku}
              >
                <div>
                  <p className="font-semibold">{row.brand}</p>
                  <p className="text-xs text-muted-foreground">{row.sku}</p>
                </div>
                <div>
                  <p className="font-semibold">{row.avgPrice}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.priceDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.priceDelta}
                  </p>
                </div>
                <div>
                  <div className="h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ??
                          "w-1/2 bg-foreground",
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.promoIntensity}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{row.monthlySales}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.salesDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.salesDelta}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">
                    {row.rating}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({row.reviews})
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Avg Sales Movement">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-foreground" /> You
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-chart-4" /> Amazon Avg
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive" /> Temu Avg
          </span>
        </div>
        <div className="mt-3 h-32 w-full rounded-lg border bg-muted/30 p-3">
          <PriceMovementChart />
        </div>
      </Panel>
    </div>
  );
}

function CompetitorAiRecommendation() {
  const items = [
    {
      label: "Key Advantage",
      value: "Proof-led barrier repair positioning",
      detail:
        "Amazon buyers reward clinical proof, while Temu shoppers respond to visible bundle value.",
    },
    {
      label: "Pricing Advice",
      value: "$18-$22 Amazon core SKU",
      detail:
        "Keep Amazon above commodity pricing, then use Temu under-$15 starter bundles for trial.",
    },
    {
      label: "Positioning",
      value: "Premium efficacy without premium friction",
      detail:
        "Lead with sensitive-skin trust, fast absorption, and clearer ingredient claims.",
    },
  ];

  return (
    <Panel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI Recommendation
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold">
              Win by owning the trust gap between Amazon and Temu.
            </h3>
            <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
              Competitors are either credible but expensive on Amazon, or cheap
              but low-trust on Temu. Position the product as a clinically clear,
              affordable barrier-repair routine with enough proof for Amazon and
              enough bundle value for Temu.
            </p>
          </div>
        </div>
        <Button className="h-auto w-full shrink-0 justify-center whitespace-normal bg-foreground px-4 py-2 text-center text-background hover:bg-foreground/90 sm:w-auto">
          Export Strategy
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article
            className="min-w-0 rounded-lg border bg-muted/25 p-3"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 break-words font-semibold">{item.value}</p>
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              {item.detail}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function LaunchCompass() {
  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Panel
          title="Interactive Heatmap"
          subtitle="Demand area by sales and expansion opportunity by competitor position"
        >
          <LaunchHeatmap />
        </Panel>

        <Panel title="City Sales Signals" subtitle="Amazon and Temu only">
          <LaunchCitySales />
        </Panel>
      </div>

      <LaunchAiRecommendation />
    </div>
  );
}

function LaunchHeatmap() {
  const chartData = [
    {
      city: "Los Angeles",
      channel: "Amazon",
      demand: 92,
      expansion: 74,
      sales: 18400,
    },
    {
      city: "New York",
      channel: "Amazon",
      demand: 88,
      expansion: 62,
      sales: 16100,
    },
    {
      city: "Dallas",
      channel: "Temu",
      demand: 72,
      expansion: 86,
      sales: 12800,
    },
    {
      city: "Phoenix",
      channel: "Temu",
      demand: 64,
      expansion: 91,
      sales: 9600,
    },
    {
      city: "Chicago",
      channel: "Amazon",
      demand: 78,
      expansion: 68,
      sales: 11200,
    },
  ];

  const chartConfig = {
    amazon: { label: "Amazon demand", color: "var(--foreground)" },
    temu: { label: "Temu expansion", color: "var(--chart-5)" },
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-wrap gap-2 text-xs">
        <span className="w-full max-w-full break-words rounded-full border bg-muted/30 px-3 py-1 font-medium sm:w-auto">
          Demand Area: sales-weighted demand
        </span>
        <span className="w-full max-w-full break-words rounded-full border bg-chart-5/10 px-3 py-1 font-medium text-chart-5 sm:w-auto">
          Opportunity Expansion: lower competitor pressure
        </span>
      </div>
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <ChartContainer
          className="h-56 w-full min-w-0 max-w-full overflow-hidden sm:h-64"
          config={chartConfig}
          initialDimension={{ height: 224, width: 260 }}
        >
          <ScatterChart margin={{ bottom: 18, left: -14, right: 4, top: 10 }}>
            <CartesianGrid />
            <XAxis
              dataKey="demand"
              ticks={[50, 65, 80, 95]}
              name="Demand"
              tickLine={false}
              axisLine={false}
              label={{
                value: "Demand Area",
                position: "insideBottom",
                offset: -10,
              }}
              type="number"
              domain={[50, 100]}
            />
            <YAxis
              dataKey="expansion"
              ticks={[50, 65, 80, 100]}
              name="Expansion"
              width={30}
              tickLine={false}
              axisLine={false}
              type="number"
              domain={[50, 100]}
            />
            <ZAxis dataKey="sales" range={[90, 420]} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    const payload = item.payload as (typeof chartData)[number];

                    if (name === "sales") {
                      return `${Number(value).toLocaleString("en-US")} sales`;
                    }

                    return `${value} - ${payload.city} (${payload.channel})`;
                  }}
                />
              }
            />
            <Scatter
              data={chartData.filter((item) => item.channel === "Amazon")}
              dataKey="sales"
              fill="var(--foreground)"
              name="Amazon"
            />
            <Scatter
              data={chartData.filter((item) => item.channel === "Temu")}
              dataKey="sales"
              fill="var(--chart-5)"
              name="Temu"
            />
          </ScatterChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function LaunchCitySales() {
  const rows = [
    {
      city: "Los Angeles",
      amazon: "18.4K",
      temu: "7.2K",
      signal: "Best first city",
    },
    {
      city: "New York",
      amazon: "16.1K",
      temu: "6.8K",
      signal: "High intent",
    },
    {
      city: "Dallas",
      amazon: "9.4K",
      temu: "12.8K",
      signal: "Expansion pocket",
    },
    {
      city: "Phoenix",
      amazon: "6.7K",
      temu: "9.6K",
      signal: "Low competition",
    },
  ];

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      {rows.map((row) => (
        <div
          className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/25 p-3"
          key={row.city}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-semibold">{row.city}</p>
              <p className="text-xs text-muted-foreground">{row.signal}</p>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Sales
            </span>
          </div>
          <div className="mt-3 grid w-full min-w-0 max-w-full gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0 rounded-md border bg-card p-2">
              <p className="text-xs text-muted-foreground">Amazon</p>
              <p className="font-semibold">{row.amazon}</p>
            </div>
            <div className="min-w-0 rounded-md border bg-card p-2">
              <p className="text-xs text-muted-foreground">Temu</p>
              <p className="font-semibold">{row.temu}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LaunchAiRecommendation() {
  return (
    <Panel>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI Recommendation
            </p>
            <h3 className="mt-2 break-words text-xl font-semibold">
              Start in Los Angeles on Amazon, then expand Temu into Dallas and
              Phoenix.
            </h3>
            <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
              Los Angeles has the strongest Amazon sales density and enough
              competitor distance to validate premium positioning. Use Amazon
              Sponsored Products and creator review seeding first. Once review
              confidence is visible, use Temu coupon bundles in Dallas and
              Phoenix to capture value-sensitive expansion demand.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            [
              "Amazon GTM",
              "Amazon Ads partner or marketplace agency",
              "Maya Chen - Retail media lead, example.amazon@agency.test",
            ],
            [
              "Temu Expansion",
              "Creator-commerce and coupon placement operator",
              "Ethan Brooks - Marketplace ops, example.temu@agency.test",
            ],
          ].map(([title, firm, contact]) => (
            <article
              className="min-w-0 rounded-lg border bg-muted/25 p-3"
              key={title}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </p>
              <p className="mt-2 break-words font-semibold">{firm}</p>
              <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                {contact}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function DataSettings() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel title="Network Health">
          <div className="grid gap-3 text-sm">
            <HealthRow label="Bright Data" value="99.9% Uptime" />
            <HealthRow label="Amazon Connect" value="12ms" />
            <HealthRow label="Temu Stream" value="18ms" />
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

      <Panel title="Bright Data Integrations">
        <div className="overflow-hidden rounded-lg border">
          {[
            [
              "SERP API",
              "Google/Bing organic ranks",
              "Active",
              "2 mins ago",
              "42.5k req",
              "120ms",
            ],
            [
              "Web Scraper API",
              "Amazon storefronts",
              "Active",
              "15 mins ago",
              "1.2M req",
              "850ms",
            ],
            [
              "Scraper Studio",
              "Custom Temu parser",
              "Throttled",
              "1 hr ago",
              "850k req",
              "2.4s",
            ],
            [
              "Web Unlocker",
              "Bypass anti-bot systems",
              "Active",
              "Real-time",
              "500k req",
              "45ms",
            ],
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
                  "w-fit rounded border px-2 py-1 text-xs",
                  row[2] === "Active"
                    ? "border-chart-4/40 text-chart-4"
                    : "border-chart-3/40 text-chart-3",
                )}
              >
                {row[2]}
              </span>
              <p>{row[3]}</p>
              <p>{row[4]}</p>
              <p className={row[5] === "2.4s" ? "text-destructive" : ""}>
                {row[5]}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
