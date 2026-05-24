import { Sparkles } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { Panel } from "../dashboard-primitives";

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
