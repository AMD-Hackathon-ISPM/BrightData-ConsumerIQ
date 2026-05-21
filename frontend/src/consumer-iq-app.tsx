import { useCallback, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ConsumerIQDashboard } from "@/features/dashboard";
import { FounderChat } from "@/features/founder-chat";
import { ConsumerIQOnboarding } from "@/features/onboarding";
import { useMediaQuery } from "@/hooks/use-media-query";

const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";

export function ConsumerIQExperience() {
  const [isOnboarded, setIsOnboarded] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(CONSUMER_IQ_ONBOARDED_KEY) === "true";
  });
  const chatPanelRef = useRef<PanelImperativeHandle>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const isTabletUp = useMediaQuery("(min-width: 768px)");

  const handleOnboardingComplete = useCallback(() => {
    window.localStorage.setItem(CONSUMER_IQ_ONBOARDED_KEY, "true");
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

  if (!isTabletUp) {
    return (
      <main className="h-screen overflow-hidden bg-background text-foreground">
        <ResizablePanelGroup
          className="h-screen min-h-0"
          orientation="vertical"
        >
          <ResizablePanel className="min-h-0" defaultSize="62%" minSize="45%">
            <ConsumerIQDashboard
              className="h-full"
              onToggleChat={handleToggleChat}
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
            <FounderChat
              className="border-t border-l-0"
              isOpen={isChatOpen}
              onToggle={handleToggleChat}
              panelClassName="border-l-0 border-t"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    );
  }

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <ResizablePanelGroup
        className="h-screen min-h-0"
        orientation="horizontal"
      >
        <ResizablePanel className="min-w-0" defaultSize="68%" minSize="46%">
          <ConsumerIQDashboard
            className="h-screen"
            onToggleChat={handleToggleChat}
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
          <FounderChat isOpen={isChatOpen} onToggle={handleToggleChat} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </main>
  );
}
