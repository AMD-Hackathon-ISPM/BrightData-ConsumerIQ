import { lazy, Suspense } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Panel } from "../dashboard-primitives";
import { AdvisorIntelligence } from "./shared";

const LazyLaunchReadinessMap = lazy(() =>
  import("./launch-readiness-map").then((module) => ({
    default: module.LaunchReadinessMap,
  }))
);

export function LaunchCompass() {
  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <Panel>
        <Suspense
          fallback={
            <div className="grid h-[24rem] min-h-[22rem] place-items-center rounded-lg border bg-background-default text-sm text-muted-foreground sm:h-[28rem] xl:h-[32rem]">
              Loading map
            </div>
          }
        >
          <LazyLaunchReadinessMap />
        </Suspense>
      </Panel>

      <Panel>
        <LaunchSeasonalityCalendar />
      </Panel>

      <Panel>
        <LaunchCitySales />
      </Panel>

      <AdvisorIntelligence
        recommendation="Los Angeles has the strongest Amazon sales density and enough competitor distance to validate premium positioning. Use Amazon Sponsored Products and creator review seeding first. Once review confidence is visible, use Temu coupon bundles in Dallas and Phoenix to capture value-sensitive expansion demand."
        signals={[
          { label: "Pilot City", value: "Los Angeles · Amazon-first" },
          {
            label: "Launch Tactic",
            value: "Sponsored Products + creator review seeding",
          },
          {
            label: "Expansion",
            value: "Temu coupon bundles in Dallas & Phoenix",
          },
        ]}
      />
    </div>
  );
}

function LaunchSeasonalityCalendar() {
  const chartData = [
    { id: "jan", month: "JAN", index: 72, status: "normal" },
    { id: "feb", month: "FEB", index: 134, status: "peak" },
    { id: "mar", month: "MAR", index: 96, status: "peak" },
    { id: "apr", month: "APR", index: 66, status: "normal" },
    { id: "may", month: "MAY", index: 54, status: "normal" },
    { id: "jun", month: "JUN", index: 76, status: "normal" },
    { id: "jul", month: "JUL", index: 146, status: "peak" },
    { id: "aug", month: "AUG", index: 98, status: "peak" },
    { id: "sep", month: "SEP", index: 74, status: "normal" },
    { id: "oct", month: "OCT", index: 138, status: "peak" },
    { id: "nov", month: "NOV", index: -46, status: "avoid" },
    { id: "dec", month: "DEC", index: -38, status: "avoid" },
  ];

  const chartConfig = {
    index: { label: "Demand index", color: "var(--chart-4)" },
  };

  // Launch months are green with intensity scaled to demand; avoid months stay red.
  const launchIndexes = chartData
    .filter((entry) => entry.status !== "avoid")
    .map((entry) => entry.index);
  const minIndex = Math.min(...launchIndexes);
  const maxIndex = Math.max(...launchIndexes);
  const fillOpacityFor = (entry: (typeof chartData)[number]) => {
    if (entry.status === "avoid") return 1;
    const t =
      maxIndex === minIndex
        ? 1
        : (entry.index - minIndex) / (maxIndex - minIndex);
    return 0.4 + t * 0.6;
  };

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 break-words text-sm font-semibold">
          Seasonality Calendar - Demand Index by Month
        </h3>
        <div className="flex shrink-0 flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-chart-4" />
            Peak launch window
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive" />
            Avoid - mega-sale months
          </span>
        </div>
      </div>

      <ChartContainer
        className="h-36 w-full min-w-0 max-w-full overflow-hidden rounded-lg bg-background-default px-1 pt-2"
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
              <Cell
                fill={
                  entry.status === "avoid"
                    ? "var(--destructive)"
                    : "var(--chart-4)"
                }
                fillOpacity={fillOpacityFor(entry)}
                key={entry.id}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

const citySignalToneClass: Record<string, string> = {
  "Best first city": "text-[#98971a] dark:text-[#b8bb26]",
  "High intent": "text-chart-5",
  "Expansion pocket": "text-chart-3",
  "Low competition": "text-[#98971a] dark:text-[#b8bb26]",
};

function LaunchCitySales() {
  const rows = [
    {
      city: "Los Angeles",
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
      <div className="min-w-0">
        <h3 className="break-words font-semibold">City Sales Signals</h3>
        <p className="mt-1 break-words text-sm text-foreground-light">
          Amazon and Temu only
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {rows.slice(0, 3).map((row) => {
          const positive = row.growth.startsWith("+");
          const DeltaIcon = positive ? ArrowUp : ArrowDown;
          return (
            <div
              className="flex h-full min-w-0 flex-col gap-3 rounded-lg border bg-background-default p-3.5 transition-colors hover:bg-background-default/80"
              key={row.city}
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">{row.city}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs font-medium",
                    citySignalToneClass[row.signal] ?? "text-foreground-light"
                  )}
                >
                  {row.signal}
                </p>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="break-words font-mono text-lg font-semibold tabular-nums">
                  {row.sales}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums",
                    positive
                      ? "bg-[#98971a]/15 text-[#98971a] dark:text-[#b8bb26]"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  <DeltaIcon aria-hidden className="size-3" />
                  {row.growth}
                </span>
              </div>

              <dl className="grid gap-2.5 border-t pt-3 text-sm">
                {[
                  ["Channels", row.channels],
                  ["Rating", row.rating],
                  ["Search Demand", row.searchDemand],
                  ["Persona Fit", row.personaFit],
                  ["GDP Per Capita", row.gdpPerCapita],
                ].map(([label, value]) => (
                  <div className="min-w-0" key={label}>
                    <dt className="text-xs text-foreground-light">{label}</dt>
                    <dd className="mt-0.5 break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
