import {
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CardTone = "high" | "medium" | "growth";

export const cardHoverBorderClass: Record<CardTone, string> = {
  high: "hover:border-destructive-500/50",
  medium: "hover:border-warning-500/50",
  growth: "hover:border-[#98971a]/50 dark:hover:border-[#b8bb26]/50",
};

export const badgeToneClass: Record<CardTone, string> = {
  high: "bg-destructive-500/15 text-destructive-500",
  medium: "bg-warning-500/15 text-warning-600 dark:text-warning-500",
  growth:
    "bg-[#98971a]/15 text-[#98971a] dark:bg-[#b8bb26]/15 dark:text-[#b8bb26]",
};

interface AdvisorSignal {
  detail?: string;
  icon?: "down" | "target" | "trend" | "up";
  label: string;
  tone?: "negative" | "neutral" | "positive";
  value: string;
}

interface AdvisorIntelligenceProps {
  recommendation: string;
  signals: AdvisorSignal[];
}

const advisorSignalToneClass = {
  negative: "text-destructive",
  neutral: "text-foreground-light",
  positive: "text-[#98971a] dark:text-[#b8bb26]",
} as const;

const advisorSignalIcon = {
  down: ArrowDownRight,
  target: Target,
  trend: TrendingUp,
  up: ArrowUpRight,
} as const;

export function AdvisorIntelligence({
  recommendation,
  signals,
}: AdvisorIntelligenceProps) {
  return (
    <section className="relative min-w-0 overflow-hidden rounded-xl border border-chart-5/25 bg-card shadow-sm">
      {/* Hairline accent at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-chart-5/70 to-chart-4/60" />
      {/* Soft glow in the corner for depth */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-56 rounded-full bg-chart-5/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 size-64 rounded-full bg-chart-4/[0.06] blur-3xl" />

      <div className="relative p-4 xl:p-5">
        <div className="flex items-center gap-2">
          <Sparkles
            className="size-[18px] shrink-0"
            color="url(#advisor-ai-icon-gradient)"
          >
            <defs>
              <linearGradient
                id="advisor-ai-icon-gradient"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop stopColor="var(--chart-5)" />
                <stop offset="100%" stopColor="var(--chart-4)" />
              </linearGradient>
            </defs>
          </Sparkles>
          <p className="bg-gradient-to-r from-chart-5 to-chart-4 bg-clip-text text-base font-semibold tracking-tight text-transparent">
            Advisor Intelligence
          </p>
        </div>

        <p className="mt-5 max-w-3xl text-sm leading-relaxed text-foreground-light">
          {recommendation}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {signals.map((signal) => {
            const tone = signal.tone ?? "positive";
            const Icon =
              advisorSignalIcon[
                signal.icon ?? (tone === "negative" ? "down" : "up")
              ];

            return (
              <div
                className="group/signal relative overflow-hidden rounded-lg border border-chart-5/20 bg-background-default/60 p-3 transition-colors hover:border-chart-5/40"
                key={signal.label}
              >
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-chart-5/70 via-chart-5/30 to-chart-4/60" />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-lighter">
                  {signal.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground-default">
                  {signal.value}
                </p>
                {signal.detail ? (
                  <p
                    className={cn(
                      "mt-1.5 flex items-center gap-1 text-xs font-medium",
                      advisorSignalToneClass[tone]
                    )}
                  >
                    <Icon aria-hidden className="size-3 shrink-0" />
                    <span className="break-words">{signal.detail}</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
