import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { AppShell } from "@/components/layouts/AppShell";
import { DashboardAppSidebar } from "@/components/layouts/DashboardAppSidebar";
import { ConsumerIQDashboard } from "@/features/dashboard";
import type { DashboardSection } from "@/features/dashboard/constants";
import { ConsumerIQOnboarding } from "@/features/onboarding";
import { useMediaQuery } from "@/hooks/use-media-query";

const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";
const FounderChat = lazy(() =>
  import("@/features/founder-chat").then((module) => ({
    default: module.FounderChat,
  }))
);

export function ConsumerIQExperience() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<DashboardSection>("dashboard");
  const isTabletUp = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    window.localStorage.removeItem(CONSUMER_IQ_ONBOARDED_KEY);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setIsOnboarded(true);
  }, []);

  const handleToggleChat = useCallback(() => {
    setIsChatOpen((open) => !open);
  }, []);

  if (!isOnboarded) {
    return <ConsumerIQOnboarding onComplete={handleOnboardingComplete} />;
  }

  const panels = isTabletUp ? (
    <ResizablePanelGroup
      className="h-full min-h-0"
      orientation="horizontal"
    >
      <ResizablePanel className="min-w-0" defaultSize="68%" minSize="46%">
        <ConsumerIQDashboard
          className="h-full"
          active={activeSection}
          onActiveChange={setActiveSection}
        />
      </ResizablePanel>
      {isChatOpen ? (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="min-w-0"
            defaultSize="32%"
            maxSize="42%"
            minSize="26%"
          >
            <Suspense
              fallback={<div className="h-full bg-background-default" />}
            >
              <FounderChat isOpen onToggle={handleToggleChat} />
            </Suspense>
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  ) : (
    <ResizablePanelGroup
      className="h-full min-h-0"
      orientation="vertical"
    >
      <ResizablePanel className="min-h-0" defaultSize="62%" minSize="45%">
        <ConsumerIQDashboard
          className="h-full"
          active={activeSection}
          onActiveChange={setActiveSection}
        />
      </ResizablePanel>
      {isChatOpen ? (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="min-h-0"
            defaultSize="38%"
            maxSize="55%"
            minSize="25%"
          >
            <Suspense
              fallback={<div className="h-full bg-background-default" />}
            >
              <FounderChat
                className="border-t border-l-0"
                isOpen
                onToggle={handleToggleChat}
                panelClassName="border-l-0 border-t"
              />
            </Suspense>
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  );

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
      {panels}
    </AppShell>
  );
}
