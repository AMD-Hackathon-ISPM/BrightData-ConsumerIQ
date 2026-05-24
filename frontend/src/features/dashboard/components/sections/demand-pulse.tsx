import { ArrowRight, Info, Sparkles, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  AdvisorIntelligence,
  badgeToneClass,
  cardHoverBorderClass,
} from "./shared";

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

      <ProductOpportunityMatrix />

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

function SearchIntentAnalysis() {
  const keywords = [
    {
      keyword: '"barrier repair serum"',
      intent: "Commercial",
      volume: "144K",
    },
    {
      keyword: '"spf moisturizer sensitive skin"',
      intent: "Informational",
      volume: "82K",
    },
    {
      keyword: '"budget skincare bundle"',
      intent: "Transactional",
      volume: "36K",
    },
  ];

  return (
    <section className="rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words font-semibold">Search Intent Analysis</h3>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Live SERP clustering
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-chart-4/40 bg-chart-4/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-chart-4">
          Live
        </span>
      </div>

      <ul className="grid gap-2">
        {keywords.map(({ intent, keyword, volume }) => (
          <li
            className="rounded-lg border bg-background-default p-3"
            key={keyword}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-medium">{keyword}</p>
              <ArrowRight className="size-4 shrink-0 opacity-70" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
                {intent}
              </span>
              <span className="rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Vol {volume}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductOpportunityMatrix() {
  const opportunities = [
    {
      title: "Tinted Sunscreen SPF 50+",
      demand: "92/100",
      saturation: "Low",
      tags: ["Makeup-Skincare Hybrid", "Daily Wear"],
      icon: Sparkles,
      tone: "high" as const,
    },
    {
      title: "Acne Spot Gel (Centella)",
      demand: "88/100",
      saturation: "Med",
      tags: ["Targeted Treatment", "Gen Z"],
      icon: TrendingUp,
      tone: "medium" as const,
    },
    {
      title: "Peptide Lip Treatment",
      demand: "85/100",
      saturation: "Low",
      tags: ["Premiumization", "Night Care"],
      icon: Target,
      tone: "growth" as const,
    },
  ];

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-base font-semibold">
            Product Opportunity Matrix
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            High demand, low competitor saturation niches
          </p>
        </div>
        <Button className="text-chart-5" size="sm" variant="ghost">
          View Full Report
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {opportunities.map(
          ({ demand, icon: Icon, saturation, tags, title, tone }) => (
            <article
              className={cn(
                "relative grid gap-3 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm transition-colors xl:p-4",
                cardHoverBorderClass[tone],
              )}
              key={title}
            >
              <div
                className={cn(
                  "absolute top-0 right-0 grid size-16 place-items-start justify-end rounded-bl-full p-3",
                  badgeToneClass[tone],
                )}
              >
                <Icon className="size-5" />
              </div>

              <h3 className="pr-12 text-base font-semibold leading-tight">
                {title}
              </h3>

              <p className="-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground xl:-mx-4 xl:px-4">
                Signals
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm text-foreground-light">
                <p>
                  <span className="text-muted-foreground">Demand Index </span>
                  <strong className="text-foreground-default">{demand}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Saturation </span>
                  <strong className="text-foreground-default">
                    {saturation}
                  </strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    className="rounded-full border bg-muted/40 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
