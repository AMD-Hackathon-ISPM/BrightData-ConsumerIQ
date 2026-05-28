import { type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Flame,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ClaimTrendItem,
  type DemandPulseData,
  type DemandPulseIntent,
  type DemandPulseTone,
  normalizeDemandPulseData,
  type SearchIntentKeyword,
} from "../../data/demand-pulse";
import {
  DemandSupplyChart,
  Panel,
  PlatformShareChart,
} from "../dashboard-primitives";
import { AdvisorIntelligence } from "./shared";
import { useInsights } from "../../api";

export function DemandPulse() {
  const { dashboardData } = useInsights();
  const data = normalizeDemandPulseData(dashboardData?.demandPulse ?? null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <section>
        <div className="grid gap-3 lg:grid-cols-3">
          <DemandSupplyCard data={data.demandSupply} />

          <Panel title="Marketplace Share">
            <PlatformShareChart data={data.marketplaceShare} />
          </Panel>

          <SearchIntentAnalysis data={data.searchIntent} />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <PriceTierMovement tiers={data.priceTierMovement} />
        <ClaimTrends trends={data.claimTrends} />
      </div>

      <AdvisorIntelligence
        recommendation={data.advisor.recommendation}
        signals={data.advisor.signals}
      />
    </div>
  );
}

function EmptyDataState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[6rem] items-center justify-center rounded-lg border border-dashed bg-muted/10 px-3 py-6 text-center">
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

const insightToneClass: Record<DemandPulseTone, string> = {
  opportunity: "text-[#98971a] dark:text-[#b8bb26]",
  default: "text-foreground-light",
  danger: "text-destructive",
  muted: "text-muted-foreground",
};

