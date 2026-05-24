import { cn } from "@/lib/utils";
import {
  AdvisorIntelligence,
  cardHoverBorderClass,
  type CardTone,
} from "./shared";

export function PersonaDecode() {
  const personaCards = [
    {
      name: "Stressed Young Professional",
      age: "Age 18-26",
      tone: "high" as const,
      description:
        "Urban Gen Z women aged 18-26 who prioritize reliable daily hair solutions, value affordability, and respond to barrier-repair claims.",
      painPoints: [
        "Hair feels dry and damaged from heat styling and daily pollution exposure.",
        "Limited time for elaborate routines on a tight workday schedule.",
        "Premium products feel out of reach on an early-career budget.",
      ],
      goals:
        "Visible results within the first week, a reliable daily routine that fits a busy schedule, and affordable refills they can buy without overthinking.",
    },
    {
      name: "Budget-Conscious Trend Seeker",
      age: "Age 19-27",
      tone: "medium" as const,
      description:
        "Early adopters who follow social trends and switch brands quickly when price/value feels right.",
      painPoints: [
        "Brand fatigue and FOMO when a viral product takes off without them.",
        "Full-size purchases feel risky when the price doesn't match the hype.",
        "Afraid of getting stuck with a half-used product that disappoints.",
      ],
      goals:
        "Try whatever is trending without overspending, swap brands fast if the result disappoints, and share unboxing-worthy finds with their feed.",
    },
    {
      name: "Family Care Gatekeeper",
      age: "Age 28-40",
      tone: "growth" as const,
      description:
        "Household decision makers who prefer gentle daily solutions with proven safety and easy availability.",
      painPoints: [
        "Constant worry about harsh ingredients ending up near the kids.",
        "Juggling personal care needs across multiple family members.",
        "Hard to keep restocking when local shelves run spotty.",
      ],
      goals:
        "One gentle product the whole family can share, transparent ingredient labels, and reliable availability at nearby stores.",
    },
  ];

  const initials = (name: string) =>
    name
      .split(/[\s-]+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

  const avatarToneClass: Record<CardTone, string> = {
    high: "border-destructive-500/40 bg-destructive-500/15 text-destructive-500",
    medium:
      "border-warning-500/40 bg-warning-500/15 text-warning-600 dark:text-warning-500",
    growth:
      "border-[#98971a]/40 bg-[#98971a]/15 text-[#98971a] dark:border-[#b8bb26]/40 dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]",
  };

  return (
    <div className="grid gap-3">
      <section>
        <div className="mb-3 min-w-0">
          <h2 className="break-words text-base font-semibold">User Personas</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto_auto_auto]">
          {personaCards.map((persona) => (
            <article
              className={cn(
                "relative grid gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors md:row-span-6 md:grid-rows-subgrid",
                cardHoverBorderClass[persona.tone],
              )}
              key={persona.name}
            >
              {persona.tone === "high" ? (
                <span className="absolute right-3 top-0 -translate-y-1/2 rounded-full bg-background-default px-px py-px">
                  <span className="block rounded-full bg-destructive-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-destructive-500">
                    High Priority
                  </span>
                </span>
              ) : null}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    avatarToneClass[persona.tone],
                  )}
                >
                  {initials(persona.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-tight">
                    {persona.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {persona.age}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-foreground-light">
                {persona.description}
              </p>
              <p className="-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Pain Points
              </p>
              <ul className="grid gap-1.5 pl-4 text-sm leading-relaxed text-foreground-light [&>li]:list-disc [&>li]:marker:text-muted-foreground">
                {persona.painPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="-mx-3.5 border-y bg-background-default px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Goals
              </p>
              <p className="text-sm leading-relaxed text-foreground-light">
                {persona.goals}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="flex h-full flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">
              Segmentation, Targeting, and Positioning
            </h3>
          </div>
          <div className="grid flex-1 auto-rows-fr gap-2">
            {[
              {
                letter: "S",
                title: "Segmentation",
                text: "Urban Gen Z women in Indonesia seeking affordable daily hair solutions with practical benefits.",
              },
              {
                letter: "T",
                title: "Targeting",
                text: "Price-sensitive consumers who buy shampoo frequently and are open to switching brands that feel trustworthy and convenient.",
              },
              {
                letter: "P",
                title: "Positioning",
                text: "A reliable, affordable daily shampoo that solves dryness and hair damage without premium price tradeoffs.",
              },
            ].map((row) => (
              <div
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-stretch gap-3 sm:grid-cols-[3.5rem_minmax(0,1fr)]"
                key={row.letter}
              >
                <span className="self-center text-center font-mono text-4xl font-bold leading-none text-destructive-500 sm:text-5xl">
                  {row.letter}
                </span>
                <div className="flex min-w-0 flex-col justify-center rounded-lg border bg-background-default px-3 py-3">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {row.title}
                  </p>
                  <p className="mt-1 break-words text-[15px] leading-relaxed text-foreground-light">
                    {row.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-1.5">
            {[
              {
                title: "Geographic",
                text: "Urban Indonesian cities with spillover from metros, high humidity, and pollution exposure.",
              },
              {
                title: "Demographic",
                text: "Women, Gen Z (18-26), students to early-career professionals.",
              },
              {
                title: "Psychographic",
                text: "Practical, budget-conscious, convenience oriented, value reliable daily results.",
              },
              {
                title: "Behavioral",
                text: "High usage frequency, low switching cost, open to social recommendations.",
              },
              {
                title: "Needs",
                text: "Hair solutions that feel compatible, are easy to access, budget-friendly, and suitable for long-term daily use.",
              },
            ].map((item) => (
              <div
                className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-[7.5rem_minmax(0,1fr)] lg:grid-cols-[8rem_minmax(0,1fr)]"
                key={item.title}
              >
                <div className="flex items-center break-words rounded-lg bg-destructive-500/15 px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-destructive-500 sm:px-3 sm:text-[11px] sm:tracking-[0.16em]">
                  {item.title}
                </div>
                <p className="min-w-0 break-words rounded-lg border bg-background-default px-3 py-2 text-sm leading-relaxed text-foreground-light">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
          <div className="mb-3 min-w-0">
            <h3 className="break-words font-semibold">TAM / SAM / SOM</h3>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid flex-1 content-center gap-4 rounded-lg border border-border-default bg-background-default p-4">
              <MarketSizingCircles />
            </div>
            <div className="mt-auto grid gap-2 pt-6 text-sm text-muted-foreground">
            <div className="rounded-lg border border-destructive-500/40 bg-destructive-500/25 p-3 text-foreground">
              All Women Gen Z in Indonesia (BPS, 2025)
            </div>
            <div className="rounded-lg border border-destructive-500/50 bg-destructive-500/50 p-3 text-foreground">
              Urban Gen Z women in Indonesia
            </div>
            <div className="rounded-lg border border-destructive-500/70 bg-destructive-500/90 p-3 text-white">
              The new attainable loyal segment for Sunsilk
            </div>
          </div>
          </div>
        </section>
      </div>

      <AdvisorIntelligence
        recommendation="Focus the first wave on urban Gen Z women who prioritize affordable daily hair solutions and respond to clear efficacy claims. Emphasize barrier-repair messaging, push social proof around consistent results, and keep entry pricing accessible to accelerate trial and repeat."
        signals={[
          { label: "Key Pain Point", value: "Amazon + Temu" },
          { label: "Brand Message", value: "Daily relief, real results" },
          { label: "Market Opportunity", value: "Repeat purchase rate" },
        ]}
      />
    </div>
  );
}

function MarketSizingCircles() {
  const layers = [
    {
      key: "TAM",
      value: 37_032_414,
      label: "Total addressable market",
      opacity: 0.25,
      radius: 128,
    },
    {
      key: "SAM",
      value: 21_775_060,
      label: "Serviceable available market",
      opacity: 0.5,
      radius: 96,
    },
    {
      key: "SOM",
      value: 1_307_407,
      label: "Serviceable obtainable market",
      opacity: 0.9,
      radius: 64,
    },
  ];

  const formatCount = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
      : n.toLocaleString();

  const width = 360;
  const height = 300;
  const cx = width / 2;
  const baseline = height - 8;
  const radii = layers.map((l) => l.radius);

  return (
    <>
      <svg
        aria-hidden="true"
        className="mx-auto block w-full max-w-[360px]"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {radii.map((r, i) => (
          <circle
            cx={cx}
            cy={baseline - r}
            fill="var(--destructive-500)"
            fillOpacity={layers[i].opacity}
            key={layers[i].key}
            r={r}
            stroke="var(--destructive-500)"
            strokeOpacity={0.4}
            strokeWidth={1}
          />
        ))}
        {radii.map((r, i) => {
          const y =
            i === radii.length - 1
              ? baseline - r
              : baseline - 2 * r + 28;
          return (
            <g key={`${layers[i].key}-label`}>
              <text
                className="fill-foreground font-mono text-[11px] font-semibold"
                textAnchor="middle"
                x={cx}
                y={y}
              >
                {layers[i].key}
              </text>
              <text
                className={cn(
                  "text-[11px]",
                  layers[i].key === "SOM"
                    ? "fill-white"
                    : "fill-foreground-light"
                )}
                textAnchor="middle"
                x={cx}
                y={y + 14}
              >
                {formatCount(layers[i].value)} people
              </text>
            </g>
          );
        })}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
        {layers.map((l) => (
          <div key={l.key}>
            <p className="font-mono font-semibold uppercase tracking-[0.16em] text-foreground-light">
              {l.key}
            </p>
            <p className="mt-1 leading-tight">{l.label}</p>
          </div>
        ))}
      </div>
    </>
  );
}
