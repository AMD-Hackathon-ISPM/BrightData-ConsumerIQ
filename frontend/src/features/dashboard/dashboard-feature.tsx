import { IconChevronRight } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SectionFade } from "@/components/animated-page";
import { type DashboardSection, navItems } from "./constants";
import { getSectionLabel, getSectionTitle } from "./data/dashboard-copy";
import {
  CompetitorMirror,
  DemandPulse,
  LaunchCompass,
  MarketOverview,
  PersonaDecode,
} from "./components/sections";

export function ConsumerIQDashboard({
  className,
  active,
}: {
  className?: string;
  active: DashboardSection;
  onActiveChange: (next: DashboardSection) => void;
}) {
  const dashboardAnimatedRef = useRef(false);
  const animateDashboard = active === "dashboard" && !dashboardAnimatedRef.current;

  useEffect(() => {
    if (active === "dashboard") {
      dashboardAnimatedRef.current = true;
    }
  }, [active]);

  return (
    <section
      className={cn(
        "flex h-full min-h-0 overflow-hidden bg-background-default text-foreground-default",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 w-full px-6 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-9 xl:px-12 xl:py-9">
            <SectionFade transitionKey={`header-${active}`}>
              <div className="mb-10 flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-5 flex items-center gap-2 text-xs text-foreground-muted">
                    Analysis <IconChevronRight className="size-3" stroke={1.8} />
                    <span className="font-medium text-foreground-default">
                      {navItems.find((item) => item.id === active)?.label}
                    </span>
                  </p>
                  <h2 className="break-words text-2xl font-semibold tracking-tight">
                    {getSectionTitle(active)}
                  </h2>
                  <p className="mt-1.5 max-w-3xl break-words text-sm text-foreground-light">
                    {getSectionLabel(active)}
                  </p>
                </div>
              </div>
            </SectionFade>

            <SectionFade key={active} transitionKey={active} delay={70}>
              {active === "dashboard" && (
                <MarketOverview animate={animateDashboard} />
              )}
              {active === "pulse" && <DemandPulse />}
              {active === "persona" && <PersonaDecode />}
              {active === "competitor" && <CompetitorMirror />}
              {active === "compass" && <LaunchCompass />}
            </SectionFade>
          </div>
        </main>
      </div>
    </section>
  );
}
