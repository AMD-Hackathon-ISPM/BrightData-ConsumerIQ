import {
  ArrowDown,
  ArrowUp,
  Flame,
  Info,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 min-w-0 shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 break-words font-semibold">Demand vs Supply</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="About Demand vs Supply"
                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              className="max-w-[18rem]"
              side="right"
              sideOffset={8}
            >
              <p className="font-medium">
                Opportunity by demand index and market saturation
              </p>
              <ul className="mt-1.5 grid gap-0.5 text-xs">
                <li>High demand + low saturation = strong opportunity.</li>
                <li>High demand + high saturation = crowded market.</li>
                <li>Low demand + low saturation = unproven.</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </div>
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

      <div
        className={cn(
          "mt-3 flex shrink-0 items-center gap-2.5 rounded-lg border px-2.5 py-2",
          "border-[#98971a]/30 bg-[#98971a]/8 dark:border-[#b8bb26]/30 dark:bg-[#b8bb26]/8",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#98971a]/15 text-[#98971a] dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#98971a] dark:text-[#b8bb26]">
            Strong opportunity
          </p>
          <p className="truncate text-sm font-medium">
            Tinted SPF · 64pt demand–saturation gap
          </p>
        </div>
      </div>
    </section>
  );
}

const intentBadgeClass = {
  commercial: "border-chart-2/40 bg-chart-2/15 text-chart-2",
  informational: "border-chart-5/40 bg-chart-5/15 text-chart-5",
  transactional:
    "border-[#98971a]/40 bg-[#98971a]/15 text-[#98971a] dark:border-[#b8bb26]/40 dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]",
} as const;

const intentBarClass = {
  commercial: "bg-chart-2",
  informational: "bg-chart-5",
  transactional: "bg-[#98971a] dark:bg-[#b8bb26]",
} as const;

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

  const maxVolume = Math.max(...keywords.map((k) => k.volume));

  return (
    <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 min-w-0 shrink-0">
        <h3 className="break-words font-semibold">Search Intent Analysis</h3>
      </div>

      <div className="relative min-h-0 flex-1">
        <ScrollArea className="!absolute inset-0 -mr-2 pr-2">
          <ul className="grid gap-2">
          {keywords.map(({ change, intent, keyword, tone, volume }) => (
            <li
              className="rounded-lg border bg-background-default p-3"
              key={keyword}
            >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium">
                "{keyword}"
              </p>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-0.5 font-mono text-[11px] font-semibold tabular-nums",
                  change > 0
                    ? "text-[#98971a] dark:text-[#b8bb26]"
                    : "text-destructive"
                )}
              >
                {change > 0 ? (
                  <ArrowUp aria-hidden className="size-3" />
                ) : (
                  <ArrowDown aria-hidden className="size-3" />
                )}
                {change > 0 ? "+" : ""}
                {change}%
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-3">
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
                  intentBadgeClass[tone]
                )}
              >
                {intent}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      intentBarClass[tone]
                    )}
                    style={{ width: `${(volume / maxVolume) * 100}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground-light">
                  {volume}K
                </span>
              </div>
            </div>
            </li>
          ))}
          </ul>
        </ScrollArea>
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

      <div className="mt-3 flex shrink-0 items-start gap-2.5 rounded-lg border border-chart-5/30 bg-chart-5/10 px-3 py-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-chart-5/20 text-chart-5">
          <Lightbulb className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-chart-5">
            Signal: Value-shift to mid-tier
          </p>
          <p className="text-xs text-foreground-light">
            Mid-band ($10–$25) is the only accelerating tier. Pricing window is
            moving down.
          </p>
        </div>
      </div>
    </section>
  );
}

function ClaimTrends() {
  const claims = [
    {
      name: "Microbiome-friendly",
      change: 127,
      volume: "24K",
      saturation: "Very low",
      whitespace: true,
    },
    {
      name: "Barrier repair",
      change: 42,
      volume: "89K",
      saturation: "Low",
      whitespace: false,
    },
    {
      name: "Skin barrier",
      change: 38,
      volume: "67K",
      saturation: "Medium",
      whitespace: false,
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

      <p className="text-sm font-medium text-[#98971a] dark:text-[#b8bb26]">
        Rising
      </p>

      <ul className="mt-1 flex flex-1 flex-col divide-y">
        {claims.map((claim) => (
          <li
            className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3"
            key={claim.name}
          >
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-medium">"{claim.name}"</p>
              {claim.whitespace ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-chart-3/40 bg-chart-3/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-chart-3">
                  <Sparkles aria-hidden className="size-3" />
                  Whitespace
                </span>
              ) : null}
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
    </section>
  );
}
