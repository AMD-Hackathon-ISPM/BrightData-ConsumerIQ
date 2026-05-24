import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pipelineSteps } from "../../constants";
import { HealthRow, Panel } from "../dashboard-primitives";

export function DataSettings() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel title="Network Health">
          <div className="grid gap-3 text-sm">
            <HealthRow label="Bright Data" value="99.9% Uptime" />
            <HealthRow label="Amazon Connect" value="12ms" />
            <HealthRow label="Temu Stream" value="18ms" />
          </div>
          <Button className="mt-4" variant="ghost">
            View incident history
            <ArrowRight className="size-4" />
          </Button>
        </Panel>

        <Panel title="Pipeline Architecture" subtitle="v4.2.0-stable">
          <div className="grid gap-3 md:grid-cols-5">
            {pipelineSteps.map(({ caption, icon: Icon, label }) => {
              return (
                <div className="text-center" key={label}>
                  <div className="mx-auto grid size-10 place-items-center rounded-lg border bg-card">
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{caption}</p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <ToastDebugPanel />

      <Panel title="Bright Data Integrations">
        <div className="overflow-hidden rounded-lg border">
          {[
            [
              "SERP API",
              "Google/Bing organic ranks",
              "Active",
              "2 mins ago",
              "42.5k req",
              "120ms",
            ],
            [
              "Web Scraper API",
              "Amazon storefronts",
              "Active",
              "15 mins ago",
              "1.2M req",
              "850ms",
            ],
            [
              "Scraper Studio",
              "Custom Temu parser",
              "Throttled",
              "1 hr ago",
              "850k req",
              "2.4s",
            ],
            [
              "Web Unlocker",
              "Bypass anti-bot systems",
              "Active",
              "Real-time",
              "500k req",
              "45ms",
            ],
          ].map((row) => (
            <div
              className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.7fr] items-center border-b px-5 py-4 text-sm last:border-b-0"
              key={row[0]}
            >
              <div>
                <p className="font-semibold">{row[0]}</p>
                <p className="text-xs text-muted-foreground">{row[1]}</p>
              </div>
              <span
                className={cn(
                  "w-fit rounded border px-2 py-1 text-xs",
                  row[2] === "Active"
                    ? "border-chart-4/40 text-chart-4"
                    : "border-chart-3/40 text-chart-3",
                )}
              >
                {row[2]}
              </span>
              <p>{row[3]}</p>
              <p>{row[4]}</p>
              <p className={row[5] === "2.4s" ? "text-destructive" : ""}>
                {row[5]}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ToastDebugPanel() {
  const fireDefault = () => toast("Default notification message");
  const fireSuccess = () =>
    toast.success("Data sync completed successfully");
  const fireInfo = () => toast.info("Fresh insights are available");
  const fireWarning = () =>
    toast.warning("Rate limit approaching for SERP API");
  const fireError = () => toast.error("Failed to refresh dataset");
  const fireLoading = () => {
    const id = toast.loading("Crunching numbers…");
    setTimeout(() => toast.success("Done", { id }), 1800);
  };
  const fireDescription = () =>
    toast.success("Persona snapshot saved", {
      description: "All 3 personas were exported to the shared workspace.",
    });
  const fireAction = () =>
    toast("New release deployed", {
      action: {
        label: "View",
        onClick: () => toast.info("Pretend we navigated to the release"),
      },
    });

  return (
    <Panel
      title="Toast Debug"
      subtitle="Trigger each Sonner variant to inspect styling"
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={fireDefault}>
          Default
        </Button>
        <Button variant="outline" size="sm" onClick={fireSuccess}>
          Success
        </Button>
        <Button variant="outline" size="sm" onClick={fireInfo}>
          Info
        </Button>
        <Button variant="outline" size="sm" onClick={fireWarning}>
          Warning
        </Button>
        <Button variant="outline" size="sm" onClick={fireError}>
          Error
        </Button>
        <Button variant="outline" size="sm" onClick={fireLoading}>
          Loading → Success
        </Button>
        <Button variant="outline" size="sm" onClick={fireDescription}>
          With description
        </Button>
        <Button variant="outline" size="sm" onClick={fireAction}>
          With action
        </Button>
      </div>
    </Panel>
  );
}
