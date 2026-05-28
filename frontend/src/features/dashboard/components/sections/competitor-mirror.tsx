import { ArrowDown, ArrowUp, Target } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { Panel } from "../dashboard-primitives";
import { AdvisorIntelligence } from "./shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollableTableWrapper } from "@/components/ui/scrollable-table-wrapper";
import { useInsights, type CompetitorMirrorData } from "../../api";

const FALLBACK_COMPETITOR_ROWS: CompetitorMirrorData["competitors"] = [
  {
    brand: "CeraVe",
    sku: "AM Facial Moisturizing Lotion SPF 30",
    avgPrice: "$16.99",
    priceDelta: "-2.1%",
    promoIntensity: "Medium",
    promoLevel: "medium",
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
    promoIntensity: "High",
    promoLevel: "high",
    monthlySales: "82.1K",
    salesDelta: "+12.4%",
    rating: "4.5",
    reviews: "118K",
  },
];

const FALLBACK_ADVISOR_RECOMMENDATION =
  "Competitors are either credible but expensive on Amazon, or cheap but low-trust on Temu. Position the product as a clinically clear, affordable barrier-repair routine with enough proof for Amazon and enough bundle value for Temu.";

const FALLBACK_ADVISOR_SIGNALS = [
  {
    label: "Key Advantage",
    value: "Proof-led barrier repair positioning",
  },
  {
    label: "Pricing Advice",
    value: "$18–$22 Amazon core SKU",
  },
  {
    label: "Positioning",
    value: "Premium efficacy without premium friction",
  },
];

export function CompetitorMirror() {
  const { dashboardData } = useInsights();
  const competitorMirror = dashboardData?.competitorMirror;
  const competitorRows = competitorMirror?.competitors?.length
    ? competitorMirror.competitors
    : FALLBACK_COMPETITOR_ROWS;
  const advisorRecommendation =
    competitorMirror?.advisorRecommendation ?? FALLBACK_ADVISOR_RECOMMENDATION;
  const advisorSignals = competitorMirror?.advisorSignals?.length
    ? competitorMirror.advisorSignals
    : FALLBACK_ADVISOR_SIGNALS;

  return (
    <div className="@container grid min-w-0 gap-3">
      <Panel title="Top Competitor Matrix">
        <div className="min-w-0">
          <ScrollableTableWrapper>
            <Table className="min-w-[56rem]">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[22%]" />
                <col className="w-[24%]" />
                <col className="w-[20%]" />
              </colgroup>
              <TableHeader>
                <TableRow className="bg-background-default hover:bg-background-default">
                  <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                    Brand / Hero SKU
                  </TableHead>
                  <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                    Avg Price (USD)
                  </TableHead>
                  <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                    Est. Monthly Sales
                  </TableHead>
                  <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                    Rating / Reviews
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitorRows.map((row) => (
                  <TableRow
                    className="bg-card hover:bg-card"
                    key={row.sku}
                  >
                    <TableCell className="px-4 py-4 text-sm align-top">
                      <div className="min-w-0">
                        <p className="font-semibold">{row.brand}</p>
                        <p className="truncate text-xs text-foreground-light">
                          {row.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm align-top">
                      <p className="font-mono font-semibold tabular-nums">
                        {row.avgPrice}
                      </p>
                      <DeltaPill value={row.priceDelta} />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm align-top">
                      <p className="font-mono font-semibold tabular-nums">
                        {row.monthlySales}
                      </p>
                      <DeltaPill value={row.salesDelta} />
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm align-top">
                      <p className="font-semibold">
                        {row.rating}
                        <span className="ml-1 font-mono text-xs tabular-nums text-foreground-light">
                          ({row.reviews})
                        </span>
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollableTableWrapper>
        </div>
      </Panel>

      <div className="grid min-w-0 gap-3 @min-[44rem]:grid-cols-2">
        <PricingSweetSpotPanel tiers={competitorMirror?.pricingTiers ?? null} />
        <AvgSalesMovementPanel />
      </div>

      <AdvisorIntelligence
        recommendation={advisorRecommendation}
        signals={advisorSignals}
      />
    </div>
  );
}

function DeltaPill({ value }: { value: string }) {
  const positive = value.startsWith("+");
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums",
        positive
          ? "text-[#98971a] dark:text-[#b8bb26]"
          : "text-destructive"
      )}
    >
      <Icon aria-hidden className="size-3" />
      {value}
    </span>
  );
}

const sweetSpotTones: Record<string, { bar: string; dot: string }> = {
  saturated: { bar: "bg-destructive", dot: "bg-destructive" },
  sweet: { bar: "bg-chart-4", dot: "bg-chart-4" },
  premium: { bar: "bg-chart-3", dot: "bg-chart-3" },
};

type PricingBand = {
  demand: number;
  detail: string;
  range: string;
  status: string;
  tone: string;
  trend: number;
  recommended?: boolean;
};

