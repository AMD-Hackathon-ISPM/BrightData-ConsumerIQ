import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SectionFade } from "@/components/animated-page";
import { ScrollableTableWrapper } from "@/components/ui/scrollable-table-wrapper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GapMarkers,
  LevelMeter,
  MetricCard,
  MetricSparkline,
  Panel,
  ScoreRing,
} from "../dashboard-primitives";
import { AdvisorIntelligence } from "./shared";
import { useInsights } from "../../api";

function Entrance({
  animate,
  children,
  delay,
  transitionKey,
}: {
  animate: boolean;
  children: ReactNode;
  delay?: number;
  transitionKey: string;
}) {
  if (animate) {
    return (
      <SectionFade className="h-full" delay={delay} transitionKey={transitionKey}>
        {children}
      </SectionFade>
    );
  }

  return <div className="h-full min-w-0">{children}</div>;
}

const DEMAND_TREND = [38, 42, 40, 47, 45, 52, 58, 61, 66, 74];

type MarketplaceRow = {
  channel: string;
  change: number;
  name: string;
  price: string;
  stockLabel: string;
  stockPct: number;
};

const MARKETPLACE_ROWS: MarketplaceRow[] = [
  {
    channel: "Amazon · Hero SKU",
    change: 12.4,
    name: "Barrier Repair Serum",
    price: "$18.99",
    stockLabel: "82%",
    stockPct: 82,
  },
  {
    channel: "Temu · Bundle",
    change: 28.1,
    name: "SPF Moisture Duo",
    price: "$14.50",
    stockLabel: "Low",
    stockPct: 18,
  },
  {
    channel: "Amazon · Premium",
    change: -1.2,
    name: "Peptide Night Cream",
    price: "$22.00",
    stockLabel: "55%",
    stockPct: 55,
  },
];

