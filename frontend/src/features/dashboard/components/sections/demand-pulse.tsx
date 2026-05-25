import {
  ArrowDown,
  ArrowUp,
  Flame,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DemandSupplyChart,
  Panel,
  PlatformShareChart,
} from "../dashboard-primitives";
import { AdvisorIntelligence } from "./shared";

export function DemandPulse() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <section>
        <div className="grid gap-3 lg:grid-cols-3">
          <DemandSupplyCard />

          <Panel title="Marketplace Share">
            <PlatformShareChart />
          </Panel>

          <SearchIntentAnalysis />
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <PriceTierMovement />
        <ClaimTrends />
      </div>

      <AdvisorIntelligence
        recommendation={
          'Prioritize Amazon for high-intent conversion because search demand is clustering around proof-based skincare terms. Use Sponsored Products on "barrier repair serum" and "sensitive skin SPF", then test Temu deal placements for bundle discovery and price-sensitive trial traffic.'
        }
        signals={[
          { label: "Headline", value: "Lead with Amazon, amplify with Temu" },
          {
            label: "Best Channel",
            value: "Amazon Search + Sponsored Products",
          },
          {
            label: "Ad Placement",
            value: "Temu in-app bundles + coupon feed",
          },
        ]}
      />
    </div>
  );
}

