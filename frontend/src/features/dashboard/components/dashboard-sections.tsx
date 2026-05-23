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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
      painPoints:
        "Hair feels dry and damaged from heat styling and pollution; limited time for elaborate routines; tight budget that rules out premium products.",
      goals:
        "Visible results within the first week, a reliable daily routine that fits a busy schedule, and affordable refills they can buy without overthinking.",
    },
    {
      name: "Budget-Conscious Trend Seeker",
      age: "Age 19-27",
      tone: "medium" as const,
      description:
        "Early adopters who follow social trends and switch brands quickly when price/value feels right.",
      painPoints:
        "Brand fatigue and FOMO when missing a viral product; full-size purchases feel risky at the wrong price; afraid of getting stuck with something that doesn't deliver.",
      goals:
        "Try whatever is trending without overspending, swap brands fast if the result disappoints, and share unboxing-worthy finds with their feed.",
    },
    {
      name: "Family Care Gatekeeper",
      age: "Age 28-40",
      tone: "growth" as const,
      description:
        "Household decision makers who prefer gentle daily solutions with proven safety and easy availability.",
      painPoints:
        "Worry about harsh ingredients near kids; juggling care for multiple family members; hard to keep restocking when local shelves run spotty.",
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

  const cardToneClass: Record<"high" | "medium" | "growth", string> = {
    high: "border-destructive-500/40 bg-destructive-500/[0.03]",
    medium: "border-warning-500/40 bg-warning-500/[0.03]",
    growth:
      "border-[#98971a]/40 bg-[#98971a]/[0.03] dark:border-[#b8bb26]/40 dark:bg-[#b8bb26]/[0.03]",
  };

  return (
    <div className="grid gap-3">
      <section>
        <div className="mb-3 min-w-0">
          <h2 className="break-words text-base font-semibold">User Personas</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {personaCards.map((persona) => (
            <article
              className={cn(
                "grid gap-3 rounded-xl border bg-card p-3.5 shadow-sm",
                cardToneClass[persona.tone],
              )}
              key={persona.name}
            >
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
              <p className="text-sm text-muted-foreground">
                {persona.description}
              </p>
              <Tabs defaultValue="pain">
                <TabsList className="w-full">
                  <TabsTrigger value="pain">Pain Points</TabsTrigger>
                  <TabsTrigger value="goals">Goals</TabsTrigger>
                </TabsList>
                <TabsContent
                  className="text-sm leading-relaxed text-muted-foreground"
                  value="pain"
                >
                  {persona.painPoints}
                </TabsContent>
                <TabsContent
                  className="text-sm leading-relaxed text-muted-foreground"
                  value="goals"
                >
                  {persona.goals}
                </TabsContent>
              </Tabs>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <Panel title="STP" subtitle="Segmentation, Targeting, Positioning">
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Segmentation
              </p>
              <p className="mt-2 text-sm">
                Urban Gen Z women in Indonesia seeking affordable daily hair
                solutions with practical benefits.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Targeting
              </p>
              <p className="mt-2 text-sm">
                Price-sensitive consumers who buy shampoo frequently and are
                open to switching brands that feel trustworthy and convenient.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Positioning
              </p>
              <p className="mt-2 text-sm">
                A reliable, affordable daily shampoo that solves dryness and
                hair damage without premium price tradeoffs.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
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
            ].map((item) => (
              <details
                className="group rounded-lg border bg-muted/40 p-3 transition-all duration-200 ease-out open:bg-card"
                key={item.title}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground transition-transform duration-200 group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  {item.text}
                </p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel title="TAM / SAM / SOM" subtitle="Market Sizing">
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                TAM
              </p>
              <p className="mt-2 text-2xl font-semibold">37,032,414</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total addressable market
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                SAM
              </p>
              <p className="mt-2 text-2xl font-semibold">21,775,060</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Serviceable available market
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                SOM
              </p>
              <p className="mt-2 text-2xl font-semibold">1,307,407</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Serviceable obtainable market
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-muted/40 p-3">
              All Women Gen Z in Indonesia (BPS, 2025)
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              Urban Gen Z women in Indonesia
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              The new attainable loyal segment for Sunsilk
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              Sunsilk can tap into an attainable market of 1.3 million urban Gen
              Z women in Indonesia who seek affordable and flexible solutions
              for daily hair problems.
            </div>
          </div>
        </Panel>
      </div>

      <Panel subtitle="Primary target market summary">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">AI Recommendation</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Focus the first wave on urban Gen Z women who prioritize affordable
          daily hair solutions and respond to clear efficacy claims. Emphasize
          barrier-repair messaging, push social proof around consistent results,
          and keep entry pricing accessible to accelerate trial and repeat.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Main Channel
            </p>
            <p className="mt-2 text-sm font-semibold">Amazon + Temu</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Core Message
            </p>
            <p className="mt-2 text-sm font-semibold">
              Daily relief, real results
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              KPI Focus
            </p>
            <p className="mt-2 text-sm font-semibold">Repeat purchase rate</p>
          </div>
        </div>
      </Panel>
    </div>
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

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <PricingSweetSpotPanel />
        <AvgSalesMovementPanel />
      </div>

      <CompetitorRecommendation />
    </div>
  );
}

function PricingSweetSpotPanel() {
  const rows = [
    {
      label: "50-80K",
      note: "saturated",
      demand: "28% demand",
      width: "28%",
      tone: "bg-destructive",
      textTone: "text-foreground",
    },
    {
      label: "100-130K",
      note: "sweet spot",
      demand: "23% demand",
      width: "23%",
      tone: "bg-emerald-500",
      textTone: "text-emerald-500",
    },
    {
      label: "150-200K",
      note: "premium opp",
      demand: "15% demand",
      width: "15%",
      tone: "bg-amber-500",
      textTone: "text-foreground",
    },
  ];

  return (
    <Panel title="Pricing Sweet Spot">
      <div className="grid gap-3">
        {rows.map((row) => (
          <div className="grid gap-2" key={row.label}>
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <p
                className={cn(
                  "min-w-0 break-words font-semibold",
                  row.textTone,
                )}
              >
                {row.label} - {row.note}
              </p>
              <p className="shrink-0 font-semibold text-muted-foreground">
                {row.demand}
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-muted/70">
              <span
                className={cn("block h-full rounded-full", row.tone)}
                style={{ width: row.width }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Hero RP 119K - 23% demand, only 8% of competitors
      </p>
    </Panel>
  );
}

function AvgSalesMovementPanel() {
  return (
    <Panel title="Avg Sales Movement">
      <div className="h-44 w-full overflow-hidden rounded-lg border bg-muted/30">
        <svg
          aria-label="Average sales movement chart"
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 640 180"
        >
          <defs>
            <linearGradient id="salesMovementFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-blue)" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path
            d="M0 145 C48 128 78 118 112 112 C148 106 166 130 204 118 C244 105 250 91 296 86 C344 80 360 66 414 61 C456 57 480 10 506 27 C536 47 524 87 566 101 C596 111 618 115 640 123 L640 180 L0 180 Z"
            fill="url(#salesMovementFill)"
          />
          <path
            d="M0 145 C48 128 78 118 112 112 C148 106 166 130 204 118 C244 105 250 91 296 86 C344 80 360 66 414 61 C456 57 480 10 506 27 C536 47 524 87 566 101 C596 111 618 115 640 123"
            fill="none"
            stroke="var(--chart-blue)"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Category +18% YoY - stable upward
      </p>
    </Panel>
  );
}

function CompetitorRecommendation() {
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
              Recommendation
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
        <Panel>
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">Interactive Heatmap</h3>
            <p className="mt-1 break-words text-sm text-muted-foreground">
              Demand area by sales and expansion opportunity by competitor
              position
            </p>
          </div>

          <div className="grid min-w-0 gap-5">
            <LaunchHeatmap />

            <div className="border-t pt-4">
              <LaunchSeasonalityCalendar />
            </div>
          </div>
        </Panel>

        <Panel>
          <LaunchCitySales />
        </Panel>
      </div>

      <LaunchAiRecommendation />
    </div>
  );
}

function LaunchSeasonalityCalendar() {
  const chartData = [
    { id: "jan", month: "J", index: 72, status: "normal" },
    { id: "feb", month: "F", index: 134, status: "peak" },
    { id: "mar", month: "M", index: 96, status: "peak" },
    { id: "apr", month: "A", index: 66, status: "normal" },
    { id: "may", month: "M", index: 54, status: "normal" },
    { id: "jun", month: "J", index: 76, status: "normal" },
    { id: "jul", month: "J", index: 146, status: "peak" },
    { id: "aug", month: "A", index: 98, status: "peak" },
    { id: "sep", month: "S", index: 74, status: "normal" },
    { id: "oct", month: "O", index: 138, status: "peak" },
    { id: "nov", month: "N", index: -46, status: "avoid" },
    { id: "dec", month: "D", index: -38, status: "avoid" },
  ];

  const chartConfig = {
    index: { label: "Demand index", color: "var(--chart-blue)" },
  };

  const fillByStatus: Record<string, string> = {
    avoid: "var(--destructive)",
    normal: "color-mix(in srgb, var(--chart-blue) 45%, white)",
    peak: "var(--chart-blue)",
  };

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 break-words text-sm font-semibold">
          Seasonality Calendar - Demand Index by Month
        </h3>
        <div className="flex shrink-0 flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-chart-blue" />
            Peak launch window
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive" />
            Avoid - mega-sale months
          </span>
        </div>
      </div>

      <ChartContainer
        className="h-36 w-full min-w-0 max-w-full overflow-hidden rounded-lg bg-muted/20 px-1 pt-2"
        config={chartConfig}
        initialDimension={{ height: 144, width: 520 }}
      >
        <BarChart
          data={chartData}
          margin={{ bottom: 14, left: 0, right: 0, top: 8 }}
        >
          <XAxis
            axisLine={false}
            dataKey="month"
            interval={0}
            tickLine={false}
          />
          <YAxis domain={[-60, 160]} hide type="number" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, _name, item) => {
                  const payload = item.payload as (typeof chartData)[number];
                  const label =
                    payload.status === "avoid"
                      ? "avoid - mega-sale month"
                      : payload.status === "peak"
                        ? "peak launch window"
                        : "steady demand";

                  return `${payload.month}: ${Math.abs(Number(value))} - ${label}`;
                }}
              />
            }
          />
          <Bar dataKey="index" radius={[4, 4, 4, 4]}>
            {chartData.map((entry) => (
              <Cell fill={fillByStatus[entry.status]} key={entry.id} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
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
      score: "92 fit",
      sales: "25.6K units",
      growth: "+18%",
      channels: "Amazon 72% - Temu 28%",
      rating: "4.3 stars (1,240 reviews)",
      searchDemand: "Index 132 (high)",
      personaFit: "68% - 480K target pop",
      gdpPerCapita: "$74K",
      signal: "Best first city",
    },
    {
      city: "New York",
      score: "86 fit",
      sales: "22.9K units",
      growth: "+11%",
      channels: "Amazon 70% - Temu 30%",
      rating: "4.2 stars (980 reviews)",
      searchDemand: "Index 118 (high)",
      personaFit: "61% - 520K target pop",
      gdpPerCapita: "$82K",
      signal: "High intent",
    },
    {
      city: "Dallas",
      score: "81 fit",
      sales: "22.2K units",
      growth: "+24%",
      channels: "Amazon 42% - Temu 58%",
      rating: "4.1 stars (710 reviews)",
      searchDemand: "Index 104 (medium)",
      personaFit: "64% - 390K target pop",
      gdpPerCapita: "$69K",
      signal: "Expansion pocket",
    },
    {
      city: "Phoenix",
      score: "74 fit",
      sales: "16.3K units",
      growth: "+21%",
      channels: "Amazon 41% - Temu 59%",
      rating: "4.0 stars (560 reviews)",
      searchDemand: "Index 96 (medium)",
      personaFit: "59% - 310K target pop",
      gdpPerCapita: "$66K",
      signal: "Low competition",
    },
  ];

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">City Sales Signals</h3>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            Amazon and Temu only
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold">
          1 bulan terakhir
        </span>
      </div>

      <div className="max-h-[40.5rem] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {rows.map((row) => (
          <div
            className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
            key={row.city}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{row.city}</p>
                <p className="text-xs text-muted-foreground">{row.signal}</p>
              </div>
              <span className="shrink-0 rounded-full bg-foreground px-2.5 py-1 text-[10px] font-semibold text-background">
                {row.score}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              {[
                ["Sales", `${row.sales} ${row.growth}`],
                ["Channels", row.channels],
                ["Rating", row.rating],
                ["Search Demand", row.searchDemand],
                ["Persona Fit", row.personaFit],
                ["GDP Per Capita", row.gdpPerCapita],
              ].map(([label, value]) => (
                <div
                  className="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-2"
                  key={label}
                >
                  <p className="font-medium text-muted-foreground">{label}</p>
                  <p className="min-w-0 break-words font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
              Recommendation
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
