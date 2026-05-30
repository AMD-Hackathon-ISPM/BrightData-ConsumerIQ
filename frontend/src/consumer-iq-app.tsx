import { IconRobot } from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { DashboardAppSidebar } from "@/components/layouts/DashboardAppSidebar";
import { Button } from "@/components/ui/button";
import type { InsightsResponse } from "@/features/dashboard/api";
import { ConsumerIQDashboard } from "@/features/dashboard/dashboard-feature";
import type { DashboardSection } from "@/features/dashboard/constants";
import { GeneratingStep } from "@/features/onboarding/founder-form";
import {
  fetchFounderForm,
  mapFounderFormPayload,
  PERSONA_TASK_KEY,
  startPersonaDecode,
} from "@/features/onboarding/founder-form/api";
import { useFounderPipelineStore } from "@/features/onboarding/founder-form/session-store";
import type { FounderFormState } from "@/features/onboarding/founder-form/types";
import { ConsumerIQOnboarding } from "@/features/onboarding/onboarding-feature";
import { getAuthToken, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";
const PERSONA_DATA_KEY = "ciq_persona_data";
type ExperiencePhase = "loading" | "onboarding" | "processing" | "failed" | "dashboard";

async function fetchCurrentInsightsGate(): Promise<
  InsightsResponse | "not-found" | null
> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const response = await fetch("/api/insights/me", { headers });
    if (response.status === 404) return "not-found";
    if (!response.ok) return null;
    return response.json() as Promise<InsightsResponse>;
  } catch {
    return null;
  }
}

async function ensurePersonaDecodeForCompletedForm(formId: string) {
  try {
    if (
      window.localStorage.getItem(PERSONA_DATA_KEY) ||
      window.localStorage.getItem(PERSONA_TASK_KEY)
    ) {
      return;
    }
  } catch {
    return;
  }

  try {
    const form = await fetchFounderForm(formId);
    const formState = mapFounderFormPayload(form.payload);
    const { taskId } = await startPersonaDecode(formState);
    window.localStorage.setItem(PERSONA_TASK_KEY, taskId);
  } catch {}
}

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-background-default text-sm text-foreground-light">
      Loading your workspace...
    </main>
  );
}

function FailedRunView({ onStartOver }: { onStartOver: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background-default px-6 text-foreground-default">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <p className="text-sm text-foreground-light">
          Dashboard generation failed.
        </p>
        <Button onClick={onStartOver} type="button">
          Start over
        </Button>
      </div>
    </main>
  );
}

