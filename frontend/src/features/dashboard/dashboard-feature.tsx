import { IconChevronRight } from "@tabler/icons-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SectionFade } from "@/components/animated-page";
import { type DashboardSection, navItems } from "./constants";
import { getSectionLabel, getSectionTitle } from "./data/dashboard-copy";
import {
  CompetitorMirror,
  DataSettings,
  DemandPulse,
  LaunchCompass,
  MarketOverview,
  PersonaDecode,
} from "./components/dashboard-sections";

export function ConsumerIQDashboard({
  className,
  active,
}: {
  className?: string;
  active: DashboardSection;
  onActiveChange: (next: DashboardSection) => void;
}) {
  return (
    <section
      className={cn(
        "flex h-full min-h-0 overflow-hidden bg-background-default text-foreground-default",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b border-border-default bg-background-default px-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
          </div>

        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 w-full px-3 py-3 sm:px-4 lg:px-4 xl:px-5">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-2 text-xs text-foreground-muted">
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

            <SectionFade transitionKey={active}>
              {active === "dashboard" && <MarketOverview />}
              {active === "pulse" && <DemandPulse />}
              {active === "persona" && <PersonaDecode />}
              {active === "competitor" && <CompetitorMirror />}
              {active === "compass" && <LaunchCompass />}
              {active === "settings" && <DataSettings />}
            </SectionFade>
          </div>
        </main>
      </div>
    </section>
  );
}
