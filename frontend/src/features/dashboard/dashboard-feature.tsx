import { ChevronRight, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SectionFade } from "@/components/animated-page";
import { type DashboardSection, navItems } from "./constants";
import { getSectionLabel, getSectionTitle } from "./data/dashboard-copy";
import { searchSuggestions } from "./data/dashboard-search";
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
  onActiveChange,
}: {
  className?: string;
  active: DashboardSection;
  onActiveChange: (next: DashboardSection) => void;
}) {
  const setActive = onActiveChange;
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredSuggestions = queryTokens.length
    ? searchSuggestions
        .map((entry) => {
          const labelText = entry.label.toLowerCase();
          const sectionText =
            navItems
              .find((item) => item.id === entry.section)
              ?.label.toLowerCase() ?? "";
          const score = queryTokens.reduce((total, token) => {
            if (labelText === token) {
              return total + 10;
            }
            if (labelText.startsWith(token)) {
              return total + 8;
            }
            if (labelText.includes(token)) {
              return total + 6;
            }
            if (sectionText.includes(token)) {
              return total + 4;
            }
            if (entry.searchText.includes(token)) {
              return total + 2;
            }
            return total;
          }, 0);

          return { ...entry, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    : [];

  const handleSearchSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!normalizedQuery) {
      return;
    }

    const match = filteredSuggestions[0];

    if (match) {
      setActive(match.section);
      setIsSearchOpen(false);
      return;
    }

    toast.info("No matching section found", {
      description:
        "Try keywords like persona, competitor, launch, Amazon, Temu, or heatmap.",
    });
  };

  const handleSearchSelect = (section: DashboardSection, label: string) => {
    setSearchQuery(label);
    setActive(section);
    setIsSearchOpen(false);
  };

  return (
    <section
      className={cn(
        "flex h-full min-h-0 overflow-hidden bg-background text-foreground",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex w-full max-w-md items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <form className="relative w-full" onSubmit={handleSearchSubmit}>
              <Input
                className="h-9 border-border bg-muted/40 pr-10"
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setIsSearchOpen(false), 120);
                }}
                placeholder="Search insights..."
                value={searchQuery}
              />
              <Button
                aria-label="Search"
                className="-translate-y-1/2 absolute top-1/2 right-1"
                size="icon"
                type="submit"
                variant="ghost"
              >
                <Search className="size-4" />
              </Button>
              {isSearchOpen && normalizedQuery ? (
                <div
                  className="absolute top-full z-30 mt-2 w-full rounded-lg border bg-popover p-1 text-sm shadow-lg"
                  onMouseDown={(event) => event.preventDefault()}
                  role="listbox"
                >
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.slice(0, 6).map((entry) => (
                      <button
                        className="flex w-full min-w-0 items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted"
                        key={`${entry.source}-${entry.section}-${entry.label}`}
                        onClick={() =>
                          handleSearchSelect(entry.section, entry.label)
                        }
                        type="button"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-muted-foreground">
                            {
                              navItems.find(
                                (item) => item.id === entry.section
                              )?.label
                            }
                            {" > "}
                          </span>
                          <span>{entry.label}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No matches yet.
                    </div>
                  )}
                </div>
              ) : null}
            </form>
          </div>

        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-w-0 w-full px-3 py-3 sm:px-4 lg:px-4 xl:px-5">
            <div className="mb-4 flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  Analysis <ChevronRight className="size-3" />
                  <span className="font-medium text-foreground">
                    {navItems.find((item) => item.id === active)?.label}
                  </span>
                </p>
                <h2 className="break-words text-2xl font-semibold tracking-tight">
                  {getSectionTitle(active)}
                </h2>
                <p className="mt-1.5 max-w-3xl break-words text-sm text-muted-foreground">
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
