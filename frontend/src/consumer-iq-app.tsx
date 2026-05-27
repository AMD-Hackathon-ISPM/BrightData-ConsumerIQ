import { lazy, Suspense, useCallback, useState } from "react";
import { AppShell } from "@/components/layouts/AppShell";
import { DashboardAppSidebar } from "@/components/layouts/DashboardAppSidebar";
import { ConsumerIQDashboard } from "@/features/dashboard/dashboard-feature";
import type { DashboardSection } from "@/features/dashboard/constants";
import { ConsumerIQOnboarding } from "@/features/onboarding/onboarding-feature";
import { useAuth } from "@/lib/auth";

const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";
const FounderChat = lazy(() =>
  import("@/features/founder-chat/founder-chat-feature").then((module) => ({
    default: module.FounderChat,
  }))
);

export function ConsumerIQExperience() {
  const { user } = useAuth();
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
    setIsOnboarded(true);
  }, [persistOnboarded]);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((open) => !open);
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
        {isChatOpen ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-30 flex w-full justify-end">
            <div className="pointer-events-auto h-full w-full min-w-0 sm:w-[420px] lg:w-[460px]">
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
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