function ResumeProcessingView({
  formId,
  onComplete,
}: {
  formId: string;
  onComplete: () => void;
}) {
  const [formState, setFormState] = useState<FounderFormState | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFormState(null);
    setLoadFailed(false);
    fetchFounderForm(formId)
      .then((form) => {
        if (cancelled) return;
        setFormState(mapFounderFormPayload(form.payload));
      })
      .catch(() => {
        if (cancelled) return;
        setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (!formState) {
    return (
      <main className="grid min-h-screen place-items-center bg-background-default text-sm text-foreground-light">
        {loadFailed
          ? "Unable to restore this processing session."
          : "Restoring your dashboard generation..."}
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-background-default text-foreground-default">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <GeneratingStep
          onComplete={onComplete}
          submitStatus="success"
          formId={formId}
          formState={formState}
          region={formState.region}
          industry={formState.industry}
        />
      </div>
    </main>
  );
}

const FounderChat = lazy(() =>
  import("@/features/founder-chat/founder-chat-feature").then((module) => ({
    default: module.FounderChat,
  }))
);

export function ConsumerIQExperience() {
  const { user } = useAuth();
  const clearPipelineSession = useFounderPipelineStore(
    (state) => state.clearSession
  );
  const resetPipeline = useFounderPipelineStore((state) => state.resetAll);
  const activeSessionFormId = useFounderPipelineStore(
    (state) => state.activeSession?.formId ?? null
  );
  const [phase, setPhase] = useState<ExperiencePhase>("loading");
  const [gateResult, setGateResult] = useState<InsightsResponse | null>(null);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("dashboard");

  const persistOnboarded = useCallback(() => {
    try {
      if (user?.email) {
        window.localStorage.setItem(CONSUMER_IQ_ONBOARDED_KEY, user.email);
      }
    } catch {}
  }, [user?.email]);

  const handleOnboardingComplete = useCallback(() => {
    persistOnboarded();
    clearPipelineSession();
    setForceOnboarding(false);
    setPhase("dashboard");
  }, [clearPipelineSession, persistOnboarded]);

  const handleStartOver = useCallback(() => {
    resetPipeline();
    try {
      window.localStorage.removeItem(CONSUMER_IQ_ONBOARDED_KEY);
    } catch {}
    setForceOnboarding(true);
    setGateResult(null);
    setPhase("onboarding");
  }, [resetPipeline]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((open) => {
      if (!open) {
        setHasOpenedChat(true);
      }
      return !open;
    });
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    setPhase("loading");
    setGateResult(null);

    fetchCurrentInsightsGate().then((result) => {
      if (cancelled) return;
      if (result === "not-found" || result === null) {
        setPhase("onboarding");
        return;
      }

      setGateResult(result);
      if (forceOnboarding && result.status === "failed") {
        setPhase("onboarding");
        return;
      }
      if (result.status === "processing") {
        setPhase("processing");
        return;
      }
      if (result.status === "failed") {
        setPhase("failed");
        return;
      }
      if (result.status === "completed") {
        persistOnboarded();
        setPhase("dashboard");
        if (result.formId) {
          void ensurePersonaDecodeForCompletedForm(result.formId);
        }
        return;
      }

      setPhase("onboarding");
    });

    return () => {
      cancelled = true;
    };
  }, [forceOnboarding, persistOnboarded, user?.email]);

  useEffect(() => {
    if (!forceOnboarding || !activeSessionFormId) return;
    setForceOnboarding(false);
    setGateResult({
      status: "processing",
      formId: activeSessionFormId,
      category: "",
      country: "",
    });
    setPhase("processing");
  }, [activeSessionFormId, forceOnboarding]);

  if (phase === "loading") {
    return <LoadingState />;
  }

  if (phase === "onboarding") {
    return <ConsumerIQOnboarding onComplete={handleOnboardingComplete} />;
  }

  if (phase === "processing") {
    return gateResult?.formId ? (
      <ResumeProcessingView
        formId={gateResult.formId}
        onComplete={handleOnboardingComplete}
      />
    ) : (
      <LoadingState />
    );
  }

  if (phase === "failed") {
    return <FailedRunView onStartOver={handleStartOver} />;
  }

  return (
    <AppShell
      sidebar={
        <DashboardAppSidebar
          active={activeSection}
          onActiveChange={setActiveSection}
          onToggleChat={handleToggleChat}
        />
      }
      brand={
        <span className="text-sm font-semibold tracking-tight text-foreground-default">
          ConsumerIQ
        </span>
      }
    >
      <div className="relative h-full min-h-0 overflow-hidden">
        <ConsumerIQDashboard
          className="h-full"
          active={activeSection}
          onActiveChange={setActiveSection}
        />
        <Button
          aria-hidden={isChatOpen}
          aria-label="Open Advisor Bot"
          className={cn(
            "absolute right-5 bottom-5 z-20 rounded-lg border-border-strong bg-background-200/70 text-foreground-light shadow-lg backdrop-blur-md transition-[opacity,background-color,border-color,color] duration-200 ease-out hover:border-border-stronger hover:bg-background-200 hover:text-foreground-default md:top-[4.25px] md:right-[4.25px] md:bottom-auto",
            isChatOpen && "pointer-events-none opacity-0"
          )}
          onClick={handleToggleChat}
          size="icon"
          tabIndex={isChatOpen ? -1 : 0}
          type="button"
          variant="ghost"
        >
          <IconRobot stroke={1.8} />
        </Button>
        {isChatOpen ? (
          <button
            aria-label="Close Advisor Bot"
            className="absolute inset-0 z-20 cursor-default"
            onClick={handleToggleChat}
            tabIndex={-1}
            type="button"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-full justify-end">
          <div
            className="chat-slide-panel pointer-events-auto h-full w-full min-w-0 sm:w-[420px] lg:w-[460px]"
            data-state={isChatOpen ? "open" : "closed"}
          >
            {hasOpenedChat ? (
              <Suspense
                fallback={<div className="h-full bg-background-default" />}
              >
                <FounderChat
                  className="h-full"
                  isOpen
                  onToggle={handleToggleChat}
                  panelClassName="shadow-2xl"
                />
              </Suspense>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
