import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "../dashboard-primitives";

export function CompetitorMirror() {
  const competitorRows = [
    {
      brand: "CeraVe",
      sku: "AM Facial Moisturizing Lotion SPF 30",
      avgPrice: "$16.99",
      priceDelta: "-2.1%",
      promoIntensity: "High",
      promoLevel: "high",
      monthlySales: "45.2K",
      salesDelta: "+5.4%",
      rating: "4.7",
      reviews: "94K",
    },
    {
      brand: "COSRX",
      sku: "Snail Mucin Essence 100ml",
      avgPrice: "$13.80",
      priceDelta: "-0.8%",
      promoIntensity: "Low",
      promoLevel: "low",
      monthlySales: "18.5K",
      salesDelta: "-1.2%",
      rating: "4.6",
      reviews: "72K",
    },
    {
      brand: "The Ordinary",
      sku: "Hyaluronic Acid 2% + B5",
      avgPrice: "$18.50",
      priceDelta: "+5.8%",
      promoIntensity: "Very High",
      promoLevel: "very-high",
      monthlySales: "82.1K",
      salesDelta: "+12.4%",
      rating: "4.5",
      reviews: "118K",
    },
  ];

  const promoBarClasses: Record<string, string> = {
    low: "w-1/4 bg-muted-foreground/50",
    medium: "w-1/2 bg-muted-foreground/70",
    high: "w-3/4 bg-foreground",
    "very-high": "w-5/6 bg-foreground",
  };

  return (
    <div className="grid min-w-0 gap-3">
      <Panel title="Top Competitor Matrix">
        <div className="grid gap-3 md:hidden">
          {competitorRows.map((row) => (
            <article
              className="min-w-0 rounded-lg border bg-muted/25 p-3"
              key={row.sku}
            >
              <div className="min-w-0">
                <p className="font-semibold">{row.brand}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {row.sku}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
                  <p className="font-semibold">{row.avgPrice}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.priceDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.priceDelta}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Sales</p>
                  <p className="font-semibold">{row.monthlySales}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.salesDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.salesDelta}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Promo</p>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ??
                          "w-1/2 bg-foreground",
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs">{row.promoIntensity}</p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-semibold">{row.rating}</p>
                  <p className="text-xs text-muted-foreground">{row.reviews}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <div className="min-w-[52rem]">
            <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Brand / Hero SKU</span>
              <span>Avg Price (USD)</span>
              <span>Promo Intensity</span>
              <span>Est. Monthly Sales</span>
              <span>Rating / Reviews</span>
            </div>
            {competitorRows.map((row) => (
              <div
                className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] items-center border-b px-4 py-3 text-sm last:border-b-0"
                key={row.sku}
              >
                <div>
                  <p className="font-semibold">{row.brand}</p>
                  <p className="text-xs text-muted-foreground">{row.sku}</p>
                </div>
                <div>
                  <p className="font-semibold">{row.avgPrice}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.priceDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.priceDelta}
                  </p>
                </div>
                <div>
                  <div className="h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ??
                          "w-1/2 bg-foreground",
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.promoIntensity}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{row.monthlySales}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.salesDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive",
                    )}
                  >
                    {row.salesDelta}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">
                    {row.rating}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({row.reviews})
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <PricingSweetSpotPanel />
        <AvgSalesMovementPanel />
      </div>

      <CompetitorRecommendation />
    </div>
  );
}

function PricingSweetSpotPanel() {
  const rows = [
    {
      label: "50-80K",
      note: "saturated",
      demand: "28% demand",
      width: "28%",
      tone: "bg-destructive",
      textTone: "text-foreground",
    },
    {
      label: "100-130K",
      note: "sweet spot",
      demand: "23% demand",
      width: "23%",
      tone: "bg-emerald-500",
      textTone: "text-emerald-500",
    },
    {
      label: "150-200K",
      note: "premium opp",
      demand: "15% demand",
      width: "15%",
      tone: "bg-amber-500",
      textTone: "text-foreground",
    },
  ];

  return (
    <Panel title="Pricing Sweet Spot">
      <div className="grid gap-3">
        {rows.map((row) => (
          <div className="grid gap-2" key={row.label}>
            <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
              <p
                className={cn(
                  "min-w-0 break-words font-semibold",
                  row.textTone,
                )}
              >
                {row.label} - {row.note}
              </p>
              <p className="shrink-0 font-semibold text-muted-foreground">
                {row.demand}
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-muted/70">
              <span
                className={cn("block h-full rounded-full", row.tone)}
                style={{ width: row.width }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Hero RP 119K - 23% demand, only 8% of competitors
      </p>
    </Panel>
  );
}

function AvgSalesMovementPanel() {
  return (
    <Panel title="Avg Sales Movement">
      <div className="h-44 w-full overflow-hidden rounded-lg border bg-muted/30">
        <svg
          aria-label="Average sales movement chart"
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 640 180"
        >
          <defs>
            <linearGradient id="salesMovementFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-blue)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-blue)" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path
            d="M0 145 C48 128 78 118 112 112 C148 106 166 130 204 118 C244 105 250 91 296 86 C344 80 360 66 414 61 C456 57 480 10 506 27 C536 47 524 87 566 101 C596 111 618 115 640 123 L640 180 L0 180 Z"
            fill="url(#salesMovementFill)"
          />
          <path
            d="M0 145 C48 128 78 118 112 112 C148 106 166 130 204 118 C244 105 250 91 296 86 C344 80 360 66 414 61 C456 57 480 10 506 27 C536 47 524 87 566 101 C596 111 618 115 640 123"
            fill="none"
            stroke="var(--chart-blue)"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium text-muted-foreground">
        Category +18% YoY - stable upward
      </p>
    </Panel>
  );
}

function CompetitorRecommendation() {
  const items = [
    {
      label: "Key Advantage",
      value: "Proof-led barrier repair positioning",
      detail:
        "Amazon buyers reward clinical proof, while Temu shoppers respond to visible bundle value.",
    },
    {
      label: "Pricing Advice",
      value: "$18-$22 Amazon core SKU",
      detail:
        "Keep Amazon above commodity pricing, then use Temu under-$15 starter bundles for trial.",
    },
    {
      label: "Positioning",
      value: "Premium efficacy without premium friction",
      detail:
        "Lead with sensitive-skin trust, fast absorption, and clearer ingredient claims.",
    },
  ];

  return (
    <Panel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recommendation
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold">
              Win by owning the trust gap between Amazon and Temu.
            </h3>
            <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
              Competitors are either credible but expensive on Amazon, or cheap
              but low-trust on Temu. Position the product as a clinically clear,
              affordable barrier-repair routine with enough proof for Amazon and
              enough bundle value for Temu.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article
            className="min-w-0 rounded-lg border bg-muted/25 p-3"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 break-words font-semibold">{item.value}</p>
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              {item.detail}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}
