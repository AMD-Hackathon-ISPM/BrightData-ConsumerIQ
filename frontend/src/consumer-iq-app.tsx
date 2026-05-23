import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
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
  const chatPanelRef = useRef<PanelImperativeHandle>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
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
    if (isChatOpen) {
      chatPanelRef.current?.collapse();
      setIsChatOpen(false);
      return;
    }

    chatPanelRef.current?.expand();
    setIsChatOpen(true);
  }, [isChatOpen]);

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
      <ResizableHandle withHandle />
      <ResizablePanel
        className="min-w-0"
        collapsedSize="4%"
        collapsible
        defaultSize="32%"
        maxSize="42%"
        minSize="26%"
        onResize={(panelSize) => {
          setIsChatOpen(panelSize.asPercentage > 6);
        }}
        panelRef={chatPanelRef}
      >
        <Suspense fallback={<div className="h-full bg-background" />}>
          <FounderChat isOpen={isChatOpen} onToggle={handleToggleChat} />
        </Suspense>
      </ResizablePanel>
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
      <ResizableHandle withHandle />
      <ResizablePanel
        className="min-h-0"
        collapsedSize="8%"
        collapsible
        defaultSize="38%"
        maxSize="55%"
        minSize="25%"
        onResize={(panelSize) => {
          setIsChatOpen(panelSize.asPercentage > 10);
        }}
        panelRef={chatPanelRef}
      >
        <Suspense fallback={<div className="h-full bg-background" />}>
          <FounderChat
            className="border-t border-l-0"
            isOpen={isChatOpen}
            onToggle={handleToggleChat}
            panelClassName="border-l-0 border-t"
          />
        </Suspense>
      </ResizablePanel>
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
        <span className="text-sm font-semibold tracking-tight text-foreground">
          ConsumerIQ
        </span>
      }
    >
      {panels}
    </AppShell>
  );
}
