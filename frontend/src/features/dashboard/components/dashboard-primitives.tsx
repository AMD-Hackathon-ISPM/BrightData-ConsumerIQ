import type { ReactNode } from "react";
import { Database, Globe2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

export function Panel({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      {title ? (
        <div className="mb-3 min-w-0 shrink-0">
          <h3 className="break-words font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  status,
  title,
  tone,
}: {
  label: string;
  status: string;
  title: string;
  tone?: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-sm",
        tone === "danger" && "border-destructive/30 bg-destructive/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight",
          tone === "danger" && "text-destructive"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm text-muted-foreground",
          tone === "success" && "text-chart-4",
          tone === "danger" && "text-destructive"
        )}
      >
        {status}
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-foreground",
            tone === "danger" && "bg-destructive"
          )}
          style={{ width: tone === "danger" ? "45%" : "67%" }}
        />
      </div>
    </div>
  );
}

export function SmallStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger";
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function MapCard() {
  const chartData = [
    { city: "Los Angeles", x: 31, y: 46, z: 58.2 },
    { city: "New York", x: 62, y: 54, z: 19.4 },
    { city: "Dallas", x: 48, y: 66, z: 12.1 },
  ];
  const chartConfig = {
    z: {
      label: "Demand",
      color: "var(--foreground)",
    },
  };

  return (
    <div className="relative mb-3 aspect-[2.35] min-h-40 rounded-lg border bg-muted/30">
      <Globe2 className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 size-20 text-muted-foreground/15" />
      <ChartContainer
        className="absolute inset-0 h-full w-full"
        config={chartConfig}
      >
        <ScatterChart margin={{ bottom: 12, left: 12, right: 12, top: 12 }}>
          <XAxis dataKey="x" domain={[0, 100]} hide type="number" />
          <YAxis dataKey="y" domain={[0, 100]} hide type="number" />
          <ZAxis dataKey="z" range={[70, 240]} type="number" />
          <ChartTooltip
            content={<ChartTooltipContent hideLabel nameKey="city" />}
          />
          <Scatter data={chartData} fill="var(--color-z)" name="Demand" />
        </ScatterChart>
      </ChartContainer>
    </div>
  );
}

export function RegionBars({ rows }: { rows: [string, number][] }) {
  const chartData = rows.map(([label, value]) => ({ label, value }));
  const chartConfig = {
    value: {
      label: "Share",
      color: "var(--foreground)",
    },
  };

  return (
    <ChartContainer className="h-24 w-full" config={chartConfig}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis hide type="number" />
        <YAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          type="category"
          width={82}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 6, 6]} />
      </BarChart>
    </ChartContainer>
  );
}

export function PlatformShareChart() {
  const chartData = [
    {
      name: "Amazon",
      value: 61.5,
      change: 2.1,
      fill: "var(--chart-1)",
    },
    {
      name: "Temu",
      value: 38.5,
      change: -2.1,
      fill: "var(--chart-5)",
    },
  ];
  const chartConfig = {
    value: {
      label: "Share",
      color: "var(--chart-1)",
    },
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="relative mx-auto flex aspect-square w-full max-h-44 max-w-44 flex-1 items-center justify-center">
        <ChartContainer
          className="!aspect-square pointer-events-auto h-full w-full [&_.recharts-tooltip-wrapper]:z-20"
          config={chartConfig}
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius="58%"
              nameKey="name"
              outerRadius="82%"
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-semibold text-2xl tabular-nums">62%</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground-light">
            Leader
          </p>
        </div>
      </div>
      <div className="grid shrink-0 gap-3 text-sm">
        {chartData.map((item) => (
          <div className="grid gap-1.5" key={item.name}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="font-medium">{item.name}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {item.value.toFixed(1)}%
                </span>
                <span
                  className={cn(
                    "font-mono text-[10px] font-semibold tabular-nums",
                    item.change > 0 ? "text-chart-4" : "text-destructive"
                  )}
                >
                  {item.change > 0 ? "+" : ""}
                  {item.change.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.fill,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineGraph() {
  const chartData = [
    { week: "W1", value: 42 },
    { week: "W2", value: 46 },
    { week: "W3", value: 45 },
    { week: "W4", value: 52 },
    { week: "W5", value: 49 },
    { week: "W6", value: 58 },
    { week: "W7", value: 62 },
    { week: "W8", value: 68 },
    { week: "W9", value: 72 },
    { week: "W10", value: 77 },
  ];
  const chartConfig = {
    value: {
      label: "Velocity",
      color: "var(--chart-5)",
    },
  };

  return (
    <ChartContainer className="h-56 w-full" config={chartConfig}>
      <AreaChart
        data={chartData}
        margin={{ bottom: 0, left: 12, right: 12, top: 12 }}
      >
        <defs>
          <linearGradient id="velocity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-value)"
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor="var(--color-value)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeOpacity={0.6} vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="week"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          activeDot={{ fill: "var(--color-value)", r: 4, strokeWidth: 0 }}
          dataKey="value"
          fill="url(#velocity-fill)"
          stroke="var(--color-value)"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function DemandSupplyChart() {
  const chartData = [
    { product: "Tinted SPF", demand: 92, saturation: 28 },
    { product: "Acne Gel", demand: 88, saturation: 55 },
    { product: "Peptide Lip", demand: 85, saturation: 32 },
  ];
  const chartConfig = {
    demand: { label: "Demand", color: "var(--chart-1)" },
    saturation: { label: "Saturation", color: "var(--chart-5)" },
  };

  return (
    <ChartContainer className="h-full min-h-44 w-full" config={chartConfig}>
      <BarChart
        barCategoryGap={14}
        barGap={3}
        data={chartData}
        layout="vertical"
        margin={{ bottom: 0, left: 8, right: 12, top: 4 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--border)"
          strokeOpacity={0.5}
        />
        <XAxis
          axisLine={false}
          domain={[0, 100]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
          type="number"
        />
        <YAxis
          axisLine={false}
          dataKey="product"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickLine={false}
          tickMargin={8}
          type="category"
          width={72}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          barSize={10}
          dataKey="demand"
          fill="var(--color-demand)"
          radius={[3, 3, 3, 3]}
        />
        <Bar
          barSize={10}
          dataKey="saturation"
          fill="var(--color-saturation)"
          radius={[3, 3, 3, 3]}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function PriceMovementChart() {
  const chartData = [
    { period: "Jan", you: 52, somethinc: 58, skintific: 44 },
    { period: "Feb", you: 54, somethinc: 59, skintific: 43 },
    { period: "Mar", you: 56, somethinc: 61, skintific: 42 },
    { period: "Apr", you: 58, somethinc: 63, skintific: 41 },
    { period: "May", you: 62, somethinc: 66, skintific: 45 },
    { period: "Jun", you: 68, somethinc: 70, skintific: 49 },
  ];
  const chartConfig = {
    you: { label: "You", color: "var(--foreground)" },
    somethinc: { label: "Amazon Avg", color: "var(--chart-4)" },
    skintific: { label: "Temu Avg", color: "var(--destructive)" },
  };

  return (
    <ChartContainer className="h-full w-full" config={chartConfig}>
      <LineChart
        data={chartData}
        margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" hide />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="you"
          stroke="var(--color-you)"
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
        <Line
          dataKey="somethinc"
          stroke="var(--color-somethinc)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 4"
          type="monotone"
        />
        <Line
          dataKey="skintific"
          stroke="var(--color-skintific)"
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}

export function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Database className="size-4" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
