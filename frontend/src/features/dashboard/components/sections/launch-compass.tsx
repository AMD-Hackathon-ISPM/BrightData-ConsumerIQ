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
import { useInsights, type LaunchCompassData } from "../../api";

const LazyLaunchReadinessMap = lazy(() =>
  import("./launch-readiness-map").then((module) => ({
    default: module.LaunchReadinessMap,
  }))
);

export function LaunchCompass() {
  const { dashboardData } = useInsights();
  const lc = dashboardData?.launchCompass;

  const seasonality = lc?.seasonality ?? [];
  const citySales = lc?.citySales ?? [];
  const advisorRecommendation =
    lc?.advisorRecommendation ?? "Generating launch recommendation…";
  const advisorSignals = lc?.advisorSignals ?? [];

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

      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Panel>
          <LaunchSeasonalityCalendar chartData={seasonality} />
        </Panel>

        <Panel>
          <LaunchCitySales rows={citySales} />
        </Panel>
      </div>

      <AdvisorIntelligence recommendation={advisorRecommendation} signals={advisorSignals} />
    </div>
  );
}

function LaunchSeasonalityCalendar({ chartData }: { chartData: LaunchCompassData["seasonality"] }) {

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

      {chartData.length === 0 ? (
        <div className="grid h-36 place-items-center rounded-lg border bg-background-default text-sm text-muted-foreground">
          Generating seasonality data…
        </div>
      ) : (
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
                <Cell fill={fillByStatus[entry.status]} key={entry.id} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

const citySignalToneClass: Record<string, string> = {
  "Best first city": "text-[#98971a] dark:text-[#b8bb26]",
  "High intent": "text-chart-5",
  "Expansion pocket": "text-chart-3",
  "Low competition": "text-[#98971a] dark:text-[#b8bb26]",
};

function LaunchCitySales({ rows }: { rows: LaunchCompassData["citySales"] }) {

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
          the past month
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="grid min-h-[8rem] place-items-center rounded-lg border bg-background-default text-sm text-muted-foreground">
          Generating city sales data…
        </div>
      ) : (
      <div className="max-h-[40.5rem] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {rows.map((row) => {
          const positive = row.growth.startsWith("+");
          const DeltaIcon = positive ? ArrowUp : ArrowDown;
          return (
            <div
              className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-background-default p-3 transition-colors hover:bg-background-default/80"
              key={row.city}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{row.city}</p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      citySignalToneClass[row.signal] ?? "text-muted-foreground"
                    )}
                  >
                    {row.signal}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
                  <p className="font-medium text-muted-foreground">Sales</p>
                  <p className="min-w-0 break-words font-semibold">
                    <span>{row.sales}</span>
                    <span
                      className={cn(
                        "ml-2 inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums",
                        positive
                          ? "text-[#98971a] dark:text-[#b8bb26]"
                          : "text-destructive"
                      )}
                    >
                      <DeltaIcon aria-hidden className="size-3" />
                      {row.growth}
                    </span>
                  </p>
                </div>
                {[
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
          );
        })}
      </div>
      )}
    </div>
  );
}