function DemandSupplyCard() {
  const insights = [
    {
      label: "Strong opportunity",
      formula: "High demand + low saturation",
      tone: "text-[#98971a] dark:text-[#b8bb26]",
    },
    {
      label: "Crowded market",
      formula: "High demand + high saturation",
      tone: "text-destructive",
    },
    {
      label: "Unproven",
      formula: "Low demand + low saturation",
      tone: "text-muted-foreground",
    },
  ];

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
        <DemandSupplyChart />
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
        {insights.map(({ formula, label, tone }) => (
          <div
            className="flex h-full flex-col rounded-lg border bg-background-default p-2.5"
            key={label}
          >
            <p
              className={cn(
                "min-h-[2lh] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] leading-snug",
                tone
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
    </section>
  );
}

const intentLabelClass = {
  commercial: "text-chart-2",
  informational: "text-chart-5",
  transactional: "text-[#98971a] dark:text-[#b8bb26]",
} as const;

type IntentTone = keyof typeof intentLabelClass;

function SearchIntentAnalysis() {
  const keywords = [
    {
      keyword: "barrier repair serum",
      intent: "Commercial",
      volume: 144,
      change: 12,
      tone: "commercial" as const,
    },
    {
      keyword: "spf moisturizer sensitive skin",
      intent: "Informational",
      volume: 82,
      change: 8,
      tone: "informational" as const,
    },
    {
      keyword: "budget skincare bundle",
      intent: "Transactional",
      volume: 36,
      change: -3,
      tone: "transactional" as const,
    },
    {
      keyword: "peptide eye cream",
      intent: "Commercial",
      volume: 64,
      change: 19,
      tone: "commercial" as const,
    },
    {
      keyword: "niacinamide vs vitamin c",
      intent: "Informational",
      volume: 58,
      change: 5,
      tone: "informational" as const,
    },
    {
      keyword: "korean glass skin routine",
      intent: "Informational",
      volume: 47,
      change: 22,
      tone: "informational" as const,
    },
    {
      keyword: "centella spot treatment",
      intent: "Transactional",
      volume: 29,
      change: 14,
      tone: "transactional" as const,
    },
  ];

  const groups: { tone: IntentTone; label: string }[] = [
    { tone: "commercial", label: "Commercial" },
    { tone: "informational", label: "Informational" },
    { tone: "transactional", label: "Transactional" },
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 min-w-0 shrink-0">
        <h3 className="break-words font-semibold">Search Intent Analysis</h3>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {groups.map(({ tone, label }) => {
          const items = keywords
            .filter((k) => k.tone === tone)
            .sort((a, b) => b.change - a.change);
          if (items.length === 0) return null;
          return (
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
                {items.map(({ change, keyword, volume }) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                    key={keyword}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        "{keyword}"
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-5 text-xs">
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold tabular-nums",
                          change > 0
                            ? "text-[#98971a] dark:text-[#b8bb26]"
                            : "text-destructive"
                        )}
                      >
                        {change > 0 ? "+" : ""}
                        {change}%
                      </span>
                      <span className="font-mono tabular-nums text-foreground-light">
                        {volume}K vol
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PriceTierMovement() {
  const tiers = [
    { name: "Budget", range: "$0–$10", value: 12, change: -4, accent: false },
    { name: "Mid", range: "$10–$25", value: 47, change: 18, accent: true },
    {
      name: "Premium",
      range: "$25–$50",
      value: 28,
      change: -6,
      accent: false,
    },
    { name: "Luxury", range: "$50+", value: 13, change: 3, accent: false },
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 min-w-0">
        <h3 className="break-words font-semibold">Price tier movement</h3>
        <p className="mt-1 break-words text-xs text-foreground-light">
          Where demand is shifting · last 90 days
        </p>
      </div>

      <div className="grid flex-1 gap-2">
        {tiers.map((tier) => (
          <div
            className={cn(
              "grid grid-cols-[7rem_minmax(0,1fr)_3rem_3.5rem] items-center gap-3 rounded-lg border px-3 py-2.5",
              tier.accent
                ? "border-chart-4/40 bg-chart-4/8"
                : "border-transparent bg-background-default"
            )}
            key={tier.name}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-semibold text-sm">
                {tier.name}
                {tier.accent ? (
                  <Flame
                    aria-hidden
                    className="size-3.5 text-[#98971a] dark:text-[#b8bb26]"
                  />
                ) : null}
              </p>
              <p className="text-[11px] text-foreground-light">{tier.range}</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  tier.accent
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
        ))}
      </div>

    </section>
  );
}

function ClaimTrends() {
  const rising = [
    {
      name: "Microbiome-friendly",
      change: 127,
      volume: "24K",
      saturation: "Very low",
    },
    {
      name: "Barrier repair",
      change: 42,
      volume: "89K",
      saturation: "Low",
    },
    {
      name: "Skin barrier",
      change: 38,
      volume: "67K",
      saturation: "Medium",
    },
  ];
  const falling = [
    {
      name: "Paraben-free",
      change: -34,
      volume: "112K",
      saturation: "Very high",
    },
    {
      name: "Anti-aging",
      change: -18,
      volume: "204K",
      saturation: "High",
    },
  ];

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 min-w-0">
        <h3 className="break-words font-semibold">Claim trends</h3>
        <p className="mt-1 break-words text-xs text-foreground-light">
          Efficacy claims gaining and losing traction · last 90 days
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div>
          <p className="-mx-3.5 flex items-center gap-1.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#98971a] xl:-mx-4 xl:px-4 dark:text-[#b8bb26]">
            <TrendingUp aria-hidden className="size-3.5" />
            Rising
          </p>
          <ul className="mt-1 flex flex-col divide-y">
            {rising.map((claim) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                key={claim.name}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium">"{claim.name}"</p>
                </div>
                <div className="flex shrink-0 items-center gap-5 text-xs">
                  <span className="font-mono text-sm font-semibold tabular-nums text-[#98971a] dark:text-[#b8bb26]">
                    +{claim.change}%
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

        <div className="opacity-80">
          <p className="-mx-3.5 flex items-center gap-1.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-destructive xl:-mx-4 xl:px-4">
            <TrendingDown aria-hidden className="size-3.5" />
            Falling
          </p>
          <ul className="mt-1 flex flex-col divide-y">
            {falling.map((claim) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                key={claim.name}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground-light">
                    "{claim.name}"
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-5 text-xs">
                  <span className="font-mono text-sm font-semibold tabular-nums text-destructive">
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
      </div>
    </section>
  );
}
