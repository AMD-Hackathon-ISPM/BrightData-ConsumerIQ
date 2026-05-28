import { cn } from "@/lib/utils";
import {
  MapCard,
  MetricCard,
  Panel,
  RegionBars,
} from "../dashboard-primitives";
import { useInsights } from "../../api";

const FALLBACK_SKUS = [
  ["Barrier Repair Serum", "Amazon Hero SKU", "$18.99", "82%", "+12.4%"],
  ["SPF Moisture Duo", "Temu Bundle", "$14.50", "Low Stock", "+28.1%"],
  ["Peptide Night Cream", "Amazon Premium", "$22.00", "55%", "-1.2%"],
];

const FALLBACK_REGIONS: [string, number][] = [
  ["Los Angeles", 58.2],
  ["New York", 19.4],
  ["Dallas", 12.1],
];

export function MarketOverview() {
  const { dashboardData, loading } = useInsights();
  const mo = dashboardData?.marketOverview;

  const skus = mo?.topSkus?.length
    ? mo.topSkus.map((s) => [s.name, s.tag, s.price, s.stock, s.momentum])
    : FALLBACK_SKUS;

  const regions: [string, number][] = mo?.regionDemand?.length
    ? mo.regionDemand.map((r) => [r.city, r.percentage])
    : FALLBACK_REGIONS;

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
        <MetricCard
          label="Trend Velocity"
          status={mo?.trendVelocityStatus ?? "+12% from last month"}
          title={loading ? "..." : (mo?.trendVelocity ?? "+67%")}
          tone="success"
        />
        <MetricCard
          label="Est. Demand"
          status="High confidence signal"
          title={loading ? "..." : (mo?.estimatedDemand ?? "12.4K")}
        />
        <MetricCard
          label="Price Target"
          status="Optimal market fit"
          title={loading ? "..." : (mo?.priceTarget ?? "$19")}
        />
        <MetricCard
          label="Market Gaps"
          status="High potential entry"
          title={loading ? "..." : `${mo?.marketGaps ?? 3} Found`}
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
            {skus.map((row) => (
              <div
                className="grid grid-cols-[1.3fr_0.8fr_1fr_0.7fr] items-center border-b px-3 py-2.5 text-sm last:border-b-0"
                key={String(row[0])}
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
                    String(row[4]).startsWith("+")
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
          <RegionBars rows={regions} />
        </Panel>
      </div>
    </div>
  );
}
