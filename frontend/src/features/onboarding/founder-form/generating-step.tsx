import { useEffect, useMemo, useRef, useState } from "react";
import { SpiralLoader } from "@/components/ui/spiral-loader";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { startPersonaDecode, PERSONA_TASK_KEY } from "./api";
import { getAuthToken } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { FounderFormState } from "./types";

type PipelineStatus = {
  scraping: { status: string; signalsStored: number };
  inference: { status: string; stage?: InferenceStage };
};

type InferenceStage =
  | "pending"
  | "analyzing"
  | "cross_referencing"
  | "synthesizing"
  | "completed"
  | "failed";

async function fetchPipelineStatus(
  formId: string,
): Promise<PipelineStatus | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const res = await fetch(`/api/form-pipeline/${formId}`, { headers });
    if (!res.ok) return null;
    return res.json() as Promise<PipelineStatus>;
  } catch {
    return null;
  }
}

function pipelineTarget(p: PipelineStatus | null): number {
  if (!p) return 1;
  const scrape = p.scraping.status;
  const inference = p.inference.status;
  const stage = p.inference.stage ?? "pending";
  if (stage === "completed" && inference === "completed") return 8;
  if (stage === "failed" || inference === "failed") return 8;
  if (stage === "synthesizing") return 7;
  if (stage === "cross_referencing") return 6;
  if (stage === "analyzing") return 5;
  if (scrape === "completed" || scrape === "skipped" || scrape === "failed")
    return 4;
  if (scrape === "processing") return 3;
  return 1;
}

type GeneratingStepProps = {
  onComplete: () => void;
  onLeave?: () => void;
  submitStatus: "idle" | "submitting" | "success" | "error";
  formId: string | null;
  formState: FounderFormState;
  region?: string;
  industry?: string;
};

export function GeneratingStep({
  onComplete,
  onLeave,
  submitStatus,
  formId,
  formState,
  region,
  industry,
}: GeneratingStepProps) {
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [revealed, setRevealed] = useState(0);
  const personaStarted = useRef(false);

  const signalsStored = pipeline?.scraping.signalsStored ?? 0;

  const lines = useMemo(() => {
    const scopeLabel = industry?.toLowerCase() ?? "category";
    const firstLine =
      region && industry
        ? `Scanning ${region} marketplaces for ${scopeLabel} listings…`
        : "Scanning marketplace listings…";
    const signalsLine =
      signalsStored > 0
        ? `${signalsStored.toLocaleString()} market signals collected`
        : "Gathering market signals…";
    return [
      "Processing founder form inputs…",
      "Structuring product and audience context…",
      firstLine,
      signalsLine,
      "Reading verified-purchase reviews and demand cues…",
      "Generating launch insight hypotheses…",
      "Synthesizing dashboard, whitespace map, and readiness signals…",
      "Assembling your notebook…",
    ];
  }, [region, industry, signalsStored]);

  useEffect(() => {
    if (!formId || submitStatus !== "success") return;
    let cancelled = false;
    const poll = async () => {
      let intervalMs = 3000;
      while (!cancelled) {
        const status = await fetchPipelineStatus(formId);
        if (!cancelled) setPipeline(status);
        if (status && pipelineTarget(status) >= lines.length) break;
        await new Promise<void>((r) => setTimeout(r, intervalMs));
        intervalMs = Math.min(intervalMs + 1000, 10000);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [formId, submitStatus, lines.length]);

  const isMockRun =
    import.meta.env.DEV && submitStatus === "success" && !formId;
  const target = isMockRun ? lines.length : pipelineTarget(pipeline);
  const stageReachedCompletion =
    pipeline?.inference.stage === "completed" &&
    pipeline?.inference.status === "completed";

  useEffect(() => {
    if (submitStatus !== "success") return;
    if (revealed >= target) return;
    const revealDelay = isMockRun
      ? revealed === 0
        ? 900
        : 1300
      : revealed === 0
        ? 600
        : 900;
    const id = window.setTimeout(() => setRevealed((r) => r + 1), revealDelay);
    return () => window.clearTimeout(id);
  }, [isMockRun, revealed, target, submitStatus]);

  useEffect(() => {
    if (submitStatus !== "success" || personaStarted.current) return;
    try {
      if (localStorage.getItem(PERSONA_TASK_KEY)) {
        personaStarted.current = true;
        return;
      }
    } catch {}
    personaStarted.current = true;
    try {
      localStorage.removeItem("ciq_persona_data");
    } catch {}
    startPersonaDecode(formState)
      .then(({ taskId }) => {
        try {
          localStorage.setItem(PERSONA_TASK_KEY, taskId);
        } catch {}
      })
      .catch(() => {});
  }, [submitStatus, formState]);

  const inferenceFailed =
    pipeline?.inference.stage === "failed" ||
    pipeline?.inference.status === "failed";
  const mockComplete = isMockRun && revealed >= lines.length;
  const isComplete = stageReachedCompletion || mockComplete;
  const canContinue = isComplete && revealed >= lines.length;

  const currentStatus = lines[Math.max(0, revealed - 1)] ?? lines[0];
  const statusText =
    submitStatus === "submitting"
      ? "Submitting your founder form…"
      : submitStatus === "error"
        ? "Submission failed. Please refresh and try again."
        : inferenceFailed
          ? "Pipeline failed before dashboard data was ready. Please refresh and resubmit."
        : isComplete
          ? "Dashboard insights are ready. Click the spiral to continue."
          : currentStatus;

  const handleSpiralActivate = () => {
    if (!canContinue) return;
    onComplete();
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center">
      <button
        type="button"
        aria-label={canContinue ? "Open dashboard" : "Loading"}
        aria-disabled={!canContinue}
        disabled={!canContinue}
        onClick={handleSpiralActivate}
        className={cn(
          "group grid size-80 place-items-center rounded-full outline-none transition-transform duration-500 ease-out",
          "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:ring-offset-background-default",
          canContinue
            ? "cursor-pointer hover:scale-[1.03] active:scale-[0.99]"
            : "cursor-default",
        )}
      >
        <SpiralLoader
          className={cn(
            "size-80 text-foreground-default transition-[filter,opacity] duration-500",
            canContinue
              ? "opacity-100 group-hover:[filter:drop-shadow(0_0_24px_rgba(152,151,26,0.45))]"
              : "opacity-100",
          )}
          innerColor={isComplete ? "#98971a" : "#cc241d"}
        />
      </button>

      <div className="mt-8 flex min-h-12 items-center justify-center text-center">
        {canContinue ? (
          <p className="animate-pulse text-sm tracking-tight text-foreground-light">
            {statusText}
          </p>
        ) : submitStatus === "success" ? (
          <Shimmer
            as="p"
            className="text-sm tracking-tight text-foreground-light"
            duration={2.5}
          >
            {statusText}
          </Shimmer>
        ) : (
          <p className="text-sm tracking-tight text-foreground-light">
            {statusText}
          </p>
        )}
      </div>

      {submitStatus === "success" && formId && !canContinue ? (
        <Button
          className="mt-6"
          onClick={onLeave}
          type="button"
          variant="ghost"
        >
          Email me when ready
        </Button>
      ) : null}
    </div>
  );
}