const FALLBACK_PRICING_BANDS: PricingBand[] = [
  {
    range: "50–80K",
    status: "Saturated",
    demand: 28,
    detail: "47 active sellers",
    trend: 1.2,
    tone: "saturated",
  },
  {
    range: "100–130K",
    status: "Sweet spot",
    demand: 23,
    detail: "19 active sellers",
    trend: 8.6,
    tone: "sweet",
    recommended: true,
  },
  {
    range: "150–200K",
    status: "Premium opp",
    demand: 15,
    detail: "8 active sellers",
    trend: 4.1,
    tone: "premium",
  },
];

function pricingTierTone(type: CompetitorMirrorData["pricingTiers"][number]["type"]) {
  return type === "sweet-spot" ? "sweet" : type;
}

function toPricingBands(
  tiers: CompetitorMirrorData["pricingTiers"] | null,
): PricingBand[] {
  if (!tiers?.length) return FALLBACK_PRICING_BANDS;
  return tiers.map((tier) => ({
    demand: tier.percentage,
    detail: tier.demand,
    range: tier.label,
    status: tier.note,
    tone: pricingTierTone(tier.type),
    trend: 0,
    recommended: tier.type === "sweet-spot",
  }));
}

function PricingSweetSpotPanel({
  tiers,
}: {
  tiers: CompetitorMirrorData["pricingTiers"] | null;
}) {
  const bands = toPricingBands(tiers);
  const maxDemand = Math.max(...bands.map((band) => band.demand));

  return (
    <Panel title="Pricing Sweet Spot">
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-2.5">
        {bands.map((band) => {
          const tone = sweetSpotTones[band.tone];
          const fill = `${Math.round((band.demand / maxDemand) * 100)}%`;
          const up = band.trend >= 0;
          const TrendIcon = up ? ArrowUp : ArrowDown;
          return (
            <div
              className={cn(
                "rounded-lg border p-3 transition-colors",
                band.recommended
                  ? "border-chart-4/40 bg-chart-4/[0.07] ring-1 ring-inset ring-chart-4/15"
                  : "border-transparent bg-background-default"
              )}
              key={band.range}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={cn("size-2 shrink-0 rounded-full", tone.dot)}
                  />
                  <p className="min-w-0 truncate font-mono text-sm font-semibold tabular-nums">
                    {band.range}
                  </p>
                  {band.recommended ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-chart-4">
                      <Target aria-hidden className="size-3" />
                      {band.status}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground-light">
                      {band.status}
                    </span>
                  )}
                </div>
                <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                  {band.demand}
                  <span className="ml-0.5 text-xs text-foreground-light">%</span>
                </p>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted/60">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-500 ease-out",
                    tone.bar
                  )}
                  style={{ width: fill }}
                />
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-foreground-light">{band.detail}</span>
                <span className="flex items-center gap-1 text-foreground-light">
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 font-mono font-medium tabular-nums",
                      up ? "text-chart-4" : "text-destructive"
                    )}
                  >
                    <TrendIcon aria-hidden className="size-3" />
                    {up ? "+" : ""}
                    {band.trend.toFixed(1)}%
                  </span>
                  30d
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function AvgSalesMovementPanel() {
  const data = [
    { week: "W1", value: 42 },
    { week: "W2", value: 45 },
    { week: "W3", value: 44 },
    { week: "W4", value: 49 },
    { week: "W5", value: 48 },
    { week: "W6", value: 55 },
    { week: "W7", value: 58 },
    { week: "W8", value: 63 },
    { week: "W9", value: 69 },
    { week: "W10", value: 74 },
  ];
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const delta = ((last.value - prev.value) / prev.value) * 100;
  const chartConfig = {
    value: { label: "Avg units", color: "var(--chart-5)" },
  };

  return (
    <Panel title="Avg Sales Movement">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 items-end justify-between gap-3">
          <div>
            <p className="font-mono text-2xl font-semibold leading-none tracking-tight tabular-nums">
              {last.value.toFixed(1)}K
            </p>
            <p className="mt-1.5 text-xs text-foreground-light">
              avg weekly units sold
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-chart-4">
            <ArrowUp aria-hidden className="size-3" />+{delta.toFixed(1)}%
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <ChartContainer
            className="h-full min-h-44 w-full"
            config={chartConfig}
          >
            <AreaChart
              data={data}
              margin={{ bottom: 0, left: 4, right: 4, top: 8 }}
            >
              <defs>
                <linearGradient
                  id="sales-movement-fill"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-value)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-value)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--border)"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                axisLine={false}
                dataKey="week"
                interval="preserveStartEnd"
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis domain={["dataMin - 6", "dataMax + 6"]} hide />
              <ChartTooltip
                content={<ChartTooltipContent />}
                cursor={{ stroke: "var(--border)" }}
              />
              <Area
                activeDot={{ fill: "var(--color-value)", r: 4, strokeWidth: 0 }}
                dataKey="value"
                dot={false}
                fill="url(#sales-movement-fill)"
                stroke="var(--color-value)"
                strokeWidth={2.5}
                type="monotone"
              />
              <ReferenceDot
                fill="var(--color-value)"
                r={4}
                stroke="var(--card)"
                strokeWidth={2}
                x={last.week}
                y={last.value}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </div>
    </Panel>
  );
}
