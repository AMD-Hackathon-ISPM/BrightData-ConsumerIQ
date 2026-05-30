import { IconRobot } from "@tabler/icons-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { DashboardAppSidebar } from "@/components/layouts/DashboardAppSidebar";
import { Button } from "@/components/ui/button";
import { ConsumerIQDashboard } from "@/features/dashboard/dashboard-feature";
import type { DashboardSection } from "@/features/dashboard/constants";
import { useFounderPipelineStore } from "@/features/onboarding/founder-form/session-store";
import { ConsumerIQOnboarding } from "@/features/onboarding/onboarding-feature";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";
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
  const [isOnboarded, setIsOnboarded] = useState(() => {
    try {
      return (
        user?.email != null &&
        window.localStorage.getItem(CONSUMER_IQ_ONBOARDED_KEY) === user.email
      );
    } catch {
      return false;
    }
  });
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
    setIsOnboarded(true);
  }, [clearPipelineSession, persistOnboarded]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((open) => {
      if (!open) {
        setHasOpenedChat(true);
      }
      return !open;
    });
  }, []);

  if (!isOnboarded) {
    return <ConsumerIQOnboarding onComplete={handleOnboardingComplete} />;
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
