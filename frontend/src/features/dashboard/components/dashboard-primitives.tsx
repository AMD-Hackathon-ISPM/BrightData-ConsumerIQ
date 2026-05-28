import { type ReactNode, useId } from "react";
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
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  Sector,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { PieSectorShapeProps } from "recharts";
import type {
  DemandSupplyPoint,
  MarketplaceShareItem,
} from "../data/demand-pulse";

export function Panel({
  action,
  children,
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      {title ? (
        <div className="mb-3 flex min-w-0 shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold">{title}</h3>
            {subtitle ? (
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  status,
  title,
  tone,
  visual,
}: {
  label: string;
  status: string;
  title: string;
  tone?: "success";
  visual?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[10.5rem] flex-col rounded-xl border border-border-default bg-card p-4 shadow-sm transition-colors hover:border-border-stronger">
      <p className="text-sm font-medium tracking-normal text-foreground-light">
        {label}
      </p>
      <p className="mt-4 text-[1.65rem] font-semibold leading-none tracking-tight text-foreground-default">
        {title}
      </p>
      <p
        className={cn(
          "mt-2 text-sm leading-snug text-foreground-light",
          tone === "success" && "text-chart-4"
        )}
      >
        {status}
      </p>
      {visual ? (
        <div className="mt-auto flex flex-1 flex-col justify-end pt-5">{visual}</div>
      ) : null}
    </div>
  );
}

export function MetricSparkline({
  data,
  positive = true,
}: {
  data: number[];
  positive?: boolean;
}) {
  const gradientId = useId();
  const width = 100;
  const height = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const stroke = positive ? "var(--chart-4)" : "var(--muted-foreground)";

  return (
    <svg
      aria-hidden="true"
      className="h-9 w-full"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={area} />
      <polyline
        fill="none"
        points={line}
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const LEVEL_SEGMENTS = ["Low", "Med", "High"] as const;

export function LevelMeter({
  level,
}: {
  level: "low" | "medium" | "high";
}) {
  const filled = level === "low" ? 1 : level === "medium" ? 2 : 3;

  return (
    <div className="w-full">
      <div className="flex gap-1">
        {LEVEL_SEGMENTS.map((segment, index) => (
          <div
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < filled ? "bg-foreground" : "bg-muted"
            )}
            key={segment}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between">
        {LEVEL_SEGMENTS.map((segment, index) => (
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wide",
              index === filled - 1
                ? "text-foreground-light"
                : "text-muted-foreground/50"
            )}
            key={segment}
          >
            {segment}
          </span>
        ))}
      </div>
    </div>
  );
}

const GAP_SLOTS = ["premium", "mid", "budget"] as const;

export function GapMarkers() {
  return (
    <div className="flex items-center gap-1.5">
      {GAP_SLOTS.map((slot) => (
        <span
          className="h-1.5 flex-1 rounded-full border border-chart-5/50 bg-chart-5/20"
          key={slot}
        />
      ))}
    </div>
  );
}

export function ScoreRing({ value, max = 100 }: { value: number; max?: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(value / max, 0), 1);
  const dash = circumference * pct;
  const tier = value >= 70 ? "Strong" : value >= 40 ? "Moderate" : "Weak";

  return (
    <div className="flex items-center gap-2.5">
      <svg aria-hidden="true" className="size-10 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          fill="none"
          r={radius}
          stroke="var(--muted)"
          strokeWidth={4}
        />
        <circle
          cx="20"
          cy="20"
          fill="none"
          r={radius}
          stroke="var(--chart-4)"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          strokeWidth={4}
        />
      </svg>
      <span className="text-xs font-medium text-chart-4">{tier}</span>
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

const marketplaceShareColors = [
  "var(--chart-1)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--muted-foreground)",
];

export function PlatformShareChart({
  data,
}: {
  data: MarketplaceShareItem[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed bg-muted/10 px-3 py-6 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          Marketplace share data will appear here after analysis completes.
        </p>
      </div>
    );
  }

  const chartData = data.map((item, index) => ({
    ...item,
    fill: marketplaceShareColors[index % marketplaceShareColors.length],
  }));
  const activeIndex = chartData.reduce(
    (max, item, idx, arr) => (item.value > arr[max].value ? idx : max),
    0
  );
  const chartConfig = {
    value: { label: "Share", color: "var(--chart-1)" },
  };

  // The highest-share sector bulges outward with a larger outer radius.
  const renderSector = (props: PieSectorShapeProps) => (
    <Sector
      cornerRadius={props.cornerRadius}
      cx={props.cx}
      cy={props.cy}
      endAngle={props.endAngle}
      fill={chartData[props.index]?.fill}
      innerRadius={props.innerRadius}
      outerRadius={
        props.index === activeIndex ? props.outerRadius + 10 : props.outerRadius
      }
      startAngle={props.startAngle}
      stroke="var(--background-default)"
      strokeWidth={1}
    />
  );
  const columns = chartData.length <= 3 ? 1 : 2;
  const rows: (typeof chartData)[] = [];
  for (let i = 0; i < chartData.length; i += columns) {
    rows.push(chartData.slice(i, i + columns));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative mx-auto flex aspect-square w-full max-w-[14rem] min-h-0 flex-1 items-center justify-center">
        <ChartContainer
          className="!aspect-square pointer-events-auto h-full w-full [&_.recharts-tooltip-wrapper]:z-20"
          config={chartConfig}
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => (
                    <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{
                            backgroundColor: item.payload?.fill ?? item.color,
                          }}
                        />
                        <span className="text-muted-foreground">{name}</span>
                      </div>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {Number(value).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  hideLabel
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius="58%"
              nameKey="name"
              outerRadius="82%"
              paddingAngle={2}
              shape={renderSector}
            />
          </PieChart>
        </ChartContainer>
      </div>
      <ul className="shrink-0 overflow-hidden rounded-lg border bg-background-default text-sm">
        {rows.map((row, rowIdx) => (
          <li
            className={cn(
              "flex",
              rowIdx < rows.length - 1 && "border-b"
            )}
            key={row.map((r) => r.name).join("-")}
          >
            {row.map((item, itemIdx) => (
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-1 px-3 py-2",
                  itemIdx > 0 && "border-l"
                )}
                key={item.name}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="truncate text-xs font-medium text-foreground-light">
                    {item.name}
                  </span>
                </span>
                <span className="flex items-baseline gap-1.5">
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
            ))}
            {row.length < columns ? (
              <div
                aria-hidden
                className="flex-1 border-l"
                style={{ flexGrow: columns - row.length }}
              />
            ) : null}
          </li>
        ))}
      </ul>
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

export function DemandSupplyChart({ data }: { data: DemandSupplyPoint[] }) {
  const chartConfig = {
    demand: { label: "Demand", color: "var(--chart-1)" },
    saturation: { label: "Saturation", color: "var(--chart-5)" },
  };

  return (
    <ChartContainer className="h-full min-h-44 w-full" config={chartConfig}>
      <BarChart
        barCategoryGap={14}
        barGap={3}
        data={data}
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