function parsePercent(value: string) {
  const match = value.match(/[-+]?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function stockPercent(value: string) {
  const match = value.match(/\d+(\.\d+)?/);
  if (match) return Math.min(100, Math.max(0, Number(match[0])));
  return value.toLowerCase().includes("low") ? 18 : 66;
}

function SignalRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

const WHITESPACE_DOTS = [
  { x: 16, y: 24 },
  { x: 23, y: 32 },
  { x: 19, y: 42 },
  { x: 33, y: 16 },
  { x: 36, y: 48 },
  { x: 31, y: 62 },
  { x: 47, y: 56 },
  { x: 44, y: 72 },
  { x: 58, y: 50 },
  { x: 67, y: 54 },
  { x: 74, y: 38 },
  { x: 80, y: 64 },
  { x: 84, y: 46 },
] as const;

const WHITESPACE_COLUMNS = ["Budget", "Mid", "Premium"] as const;
const WHITESPACE_ROWS = ["High claim", "Medium claim", "Low claim"] as const;

const WHITESPACE_ZONES = [
  {
    height: "18%",
    id: 1,
    label: "Premium · fragrance-free",
    left: "57%",
    top: "9%",
    width: "27%",
  },
  {
    height: "17%",
    id: 2,
    label: "Mid · sensitive skin",
    left: "37%",
    top: "30%",
    width: "23%",
  },
  {
    height: "17%",
    id: 3,
    label: "Budget · clinical claim",
    left: "11%",
    top: "65%",
    width: "25%",
  },
] as const;

function WhitespaceMap() {
  return (
    <div className="w-full">
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-foreground-light" />
          Competitor SKU
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] border border-chart-5/60 bg-chart-5/15" />
          Opportunity gap
        </span>
      </div>

      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2 gap-y-1">
        <div />
        <div className="grid grid-cols-3 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {WHITESPACE_COLUMNS.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>

        <div className="grid grid-rows-3 py-2 text-right text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {WHITESPACE_ROWS.map((row) => (
            <span className="flex items-center justify-end" key={row}>
              {row}
            </span>
          ))}
        </div>

        <div className="min-w-0">
          <div className="relative aspect-[2.4] min-h-56 w-full overflow-hidden rounded-lg border bg-muted/20">
            <div
              aria-hidden="true"
              className="absolute inset-0 grid grid-cols-3 grid-rows-3"
            >
              {WHITESPACE_ROWS.flatMap((row, rowIndex) =>
                WHITESPACE_COLUMNS.map((column, columnIndex) => (
                  <span
                    className={cn(
                      "border-border-default/60 bg-card/20",
                      columnIndex < WHITESPACE_COLUMNS.length - 1 && "border-r",
                      rowIndex < WHITESPACE_ROWS.length - 1 && "border-b"
                    )}
                    key={`${row}-${column}`}
                  />
                ))
              )}
            </div>

            {WHITESPACE_ZONES.map((zone) => (
              <div
                className="absolute flex items-center justify-center rounded-md border border-chart-5/40 bg-chart-5/10 px-2 text-center"
                key={zone.label}
                style={{
                  height: zone.height,
                  left: zone.left,
                  top: zone.top,
                  width: zone.width,
                }}
              >
                <span className="-left-2 -top-2 absolute flex size-4 items-center justify-center rounded-full bg-chart-5 text-[9px] font-bold text-background shadow-sm">
                  {zone.id}
                </span>
                <span className="text-[11px] font-medium leading-tight text-chart-5">
                  {zone.label}
                </span>
              </div>
            ))}

            {WHITESPACE_DOTS.map((dot) => (
              <span
                className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground-light"
                key={`${dot.x}-${dot.y}`}
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

export function MarketOverview({ animate = true }: { animate?: boolean }) {
  const { dashboardData, loading } = useInsights();
  const overview = dashboardData?.marketOverview;
  const rows = overview?.topSkus?.length
    ? overview.topSkus.map((sku) => ({
        channel: sku.tag,
        change: parsePercent(sku.momentum),
        name: sku.name,
        price: sku.price,
        stockLabel: sku.stock,
        stockPct: stockPercent(sku.stock),
      }))
    : MARKETPLACE_ROWS;
  const topRegion = overview?.regionDemand?.[0];
  const isLoading = loading && !overview;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Entrance animate={animate} delay={200} transitionKey="metric-0">
          <MetricCard
            label="Est. Demand"
            status={overview?.trendVelocityStatus ?? "+18% vs 90-day avg"}
            title={isLoading ? "..." : (overview?.estimatedDemand ?? "12.4K/mo")}
            tone="success"
            visual={<MetricSparkline data={DEMAND_TREND} />}
          />
        </Entrance>
        <Entrance animate={animate} delay={320} transitionKey="metric-1">
          <MetricCard
            label="Trend Velocity"
            status="Current insight run"
            title={isLoading ? "..." : (overview?.trendVelocity ?? "+67%")}
            visual={<LevelMeter level="medium" />}
          />
        </Entrance>
        <Entrance animate={animate} delay={440} transitionKey="metric-2">
          <MetricCard
            label="Price Target"
            status="Optimal market fit"
            title={isLoading ? "..." : (overview?.priceTarget ?? "$19")}
            visual={<GapMarkers />}
          />
        </Entrance>
        <Entrance animate={animate} delay={560} transitionKey="metric-3">
          <MetricCard
            label="Market Gaps"
            status="High potential entry"
            title={
              isLoading ? "..." : `${overview?.marketGaps ?? 3} found`
            }
            visual={<ScoreRing value={78} />}
          />
        </Entrance>
      </div>

      <Entrance animate={animate} delay={680} transitionKey="panel-moves">
        <AdvisorIntelligence
          recommendation="Demand is climbing and the $18–24 fragrance-free band is underserved, so there's room to enter without a price war. Hold at $18.99 to sit below the median yet above the bargain tier, lead the listing with a fragrance-free claim to capture the top unmet review request, then test a Temu bundle at $14.50 to ride the fastest-growing SKU format."
          signals={[
            {
              label: "Pricing",
              value: "Hold at $18.99",
              detail: "Below median, above bargain band",
              icon: "target",
              tone: "neutral",
            },
            {
              label: "Positioning",
              value: 'Lead with "fragrance-free"',
              detail: "Top unmet review request",
              icon: "trend",
              tone: "positive",
            },
            {
              label: "Channel",
              value: "Test Temu at $14.50",
              detail: "Bundle SKU +28%",
              icon: "up",
              tone: "positive",
            },
          ]}
        />
      </Entrance>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1.13fr)_minmax(18rem,0.87fr)]">
        <Entrance animate={animate} delay={800} transitionKey="panel-pulse">
          <Panel title="Marketplace Pulse">
            <ScrollableTableWrapper>
              <Table className="min-w-[42rem]">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[18%]" />
                  <col className="w-[26%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <TableHeader>
                  <TableRow className="bg-background-default hover:bg-background-default">
                    <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                      Product
                    </TableHead>
                    <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                      Price
                    </TableHead>
                    <TableHead className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                      Stock
                    </TableHead>
                    <TableHead className="h-10 px-4 text-right font-mono text-[11px] font-medium uppercase tracking-[1px] text-foreground-light">
                      30-day
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const positive = row.change >= 0;
                    const TrendIcon = positive ? ArrowUpRight : ArrowDownRight;
                    return (
                      <TableRow className="bg-card hover:bg-card" key={row.name}>
                        <TableCell className="px-4 py-4 text-sm align-top">
                          <div className="min-w-0">
                            <p className="font-semibold">{row.name}</p>
                            <p className="truncate text-xs text-foreground-light">
                              {row.channel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm align-top">
                          <p className="font-mono font-semibold tabular-nums">
                            {row.price}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm align-top">
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-foreground"
                                style={{ width: `${row.stockPct}%` }}
                              />
                            </span>
                            <span className="text-xs text-foreground-light">
                              {row.stockLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-sm align-top">
                          <p
                            className={cn(
                              "flex items-center justify-end gap-0.5 text-right font-mono font-semibold tabular-nums",
                              positive ? "text-chart-4" : "text-foreground-light"
                            )}
                          >
                            <TrendIcon aria-hidden className="size-3.5 shrink-0" />
                            {positive ? "+" : ""}
                            {row.change.toFixed(1)}%
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollableTableWrapper>
          </Panel>
        </Entrance>

        <Entrance animate={animate} delay={920} transitionKey="panel-signals">
          <Panel title="Category Signals">
            <div className="flex flex-col">
              <SignalRow
                label="Top demand region"
                value={
                  <span className="inline-flex items-baseline gap-1.5">
                    {topRegion?.city ?? "Los Angeles"}{" "}
                    <span className="text-chart-4">
                      {topRegion ? `${topRegion.percentage}%` : "+44%"}
                    </span>
                  </span>
                }
              />
              <SignalRow
                label="Trend velocity"
                value={overview?.trendVelocity ?? "+67%"}
              />
              <SignalRow
                label="Price target"
                value={overview?.priceTarget ?? "$18–24"}
              />
              <SignalRow
                label="Market gaps"
                value={`${overview?.marketGaps ?? 3} found`}
              />
            </div>
          </Panel>
        </Entrance>
      </div>

      <Entrance animate={animate} delay={1040} transitionKey="panel-whitespace">
        <Panel title="Whitespace Map">
          <WhitespaceMap />
        </Panel>
      </Entrance>
    </div>
  );
}