function DemandSupplyCard({
  data,
}: {
  data: DemandPulseData["demandSupply"];
}) {
  const hasPoints = data.points.length > 0;
  const hasInsights = data.insights.length > 0;

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 min-w-0 shrink-0">
        <h3 className="min-w-0 break-words font-semibold">Demand vs Supply</h3>
        <div className="mt-1 flex items-center gap-3 text-xs text-foreground-light">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-1" />
            Demand
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-5" />
            Saturation
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {hasPoints ? (
          <DemandSupplyChart data={data.points} />
        ) : (
          <EmptyDataState message="Demand and saturation data will appear here after analysis completes." />
        )}
      </div>

      {hasInsights ? (
        <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
          {data.insights.map(({ formula, label, tone }) => (
            <div
              className="flex h-full flex-col rounded-lg border bg-background-default p-2.5"
              key={label}
            >
              <p
                className={cn(
                  "min-h-[2lh] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] leading-snug",
                  insightToneClass[tone]
                )}
              >
                {label}
              </p>
              <p className="mt-auto pt-2 text-xs text-foreground-light leading-snug">
                {formula}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

const intentLabelClass = {
  commercial: "text-chart-2",
  informational: "text-chart-5",
  transactional: "text-[#98971a] dark:text-[#b8bb26]",
} satisfies Record<DemandPulseIntent, string>;

function SearchIntentAnalysis({
  data,
}: {
  data: DemandPulseData["searchIntent"];
}) {
  const groups = data.groups
    .map((group) => ({
      ...group,
      items: data.keywords
        .filter((keyword) => keyword.tone === group.tone)
        .sort((a, b) => b.change - a.change),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 min-w-0 shrink-0">
        <h3 className="break-words font-semibold">Search Intent Analysis</h3>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {groups.length > 0 ? (
          groups.map(({ items, label, tone }) => (
            <div key={tone}>
              <p
                className={cn(
                  "-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] xl:-mx-4 xl:px-4",
                  intentLabelClass[tone]
                )}
              >
                {label}
              </p>
              <ul className="mt-1 flex flex-col divide-y">
                {items.map((keyword) => (
                  <SearchIntentRow key={keyword.keyword} keyword={keyword} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <EmptyDataState message="Search intent data will appear here after analysis completes." />
        )}
      </div>
    </section>
  );
}

function SearchIntentRow({ keyword }: { keyword: SearchIntentKeyword }) {
  return (
    <li
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
      key={keyword.keyword}
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-sm font-medium">"{keyword.keyword}"</p>
      </div>
      <div className="flex shrink-0 items-center gap-5 text-xs">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            keyword.change > 0
              ? "text-[#98971a] dark:text-[#b8bb26]"
              : "text-destructive"
          )}
        >
          {keyword.change > 0 ? "+" : ""}
          {keyword.change}%
        </span>
        <span className="font-mono tabular-nums text-foreground-light">
          {keyword.volume}K vol
        </span>
      </div>
    </li>
  );
}

function PriceTierMovement({
  tiers,
}: {
  tiers: DemandPulseData["priceTierMovement"];
}) {
  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 min-w-0">
        <h3 className="break-words font-semibold">Price tier movement</h3>
        <p className="mt-1 break-words text-xs text-foreground-light">
          Where demand is shifting · last 90 days
        </p>
      </div>

      <div className="grid flex-1 gap-2">
        {tiers.length > 0 ? (
          tiers.map((tier) => {
            const isOpportunity = tier.tone === "opportunity";
            return (
              <div
                className={cn(
                  "grid grid-cols-[7rem_minmax(0,1fr)_3rem_3.5rem] items-center gap-3 rounded-lg border px-3 py-2.5",
                  isOpportunity
                    ? "border-chart-4/40 bg-chart-4/8"
                    : "border-transparent bg-background-default"
                )}
                key={tier.name}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-sm">
                    {tier.name}
                    {isOpportunity ? (
                      <Flame
                        aria-hidden
                        className="size-3.5 text-[#98971a] dark:text-[#b8bb26]"
                      />
                    ) : null}
                  </p>
                  <p className="text-[11px] text-foreground-light">
                    {tier.range}
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isOpportunity
                        ? "bg-[#98971a] dark:bg-[#b8bb26]"
                        : "bg-muted-foreground/60"
                    )}
                    style={{ width: `${tier.value}%` }}
                  />
                </div>
                <span className="text-right font-mono text-sm font-semibold tabular-nums">
                  {tier.value}%
                </span>
                <span
                  className={cn(
                    "flex items-center justify-end gap-0.5 text-right font-mono text-xs font-semibold tabular-nums",
                    tier.change > 0
                      ? "text-[#98971a] dark:text-[#b8bb26]"
                      : "text-destructive"
                  )}
                >
                  {tier.change > 0 ? (
                    <ArrowUp aria-hidden className="size-3" />
                  ) : (
                    <ArrowDown aria-hidden className="size-3" />
                  )}
                  {tier.change > 0 ? "+" : ""}
                  {tier.change}%
                </span>
              </div>
            );
          })
        ) : (
          <EmptyDataState message="Price tier movement will appear here after analysis completes." />
        )}
      </div>
    </section>
  );
}

function ClaimTrends({
  trends,
}: {
  trends: DemandPulseData["claimTrends"];
}) {
  const hasClaims = trends.rising.length > 0 || trends.falling.length > 0;

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 min-w-0">
        <h3 className="break-words font-semibold">Claim trends</h3>
        <p className="mt-1 break-words text-xs text-foreground-light">
          Efficacy claims gaining and losing traction · last 90 days
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {hasClaims ? (
          <>
            <ClaimTrendGroup
              claims={trends.rising}
              icon={<TrendingUp aria-hidden className="size-3.5" />}
              label="Rising"
              tone="opportunity"
            />
            <ClaimTrendGroup
              claims={trends.falling}
              icon={<TrendingDown aria-hidden className="size-3.5" />}
              label="Falling"
              tone="danger"
            />
          </>
        ) : (
          <EmptyDataState message="Claim trend data will appear here after analysis completes." />
        )}
      </div>
    </section>
  );
}

function ClaimTrendGroup({
  claims,
  icon,
  label,
  tone,
}: {
  claims: ClaimTrendItem[];
  icon: ReactNode;
  label: string;
  tone: "opportunity" | "danger";
}) {
  if (claims.length === 0) return null;

  const positive = tone === "opportunity";

  return (
    <div className={positive ? undefined : "opacity-80"}>
      <p
        className={cn(
          "-mx-3.5 flex items-center gap-1.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] xl:-mx-4 xl:px-4",
          positive
            ? "text-[#98971a] dark:text-[#b8bb26]"
            : "text-destructive"
        )}
      >
        {icon}
        {label}
      </p>
      <ul className="mt-1 flex flex-col divide-y">
        {claims.map((claim) => (
          <li
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
            key={claim.name}
          >
            <div className="flex min-w-0 items-center gap-2">
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  !positive && "text-foreground-light"
                )}
              >
                "{claim.name}"
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-5 text-xs">
              <span
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums",
                  positive
                    ? "text-[#98971a] dark:text-[#b8bb26]"
                    : "text-destructive"
                )}
              >
                {positive && claim.change > 0 ? "+" : ""}
                {claim.change}%
              </span>
              <span className="font-mono tabular-nums text-foreground-light">
                {claim.volume} vol
              </span>
              <span className="text-foreground-light">
                {claim.saturation} sat
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
