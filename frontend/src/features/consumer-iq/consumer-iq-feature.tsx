import { nanoid } from "nanoid";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  Lock,
  Menu,
  MessageSquare,
  PackageX,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { toast } from "sonner";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChatComposer } from "@/features/llm-chat/components/chat-composer";
import { ChatConversation } from "@/features/llm-chat/components/chat-conversation";
import { ChatPanel } from "@/features/llm-chat/components/chat-panel";
import { SuggestionList } from "@/features/llm-chat/components/suggestion-list";
import {
  initialMessages,
  suggestions,
} from "@/features/llm-chat/data/chat-content";
import {
  buildMockResponse,
  delay,
} from "@/features/llm-chat/lib/mock-streaming";
import type { ChatStatus, MessageType } from "@/features/llm-chat/types";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

const STREAM_FRAME_MS = 16;
const STREAM_CHARS_PER_FRAME = 8;
const LONG_TEXT_CHAR_LIMIT = 500;
const CONSUMER_IQ_ONBOARDED_KEY = "consumeriq:onboarded";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "pulse", label: "Demand Pulse", icon: TrendingUp },
  { id: "persona", label: "Persona Decode", icon: Users },
  { id: "competitor", label: "Competitor Mirror", icon: Target },
  { id: "compass", label: "Launch Compass", icon: Compass },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const pipelineSteps = [
  { label: "Marketplaces", icon: Globe2, caption: "External Source" },
  { label: "Web Unlocker", icon: ShieldCheck, caption: "Anti Bot Bypass" },
  { label: "Parsers", icon: FileText, caption: "Schema Mapping" },
  { label: "Data Lake", icon: Database, caption: "Caches & Diffs" },
  { label: "Frontend", icon: BarChart3, caption: "Presentation" },
] as const;

type DashboardSection = (typeof navItems)[number]["id"];

function truncateToCharLimit(value: string, limit: number) {
  if (value.length <= limit) {
    return { count: value.length, truncated: false, value };
  }

  return {
    count: limit,
    truncated: true,
    value: value.slice(0, limit),
  };
}

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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function AnimatedPage({
  children,
  className,
  transitionKey,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);

    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsVisible(true));
    });

    return () => window.cancelAnimationFrame(firstFrame);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "will-change-transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isVisible
          ? "translate-y-0 scale-100 opacity-100 blur-0"
          : "translate-y-4 scale-[0.985] opacity-0 blur-[1px]",
        className
      )}
      key={transitionKey}
    >
      {children}
    </div>
  );
}

function SectionFade({
  children,
  className,
  transitionKey,
}: {
  children: ReactNode;
  className?: string;
  transitionKey: string | number;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);

    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        className
      )}
      key={transitionKey}
    >
      {children}
    </div>
  );
}

export function ConsumerIQOnboarding({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState(1);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <AnimatedPage
          className="flex w-full justify-center"
          transitionKey={step}
        >
          {step === 1 ? (
            <BusinessSetupStep onNext={() => setStep(2)} />
          ) : step === 2 ? (
            <ProductContextStep
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          ) : step === 3 ? (
            <ResearchGoalsStep
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          ) : (
            <GeneratingStep onComplete={onComplete} />
          )}
        </AnimatedPage>
      </div>
    </main>
  );
}

export function ConsumerIQDashboard({
  className,
  onToggleChat,
}: {
  className?: string;
  onToggleChat?: () => void;
}) {
  const [active, setActive] = useState<DashboardSection>("dashboard");
  const isNavDesktop = useMediaQuery("(min-width: 768px)");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchIndex: Array<{
    section: DashboardSection;
    suggestions: Array<{ label: string; keywords: string[] }>;
  }> = [
    {
      section: "dashboard",
      suggestions: [
        {
          label: "Market Overview",
          keywords: [
            "market overview",
            "overview",
            "dashboard",
            "market intelligence",
            "trend velocity",
            "estimated demand",
            "est demand",
            "price target",
            "market gaps",
          ],
        },
        {
          label: "Marketplace Pulse",
          keywords: [
            "marketplace",
            "marketplace pulse",
            "sku",
            "marketplaces",
            "sku tracking",
            "real-time sku",
          ],
        },
        {
          label: "Demand Density",
          keywords: [
            "demand density",
            "geography",
            "regional interest",
            "regional distribution",
            "geo distribution",
          ],
        },
      ],
    },
    {
      section: "pulse",
      suggestions: [
        {
          label: "Trend Velocity Index",
          keywords: [
            "demand",
            "trend",
            "velocity",
            "trend velocity",
            "trend velocity index",
            "pulse",
          ],
        },
        {
          label: "Top Rising Formats",
          keywords: ["rising", "formats", "top rising", "trend formats"],
        },
        {
          label: "Marketplace Share",
          keywords: [
            "marketplace",
            "marketplace share",
            "share",
            "platform mix",
            "platform share",
          ],
        },
        {
          label: "Search Intent Analysis",
          keywords: [
            "serp",
            "search signal",
            "intent",
            "search intent",
            "intent analysis",
          ],
        },
      ],
    },
    {
      section: "persona",
      suggestions: [
        {
          label: "Persona Decode",
          keywords: ["persona", "customer", "audience", "segment", "profile"],
        },
        {
          label: "Pain Point Clusters",
          keywords: ["pain point", "clusters", "friction"],
        },
        {
          label: "Willingness-to-Pay Range",
          keywords: [
            "willingness-to-pay",
            "wtp",
            "price elasticity",
            "elasticity",
          ],
        },
        {
          label: "Demographic Mix",
          keywords: [
            "demographic mix",
            "demographics",
            "age median",
            "primary region",
          ],
        },
      ],
    },
    {
      section: "competitor",
      suggestions: [
        {
          label: "Competitor Mirror",
          keywords: ["competitor", "benchmark", "mirror", "matrix"],
        },
        {
          label: "Price Alerts",
          keywords: ["price", "price alert", "alert", "pricing"],
        },
        {
          label: "Search Share of Voice (SOV)",
          keywords: ["sov", "share of voice", "search share of voice"],
        },
        {
          label: "Competitor Matrix",
          keywords: ["competitor matrix", "matrix", "benchmark grid"],
        },
      ],
    },
    {
      section: "compass",
      suggestions: [
        {
          label: "Launch Compass",
          keywords: [
            "launch",
            "positioning",
            "product-market fit",
            "pmf",
            "expansion",
          ],
        },
        {
          label: "Pricing Strategy",
          keywords: ["pricing", "price strategy", "strategy"],
        },
        {
          label: "Channel Rollout Sequence",
          keywords: ["channel rollout", "rollout sequence", "cac", "sequence"],
        },
        {
          label: "Strategic Moat Analysis",
          keywords: ["moat analysis", "strategic moat", "moat"],
        },
        {
          label: "Intelligence Feed",
          keywords: ["intelligence feed", "signals", "market signals"],
        },
      ],
    },
    {
      section: "settings",
      suggestions: [
        {
          label: "Data Settings",
          keywords: ["settings", "data", "api", "integration", "preferences"],
        },
        {
          label: "Network Health",
          keywords: ["network health", "uptime", "incident history"],
        },
        {
          label: "Pipeline Architecture",
          keywords: ["pipeline architecture", "architecture", "pipeline"],
        },
        {
          label: "Bright Data Integrations",
          keywords: ["bright data", "integration", "connector", "sources"],
        },
      ],
    },
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchSuggestions = searchIndex.flatMap((entry) =>
    entry.suggestions.map((suggestion) => ({
      section: entry.section,
      label: suggestion.label,
      keywords: suggestion.keywords,
    }))
  );
  const filteredSuggestions = normalizedQuery
    ? searchSuggestions.filter(
        (entry) =>
          entry.keywords.some((keyword) =>
            keyword.toLowerCase().includes(normalizedQuery)
          ) || entry.label.toLowerCase().includes(normalizedQuery)
      )
    : [];

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!normalizedQuery) {
      return;
    }

    const match = searchSuggestions.find(
      (entry) =>
        entry.keywords.some((keyword) =>
          normalizedQuery.includes(keyword.toLowerCase())
        ) || entry.label.toLowerCase().includes(normalizedQuery)
    );

    if (match) {
      setActive(match.section);
      setIsSearchOpen(false);
      return;
    }

    toast.info("No matching section found", {
      description: "Try keywords like “persona”, “competitor”, or “launch”.",
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
      {isNavDesktop ? (
        <aside className="flex h-full w-56 shrink-0 flex-col border-r bg-sidebar px-4 py-5 text-sidebar-foreground">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">ConsumerIQ</h1>
            <p className="mt-0.5 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Market Intelligence
            </p>
          </div>

          <nav className="mt-8 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;

              return (
                <button
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors duration-200 ease-out",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t pt-6">
            <Button
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={onToggleChat}
              type="button"
            >
              <MessageSquare className="size-4" />
              Founder Chat
            </Button>
          </div>
        </aside>
      ) : (
        <MobileSidebarNav
          active={active}
          isOpen={isMobileNavOpen}
          onChange={setActive}
          onClose={() => setIsMobileNavOpen(false)}
          onToggleChat={onToggleChat}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center justify-between border-b px-4">
          <div className="flex w-full max-w-md items-center gap-3">
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
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted"
                        key={`${entry.section}-${entry.label}`}
                        onClick={() =>
                          handleSearchSelect(entry.section, entry.label)
                        }
                        type="button"
                      >
                        <span>
                          {
                            navItems.find((item) => item.id === entry.section)
                              ?.label
                          }
                          {" > "}
                          {entry.label}
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

          <div className="ml-4 flex items-center gap-3">
            {!isNavDesktop ? (
              <Button
                aria-label="Open navigation"
                onClick={() => setIsMobileNavOpen(true)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Menu className="size-5" />
              </Button>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-3 py-3 sm:px-4 lg:px-4 xl:px-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  Analysis <ChevronRight className="size-3" />
                  <span className="font-medium text-foreground">
                    {navItems.find((item) => item.id === active)?.label}
                  </span>
                </p>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {getSectionTitle(active)}
                </h2>
                <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
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

function FounderChat({
  className,
  isOpen,
  onToggle,
  panelClassName,
}: {
  className?: string;
  isOpen: boolean;
  onToggle: () => void;
  panelClassName?: string;
}) {
  const streamAbortRef = useRef(false);
  const pendingResponseTimeoutRef = useRef<number | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [, setStreamingMessageId] = useState<string | null>(null);

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          if (message.versions.some((version) => version.id === messageId)) {
            return {
              ...message,
              versions: message.versions.map((version) =>
                version.id === messageId
                  ? { ...version, content: newContent }
                  : version
              ),
            };
          }

          return message;
        })
      );
    },
    []
  );

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      streamAbortRef.current = false;
      setStatus("streaming");
      setStreamingMessageId(messageId);

      let currentContent = "";

      for (
        let index = STREAM_CHARS_PER_FRAME;
        index <= content.length + STREAM_CHARS_PER_FRAME;
        index += STREAM_CHARS_PER_FRAME
      ) {
        if (streamAbortRef.current) {
          setStatus("ready");
          setStreamingMessageId(null);
          return;
        }

        currentContent = content.slice(0, index);
        updateMessageContent(messageId, currentContent);
        await delay(STREAM_FRAME_MS);
      }

      setStatus("ready");
      setStreamingMessageId(null);
    },
    [updateMessageContent]
  );

  const addUserMessage = useCallback(
    (content: string) => {
      const prompt = content.trim() || "Sent with attachments";
      const userMessage: MessageType = {
        from: "user",
        key: nanoid(),
        versions: [{ content: prompt, id: nanoid() }],
      };

      streamAbortRef.current = false;
      setMessages((previousMessages) => [...previousMessages, userMessage]);

      pendingResponseTimeoutRef.current = window.setTimeout(() => {
        pendingResponseTimeoutRef.current = null;

        if (streamAbortRef.current) {
          return;
        }

        const assistantMessageId = nanoid();
        const assistantMessage: MessageType = {
          from: "assistant",
          key: nanoid(),
          reasoning: {
            content:
              "I treated the prompt as an insights request, selected the most relevant seeded ConsumerIQ patterns, then prepared a concise response for an analyst workflow.",
            duration: 5,
          },
          versions: [{ content: "", id: assistantMessageId }],
        };

        setMessages((previousMessages) => [
          ...previousMessages,
          assistantMessage,
        ]);
        void streamResponse(assistantMessageId, buildMockResponse(prompt));
      }, 500);
    },
    [streamResponse]
  );

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (status !== "ready") {
        return;
      }

      const prompt = message.text.trim();
      const hasText = Boolean(prompt);
      const hasAttachments = Boolean(message.files.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      setStatus("submitted");

      if (hasAttachments) {
        toast.success("Files attached", {
          description: `${message.files.length} file(s) attached to message`,
        });
      }

      addUserMessage(prompt || "Sent with attachments");
      setText("");
    },
    [addUserMessage, status]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (status !== "ready") {
        return;
      }

      setStatus("submitted");
      addUserMessage(suggestion);
    },
    [addUserMessage, status]
  );

  const handleStop = useCallback(() => {
    streamAbortRef.current = true;

    if (pendingResponseTimeoutRef.current !== null) {
      window.clearTimeout(pendingResponseTimeoutRef.current);
      pendingResponseTimeoutRef.current = null;
    }

    setStatus("ready");
    setStreamingMessageId(null);
    toast.info("Response stopped");
  }, []);

  useEffect(
    () => () => {
      streamAbortRef.current = true;

      if (pendingResponseTimeoutRef.current !== null) {
        window.clearTimeout(pendingResponseTimeoutRef.current);
      }
    },
    []
  );

  return (
    <div className={cn("h-full min-h-0 bg-background", className)}>
      <ChatPanel
        className={cn(
          "!h-full !min-h-0 transition-[width] duration-200 ease-out",
          panelClassName
        )}
        isOpen={isOpen}
        onToggle={onToggle}
      >
        <div className="relative flex size-full min-h-0 flex-col divide-y overflow-hidden">
          <ChatConversation messages={messages} />
          <div className="grid shrink-0 gap-4 pt-4">
            <SuggestionList
              disabled={status !== "ready"}
              onSuggestionClick={handleSuggestionClick}
              suggestions={suggestions}
            />
            <ChatComposer
              onStop={handleStop}
              onSubmit={handleSubmit}
              onTextChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setText(event.target.value)
              }
              status={status}
              text={text}
            />
          </div>
        </div>
      </ChatPanel>
    </div>
  );
}

function MobileSidebarNav({
  active,
  onChange,
  onClose,
  onToggleChat,
  isOpen,
}: {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  onClose: () => void;
  onToggleChat?: () => void;
  isOpen: boolean;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex md:hidden">
      <button
        aria-label="Close navigation"
        className="flex-1 bg-background/70"
        onClick={onClose}
        type="button"
      />
      <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar px-4 py-6 text-sidebar-foreground shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">ConsumerIQ</h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Mobile Menu
            </p>
          </div>
          <Button
            aria-label="Close navigation"
            onClick={onClose}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <button
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-left text-xs font-medium transition-colors duration-150",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  onClose();
                }}
                type="button"
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t pt-4">
          <Button
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            onClick={() => {
              onToggleChat?.();
              onClose();
            }}
            type="button"
          >
            <MessageSquare className="size-4" />
            Founder Chat
          </Button>
        </div>
      </aside>
    </div>
  );
}

function BusinessSetupStep({ onNext }: { onNext: () => void }) {
  const launchOptions = [
    "Physical product - Beauty & Personal Care",
    "Physical product - Fashion & Apparel",
    "Physical product - Food & Beverage",
    "Physical product - Home & Lifestyle",
    "Physical product - Electronics & Gadgets",
    "Digital product / service - Mobile App",
    "Digital product / service - SaaS / Web product",
    "Digital product / service - Digital content (courses/bootcamps & ebooks)",
    "Digital product / service - Game / Entertainment",
    "Digital product / service - Agency, consulting, etc.",
  ];

  const regionOptions = [
    "Asia",
    "Africa",
    "Europe",
    "North America",
    "South America",
    "Middle East",
    "Oceania",
    "Global",
  ];
  const [workspaceName, setWorkspaceName] = useState("");
  const [launchType, setLaunchType] = useState("");
  const [region, setRegion] = useState("");
  const [countryDetail, setCountryDetail] = useState("");
  const [salesChannel, setSalesChannel] = useState("");
  const [errors, setErrors] = useState<{
    workspaceName?: string;
    launchType?: string;
    region?: string;
    countryDetail?: string;
    salesChannel?: string;
  }>({});

  const clearError = (key: keyof typeof errors) => {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const handleNext = () => {
    const nextErrors: typeof errors = {};

    if (!workspaceName.trim()) {
      nextErrors.workspaceName = "Workspace / brand name is required.";
    }
    if (!launchType) {
      nextErrors.launchType = "Launch type is required.";
    }
    if (!region) {
      nextErrors.region = "Region is required.";
    }
    if (!countryDetail.trim()) {
      nextErrors.countryDetail =
        "Country and demographic details are required.";
    }
    if (!salesChannel) {
      nextErrors.salesChannel = "Sales channel is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onNext();
    }
  };

  return (
    <OnboardingShell footer="STEP 01/04" progress={25}>
      <h1 className="text-3xl font-semibold tracking-tight">
        Founder Input | Business Setup
      </h1>
      <p className="mt-3 text-muted-foreground">
        Set your workspace context before the ConsumerIQ engine starts.
      </p>

      <div className="mt-8 grid gap-6">
        <Field label="Workspace / Brand Name">
          <div className="grid gap-2">
            <Input
              aria-invalid={errors.workspaceName ? "true" : undefined}
              className={cn(
                errors.workspaceName &&
                  "border-destructive focus-visible:ring-destructive/40"
              )}
              onChange={(event) => {
                setWorkspaceName(event.target.value);
                clearError("workspaceName");
              }}
              placeholder="e.g. Bright Labs"
              required
              value={workspaceName}
            />
            <FieldError message={errors.workspaceName} />
          </div>
        </Field>
        <Field label="What are you launching? (Retail focus)">
          <div className="grid gap-2">
            <BasicSelect
              isInvalid={Boolean(errors.launchType)}
              isRequired
              onValueChange={(value) => {
                setLaunchType(value);
                clearError("launchType");
              }}
              placeholder="Select launch type"
              value={launchType}
              values={launchOptions}
            />
            <FieldError message={errors.launchType} />
          </div>
        </Field>
        <Field label="Target Region / Market">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <BasicSelect
                isInvalid={Boolean(errors.region)}
                isRequired
                onValueChange={(value) => {
                  setRegion(value);
                  clearError("region");
                }}
                placeholder="Region (e.g., Asia, Africa, Europe)"
                value={region}
                values={regionOptions}
              />
              <FieldError message={errors.region} />
            </div>
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.countryDetail ? "true" : undefined}
                className={cn(
                  errors.countryDetail &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                onChange={(event) => {
                  setCountryDetail(event.target.value);
                  clearError("countryDetail");
                }}
                placeholder="Country + demographic details from ConsumerIQ"
                required
                value={countryDetail}
              />
              <FieldError message={errors.countryDetail} />
            </div>
          </div>
        </Field>
        <Field label="Sales Channel">
          <div className="grid gap-2">
            <BasicSelect
              isInvalid={Boolean(errors.salesChannel)}
              isRequired
              onValueChange={(value) => {
                setSalesChannel(value);
                clearError("salesChannel");
              }}
              placeholder="Select channel"
              value={salesChannel}
              values={["Online store / website", "Omnichannel"]}
            />
            <FieldError message={errors.salesChannel} />
          </div>
        </Field>
        <StepActions onNext={handleNext} />
      </div>
    </OnboardingShell>
  );
}

function ProductContextStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const [problemStatement, setProblemStatement] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [uniqueSellingPoint, setUniqueSellingPoint] = useState("");
  const [keyFeatures, setKeyFeatures] = useState("");
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState("");
  const [lowestPrice, setLowestPrice] = useState("");
  const [corePrice, setCorePrice] = useState("");
  const [highestPrice, setHighestPrice] = useState("");
  const [errors, setErrors] = useState<{
    problemStatement?: string;
    productName?: string;
    productDescription?: string;
    uniqueSellingPoint?: string;
    keyFeatures?: string;
    competitiveAdvantage?: string;
    lowestPrice?: string;
    corePrice?: string;
    highestPrice?: string;
    priceOrder?: string;
  }>({});

  const clearError = (key: keyof typeof errors) => {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const handleLongTextChange = (
    nextValue: string,
    key:
      | "problemStatement"
      | "productDescription"
      | "keyFeatures"
      | "competitiveAdvantage",
    setValue: (value: string) => void
  ) => {
    const result = truncateToCharLimit(nextValue, LONG_TEXT_CHAR_LIMIT);
    setValue(result.value);

    if (result.truncated) {
      setErrors((current) => ({
        ...current,
        [key]: `Limit is ${LONG_TEXT_CHAR_LIMIT} characters.`,
      }));
      return;
    }

    clearError(key);
  };

  const parsePrice = (value: string) => {
    const normalized = value.trim().replace(/,/g, "");
    if (!normalized) {
      return Number.NaN;
    }

    return Number.parseFloat(normalized);
  };

  const handleNext = () => {
    const nextErrors: typeof errors = {};

    if (!problemStatement.trim()) {
      nextErrors.problemStatement = "Problem statement is required.";
    } else if (problemStatement.length > LONG_TEXT_CHAR_LIMIT) {
      nextErrors.problemStatement = `Limit is ${LONG_TEXT_CHAR_LIMIT} characters.`;
    }
    if (!productName.trim()) {
      nextErrors.productName = "Primary product name is required.";
    }
    if (!productDescription.trim()) {
      nextErrors.productDescription = "Short description is required.";
    } else if (productDescription.length > LONG_TEXT_CHAR_LIMIT) {
      nextErrors.productDescription = `Limit is ${LONG_TEXT_CHAR_LIMIT} characters.`;
    }
    if (!uniqueSellingPoint.trim()) {
      nextErrors.uniqueSellingPoint = "Unique selling point is required.";
    }
    if (!keyFeatures.trim()) {
      nextErrors.keyFeatures = "Key features are required.";
    } else if (keyFeatures.length > LONG_TEXT_CHAR_LIMIT) {
      nextErrors.keyFeatures = `Limit is ${LONG_TEXT_CHAR_LIMIT} characters.`;
    }
    if (!competitiveAdvantage.trim()) {
      nextErrors.competitiveAdvantage = "Competitive advantage is required.";
    } else if (competitiveAdvantage.length > LONG_TEXT_CHAR_LIMIT) {
      nextErrors.competitiveAdvantage = `Limit is ${LONG_TEXT_CHAR_LIMIT} characters.`;
    }

    const parsedLowest = parsePrice(lowestPrice);
    const parsedCore = parsePrice(corePrice);
    const parsedHighest = parsePrice(highestPrice);

    if (!lowestPrice.trim()) {
      nextErrors.lowestPrice = "Lowest price is required.";
    } else if (Number.isNaN(parsedLowest) || parsedLowest < 0) {
      nextErrors.lowestPrice = "Enter a valid non-negative price.";
    }

    if (!corePrice.trim()) {
      nextErrors.corePrice = "Core price is required.";
    } else if (Number.isNaN(parsedCore) || parsedCore < 0) {
      nextErrors.corePrice = "Enter a valid non-negative price.";
    }

    if (!highestPrice.trim()) {
      nextErrors.highestPrice = "Highest price is required.";
    } else if (Number.isNaN(parsedHighest) || parsedHighest < 0) {
      nextErrors.highestPrice = "Enter a valid non-negative price.";
    }

    if (
      !nextErrors.lowestPrice &&
      !nextErrors.corePrice &&
      !nextErrors.highestPrice
    ) {
      if (parsedLowest > parsedCore || parsedCore > parsedHighest) {
        nextErrors.priceOrder =
          "Price range must be in ascending order (lowest <= core <= highest).";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onNext();
    }
  };

  return (
    <OnboardingShell footer="STEP 02/04" progress={50}>
      <h1 className="text-3xl font-semibold tracking-tight">
        Founder Input | Product Context
      </h1>
      <p className="mt-3 text-muted-foreground">
        Describe the product and the market problem you want to solve.
      </p>

      <div className="mt-8 grid gap-6">
        <Field label="Problems they want to solve">
          <div className="grid gap-2">
            <Textarea
              aria-invalid={errors.problemStatement ? "true" : undefined}
              className={cn(
                "min-h-24",
                errors.problemStatement &&
                  "border-destructive focus-visible:ring-destructive/40"
              )}
              onChange={(event) => {
                handleLongTextChange(
                  event.target.value,
                  "problemStatement",
                  setProblemStatement
                );
              }}
              placeholder="Describe the core pain points and context..."
              required
              value={problemStatement}
            />
            <FieldError message={errors.problemStatement} />
            <FieldCounter
              count={problemStatement.length}
              limit={LONG_TEXT_CHAR_LIMIT}
            />
          </div>
        </Field>
        <Field label="Product / Service Description">
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.productName ? "true" : undefined}
                className={cn(
                  errors.productName &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                onChange={(event) => {
                  setProductName(event.target.value);
                  clearError("productName");
                }}
                placeholder="Primary product name"
                required
                value={productName}
              />
              <FieldError message={errors.productName} />
            </div>
            <div className="grid gap-2">
              <Textarea
                aria-invalid={errors.productDescription ? "true" : undefined}
                className={cn(
                  "min-h-20",
                  errors.productDescription &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                onChange={(event) => {
                  handleLongTextChange(
                    event.target.value,
                    "productDescription",
                    setProductDescription
                  );
                }}
                placeholder="Short description"
                required
                value={productDescription}
              />
              <FieldError message={errors.productDescription} />
              <FieldCounter
                count={productDescription.length}
                limit={LONG_TEXT_CHAR_LIMIT}
              />
            </div>
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.uniqueSellingPoint ? "true" : undefined}
                className={cn(
                  errors.uniqueSellingPoint &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                onChange={(event) => {
                  setUniqueSellingPoint(event.target.value);
                  clearError("uniqueSellingPoint");
                }}
                placeholder="Unique selling point"
                required
                value={uniqueSellingPoint}
              />
              <FieldError message={errors.uniqueSellingPoint} />
            </div>
            <div className="grid gap-2">
              <Textarea
                aria-invalid={errors.keyFeatures ? "true" : undefined}
                className={cn(
                  "min-h-20",
                  errors.keyFeatures &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                onChange={(event) => {
                  handleLongTextChange(
                    event.target.value,
                    "keyFeatures",
                    setKeyFeatures
                  );
                }}
                placeholder="Key features"
                required
                value={keyFeatures}
              />
              <FieldError message={errors.keyFeatures} />
              <FieldCounter
                count={keyFeatures.length}
                limit={LONG_TEXT_CHAR_LIMIT}
              />
            </div>
          </div>
        </Field>
        <Field label="Competitive Advantage">
          <div className="grid gap-2">
            <Textarea
              aria-invalid={errors.competitiveAdvantage ? "true" : undefined}
              className={cn(
                "min-h-24",
                errors.competitiveAdvantage &&
                  "border-destructive focus-visible:ring-destructive/40"
              )}
              onChange={(event) => {
                handleLongTextChange(
                  event.target.value,
                  "competitiveAdvantage",
                  setCompetitiveAdvantage
                );
              }}
              placeholder="What makes you win against competitors?"
              required
              value={competitiveAdvantage}
            />
            <FieldError message={errors.competitiveAdvantage} />
            <FieldCounter
              count={competitiveAdvantage.length}
              limit={LONG_TEXT_CHAR_LIMIT}
            />
          </div>
        </Field>
        <Field label="Price Range">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.lowestPrice ? "true" : undefined}
                className={cn(
                  errors.lowestPrice &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  setLowestPrice(event.target.value);
                  clearError("lowestPrice");
                  clearError("priceOrder");
                }}
                placeholder="Lowest price"
                required
                step="0.01"
                type="number"
                value={lowestPrice}
              />
              <FieldError message={errors.lowestPrice} />
            </div>
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.corePrice ? "true" : undefined}
                className={cn(
                  errors.corePrice &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  setCorePrice(event.target.value);
                  clearError("corePrice");
                  clearError("priceOrder");
                }}
                placeholder="Core price"
                required
                step="0.01"
                type="number"
                value={corePrice}
              />
              <FieldError message={errors.corePrice} />
            </div>
            <div className="grid gap-2">
              <Input
                aria-invalid={errors.highestPrice ? "true" : undefined}
                className={cn(
                  errors.highestPrice &&
                    "border-destructive focus-visible:ring-destructive/40"
                )}
                inputMode="decimal"
                min="0"
                onChange={(event) => {
                  setHighestPrice(event.target.value);
                  clearError("highestPrice");
                  clearError("priceOrder");
                }}
                placeholder="Highest price"
                required
                step="0.01"
                type="number"
                value={highestPrice}
              />
              <FieldError message={errors.highestPrice} />
            </div>
          </div>
          <FieldError message={errors.priceOrder} />
        </Field>
        <StepActions onBack={onBack} onNext={handleNext} />
      </div>
    </OnboardingShell>
  );
}

function ResearchGoalsStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: () => void;
}) {
  const researchGoals = [
    "Who my ideal customer is",
    "Product-market fit",
    "Positioning",
    "Competitor analysis",
    "Market expansion",
    "Customer persona",
    "New product idea validation",
  ];
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ goals?: string }>({});
  const selectedLabel =
    selectedGoals.length === 0
      ? "Select research goals"
      : selectedGoals.length <= 2
      ? selectedGoals.join(", ")
      : `${selectedGoals.slice(0, 2).join(", ")} +${
          selectedGoals.length - 2
        } more`;

  const handleNext = () => {
    if (selectedGoals.length === 0) {
      setErrors({ goals: "Select at least one research goal to continue." });
      return;
    }

    setErrors({});
    onNext();
  };

  return (
    <OnboardingShell footer="STEP 03/04" progress={75}>
      <h1 className="text-3xl font-semibold tracking-tight">
        Founder Input | Research Goals
      </h1>
      <p className="mt-3 text-muted-foreground">
        Select the insights you want ConsumerIQ to prioritize.
      </p>

      <div className="mt-8 grid gap-6">
        <Field label="What do you want to understand? (Multi-select)">
          <div className="grid gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-invalid={errors.goals ? "true" : undefined}
                  className={cn(
                    "h-11 w-full justify-between",
                    errors.goals && "border-destructive text-destructive"
                  )}
                  variant="outline"
                >
                  <span
                    className={cn(
                      "truncate text-left",
                      selectedGoals.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {selectedLabel}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Research goals</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {researchGoals.map((goal) => (
                  <DropdownMenuCheckboxItem
                    checked={selectedGoals.includes(goal)}
                    key={goal}
                    onCheckedChange={(checked) => {
                      if (errors.goals) {
                        setErrors({});
                      }
                      setSelectedGoals((current) => {
                        const isSelected = current.includes(goal);
                        if (checked && !isSelected) {
                          return [...current, goal];
                        }
                        if (!checked && isSelected) {
                          return current.filter((item) => item !== goal);
                        }
                        return current;
                      });
                    }}
                  >
                    {goal}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedGoals.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedGoals.map((goal) => (
                  <span
                    className="rounded-full border px-3 py-1 text-xs"
                    key={goal}
                  >
                    {goal}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Select one or more goals to continue.
              </p>
            )}
            <FieldError message={errors.goals} />
          </div>
        </Field>
        <StepActions onBack={onBack} onNext={handleNext} />
      </div>
    </OnboardingShell>
  );
}

function GeneratingStep({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(18);
  const [isVisible, setIsVisible] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const redirectTimeoutRef = useRef<number | null>(null);
  const hasAutoRedirectedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => setIsVisible(true));
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 100) {
          window.clearInterval(progressTimer);
          return 100;
        }

        return Math.min(100, current + 7);
      });
    }, 140);
    const fallbackTimer = window.setTimeout(() => {
      if (!hasAutoRedirectedRef.current) {
        hasAutoRedirectedRef.current = true;
        onCompleteRef.current();
      }
    }, 4200);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearInterval(progressTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  useEffect(() => {
    if (progress < 100 || hasAutoRedirectedRef.current) {
      return;
    }

    hasAutoRedirectedRef.current = true;
    redirectTimeoutRef.current = window.setTimeout(() => {
      onComplete();
    }, 900);

    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [onComplete, progress]);

  const processRows = [
    "Establishing secure connection",
    "Connecting API infrastructure",
    "Syncing historical market data",
    "Optimizing predictive algorithms",
    "Running Bright Data synthesis",
  ];
  const activeIndex = Math.min(
    processRows.length - 1,
    Math.floor((progress / 100) * processRows.length)
  );
  const ringAngle = progress * 3.6;

  return (
    <div className="w-full max-w-3xl text-center">
      <ProgressBar value={progress} />
      <h1
        className={cn(
          "mt-12 text-3xl font-semibold tracking-tight transition-all duration-500 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        Building your Intelligence Engine...
      </h1>
      <p
        className={cn(
          "mx-auto mt-4 max-w-sm text-muted-foreground transition-all delay-100 duration-500 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        We're synthesizing your custom market parameters into a live, predictive
        data model.
      </p>

      <div
        className={cn(
          "relative mx-auto mt-12 grid size-44 place-items-center transition-all delay-150 duration-700 ease-out will-change-transform",
          isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"
        )}
      >
        <div
          className="absolute inset-0 rounded-full transition-all duration-500 ease-out"
          style={{
            background: `conic-gradient(var(--foreground) ${ringAngle}deg, var(--muted) ${ringAngle}deg 360deg)`,
          }}
        />
        <div className="absolute inset-[18px] rounded-full bg-background" />
        <div
          className="absolute -inset-2 rounded-full border border-transparent border-t-foreground/80"
          style={{ animation: "spin 1.6s linear infinite" }}
        />
        <div
          className="absolute inset-5 rounded-full border border-border/70"
          style={{ animation: "pulse 1.8s ease-in-out infinite" }}
        />
        <span className="relative text-3xl font-semibold">{progress}%</span>
      </div>

      <div
        className={cn(
          "mx-auto mt-10 max-w-xl rounded-xl border bg-card p-5 text-left transition-all delay-200 duration-500 ease-out",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.22em]">
            System Processes
          </p>
          <p className="font-mono text-xs">{activeIndex + 1}/5 Active</p>
        </div>
        {processRows.map((label, index) => {
          const status =
            progress >= 93 || index < activeIndex
              ? "DONE"
              : index === activeIndex
              ? "RUNNING"
              : "QUEUED";

          return (
            <div
              className={cn(
                "flex items-center justify-between py-2 text-sm transition-all duration-500 ease-out",
                isVisible
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-3 opacity-0"
              )}
              key={label}
              style={{ transitionDelay: `${250 + index * 90}ms` }}
            >
              <span className="flex items-center gap-3">
                {status === "DONE" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <LoaderCircle
                    className="size-4"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {label}
              </span>
              <span
                className={cn(
                  "rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground"
                )}
                style={
                  status !== "DONE"
                    ? { animation: "pulse 1.4s ease-in-out infinite" }
                    : undefined
                }
              >
                {status}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        className={cn(
          "mt-9 h-12 min-w-56 bg-foreground text-background transition-all duration-300 hover:scale-[1.02] hover:bg-foreground/90 active:scale-[0.99]",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
        onClick={() => {
          hasAutoRedirectedRef.current = true;
          onComplete();
        }}
        type="button"
      >
        Launch Dashboard
      </Button>
      <div
        className={cn(
          "mx-auto mt-7 grid max-w-xl gap-4 transition-all delay-300 duration-500 ease-out sm:grid-cols-2",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        )}
      >
        <MiniMetric
          icon={<Zap className="size-5" />}
          label="Speed"
          value="0.4s Latency"
        />
        <MiniMetric
          icon={<Database className="size-5" />}
          label="Data Points"
          value="12.4M Analyzed"
        />
      </div>
    </div>
  );
}

function MarketOverview() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.75rem),1fr))] gap-3">
        <MetricCard
          label="Trend Velocity"
          status="+12% from last month"
          title="+67%"
          tone="success"
        />
        <MetricCard
          label="Est. Demand"
          status="High confidence signal"
          title="12.4K"
        />
        <MetricCard
          label="Price Target"
          status="Optimal market fit"
          title="Rp119K"
        />
        <MetricCard
          label="Market Gaps"
          status="High potential entry"
          title="3 Found"
          tone="danger"
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <Panel
          title="Marketplace Pulse"
          subtitle="Real-time SKU tracking across platforms"
        >
          <div className="mb-2 flex gap-2">
            {["Shopee", "Lazada", "TikTok"].map((item, index) => (
              <span
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-medium",
                  index === 0 && "bg-muted text-foreground"
                )}
                key={item}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border">
            {[
              [
                "Hyalu-Boost B5",
                "GlowIndo Official",
                "Rp125,000",
                "82%",
                "+12.4%",
              ],
              [
                "Aqua-Lock Serum",
                "DewySkin Lab",
                "Rp98,000",
                "Low Stock",
                "+28.1%",
              ],
              [
                "Ceramide+ Intense",
                "Purendo Wellness",
                "Rp142,000",
                "55%",
                "-1.2%",
              ],
            ].map((row) => (
              <div
                className="grid grid-cols-[1.3fr_0.8fr_1fr_0.7fr] items-center border-b px-3 py-2.5 text-sm last:border-b-0"
                key={row[0]}
              >
                <div>
                  <p className="font-semibold">{row[0]}</p>
                  <p className="text-xs text-muted-foreground">{row[1]}</p>
                </div>
                <p className="font-medium">{row[2]}</p>
                <div className="flex items-center gap-3">
                  <span className="h-1.5 w-20 rounded-full bg-muted">
                    <span className="block h-full w-2/3 rounded-full bg-foreground" />
                  </span>
                  <span className="text-xs">{row[3]}</span>
                </div>
                <p
                  className={cn(
                    "text-right font-medium",
                    row[4].startsWith("+")
                      ? "text-chart-4"
                      : "text-muted-foreground"
                  )}
                >
                  {row[4]}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Demand Density"
          subtitle="Geographic distribution of interest"
        >
          <MapCard />
          <RegionBars
            rows={[
              ["Jabodetabek", 58.2],
              ["Surabaya", 19.4],
              ["Bandung", 12.1],
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}

function DemandPulse() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-3">
        <Panel
          title="Trend Velocity Index"
          subtitle="Global aggregate interest momentum"
        >
          <LineGraph />
          <div className="mt-4 flex items-end justify-between border-t pt-3">
            <div className="grid grid-cols-2 gap-5">
              <SmallStat label="Current Velocity" value="42.8m/s" />
              <SmallStat label="Acceleration" value="+12.4%" tone="danger" />
            </div>
            <Button variant="ghost">
              Export SVGs
              <Download className="size-4" />
            </Button>
          </div>
        </Panel>

        <Panel title="Top Rising Formats">
          <div className="grid gap-3">
            {[
              ["Hydrating Serum", "+88%", "42% of total reach"],
              ["Ceramide Barrier", "+54%", "12% penetration"],
              ["Sensitive Skin SPF", "+31%", "High LTV segments"],
            ].map(([name, growth, caption]) => (
              <div className="rounded-lg border p-3" key={name}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{name}</p>
                  <p className="text-xl font-semibold">{growth}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Marketplace Share"
          subtitle="Dominance by platform segment"
        >
          <PlatformShareChart />
        </Panel>

        <div className="rounded-xl bg-foreground p-4 text-background shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Search Intent Analysis</h3>
              <p className="text-xs opacity-70">Live SERP clustering</p>
            </div>
            <span className="rounded bg-background/10 px-2 py-1 text-[10px] uppercase">
              Live
            </span>
          </div>
          {[
            ['"hydrating serum spf"', "Commercial", "144K"],
            ['"serum kulit sensitif"', "Informational", "82K"],
            ['"ceramide serum murah"', "Transactional", "36K"],
          ].map(([keyword, intent, volume]) => (
            <div
              className="mb-2 rounded-lg border border-background/20 p-3"
              key={keyword}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{keyword}</p>
                <ArrowRight className="size-4 opacity-70" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[10px] uppercase">
                <span className="rounded bg-background/15 px-2 py-1">
                  {intent}
                </span>
                <span className="rounded bg-background/15 px-2 py-1">
                  Volume: {volume}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductOpportunityMatrix />
    </div>
  );
}

function ProductOpportunityMatrix() {
  const opportunities = [
    {
      title: "Tinted Sunscreen SPF 50+",
      demand: "92/100",
      saturation: "Low",
      tags: ["Makeup-Skincare Hybrid", "Daily Wear"],
      icon: Sparkles,
    },
    {
      title: "Acne Spot Gel (Centella)",
      demand: "88/100",
      saturation: "Med",
      tags: ["Targeted Treatment", "Gen Z"],
      icon: TrendingUp,
    },
    {
      title: "Peptide Lip Treatment",
      demand: "85/100",
      saturation: "Low",
      tags: ["Premiumization", "Night Care"],
      icon: Target,
    },
  ];

  return (
    <section className="rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Product Opportunity Matrix</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            High demand, low competitor saturation niches
          </p>
        </div>
        <Button className="text-chart-5" size="sm" variant="ghost">
          View Full Report
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {opportunities.map(({ demand, icon: Icon, saturation, tags, title }) => (
          <article
            className="relative overflow-hidden rounded-lg border bg-muted/25 p-4"
            key={title}
          >
            <div className="absolute top-0 right-0 grid size-16 place-items-start justify-end rounded-bl-full bg-chart-5/10 p-3 text-chart-5">
              <Icon className="size-5" />
            </div>
            <h4 className="pr-12 text-base font-semibold">{title}</h4>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="text-muted-foreground">Demand Index: </span>
                <strong>{demand}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">Saturation: </span>
                <strong>{saturation}</strong>
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  className="rounded bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PersonaDecode() {
  const personaCards = [
    {
      name: "Stressed Young Professional",
      priority: "High Priority",
      description:
        "Urban Gen Z women aged 18-26 who prioritize reliable daily hair solutions, value affordability, and respond to barrier-repair claims.",
      tags: ["Age 18-26", "Urban Indonesia", "Value Seeking"],
    },
    {
      name: "Budget-Conscious Trend Seeker",
      priority: "Medium Priority",
      description:
        "Early adopters who follow social trends and switch brands quickly when price/value feels right.",
      tags: ["Age 19-27", "Social-First", "Deal Hunting"],
    },
    {
      name: "Family Care Gatekeeper",
      priority: "Growth Priority",
      description:
        "Household decision makers who prefer gentle daily solutions with proven safety and easy availability.",
      tags: ["Age 28-40", "Family Focused", "Safety First"],
    },
  ];

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(17rem,0.95fr)_minmax(18rem,1.15fr)_minmax(15rem,0.9fr)]">
        <Panel title="User Persona" subtitle="Market Persona">
          <div className="max-h-[440px] overflow-y-auto pr-1">
            <div className="grid gap-3">
              {personaCards.map((persona) => (
                <div
                  className="grid gap-3 rounded-xl border bg-card p-3"
                  key={persona.name}
                >
                  <div className="flex h-20 w-full items-center justify-center rounded-xl border bg-muted/40 text-xs text-muted-foreground">
                    Image generation optional
                  </div>
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">{persona.name}</h3>
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                        {persona.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {persona.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {persona.tags.map((tag) => (
                      <span className="rounded-full border px-3 py-1" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="STP" subtitle="Segmentation, Targeting, Positioning">
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Segmentation
              </p>
              <p className="mt-2 text-sm">
                Urban Gen Z women in Indonesia seeking affordable daily hair
                solutions with practical benefits.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Targeting
              </p>
              <p className="mt-2 text-sm">
                Price-sensitive consumers who buy shampoo frequently and are
                open to switching brands that feel trustworthy and convenient.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Positioning
              </p>
              <p className="mt-2 text-sm">
                A reliable, affordable daily shampoo that solves dryness and
                hair damage without premium price tradeoffs.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {[
              {
                title: "Geographic",
                text: "Urban Indonesian cities with spillover from metros, high humidity, and pollution exposure.",
              },
              {
                title: "Demographic",
                text: "Women, Gen Z (18-26), students to early-career professionals.",
              },
              {
                title: "Psychographic",
                text: "Practical, budget-conscious, convenience oriented, value reliable daily results.",
              },
              {
                title: "Behavioral",
                text: "High usage frequency, low switching cost, open to social recommendations.",
              },
            ].map((item) => (
              <details
                className="group rounded-lg border bg-muted/40 p-3 transition-all duration-200 ease-out open:bg-card"
                key={item.title}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  <span>{item.title}</span>
                  <span className="text-xs text-muted-foreground transition-transform duration-200 group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  {item.text}
                </p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel title="TAM / SAM / SOM" subtitle="Market Sizing">
          <div className="grid gap-3">
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                TAM
              </p>
              <p className="mt-2 text-2xl font-semibold">37,032,414</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Total addressable market
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                SAM
              </p>
              <p className="mt-2 text-2xl font-semibold">21,775,060</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Serviceable available market
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                SOM
              </p>
              <p className="mt-2 text-2xl font-semibold">1,307,407</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Serviceable obtainable market
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-muted/40 p-3">
              All Women Gen Z in Indonesia (BPS, 2025)
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              Urban Gen Z women in Indonesia
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              The new attainable loyal segment for Sunsilk
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs">
              Sunsilk can tap into an attainable market of 1.3 million urban Gen
              Z women in Indonesia who seek affordable and flexible solutions
              for daily hair problems.
            </div>
          </div>
        </Panel>
      </div>

      <Panel subtitle="Primary target market summary">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">AI Recommendation</h3>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Focus the first wave on urban Gen Z women who prioritize affordable
          daily hair solutions and respond to clear efficacy claims. Emphasize
          barrier-repair messaging, push social proof around consistent results,
          and keep entry pricing accessible to accelerate trial and repeat.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Main Channel
            </p>
            <p className="mt-2 text-sm font-semibold">Shopee + TikTok</p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Core Message
            </p>
            <p className="mt-2 text-sm font-semibold">
              Daily relief, real results
            </p>
          </div>
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              KPI Focus
            </p>
            <p className="mt-2 text-sm font-semibold">Repeat purchase rate</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function CompetitorMirror() {
  const competitorRows = [
    {
      brand: "Somethinc",
      sku: "5% Niacinamide Sabi Beet",
      avgPrice: "Rp 115.000",
      priceDelta: "-2.1%",
      promoIntensity: "High",
      promoLevel: "high",
      monthlySales: "45.2K",
      salesDelta: "+5.4%",
      rating: "4.9",
      reviews: "128K",
    },
    {
      brand: "Avoskin",
      sku: "PHTE Essence 100ml",
      avgPrice: "Rp 299.000",
      priceDelta: "-0.8%",
      promoIntensity: "Low",
      promoLevel: "low",
      monthlySales: "18.5K",
      salesDelta: "-1.2%",
      rating: "4.8",
      reviews: "85K",
    },
    {
      brand: "Skintific",
      sku: "5X Ceramide Moisture Gel",
      avgPrice: "Rp 149.000",
      priceDelta: "+5.8%",
      promoIntensity: "Very High",
      promoLevel: "very-high",
      monthlySales: "82.1K",
      salesDelta: "+12.4%",
      rating: "4.9",
      reviews: "320K",
    },
  ];

  const promoBarClasses: Record<string, string> = {
    low: "w-1/4 bg-muted-foreground/50",
    medium: "w-1/2 bg-muted-foreground/70",
    high: "w-3/4 bg-foreground",
    "very-high": "w-5/6 bg-foreground",
  };

  return (
    <div className="grid gap-3">
      <CompetitorSignalCards />

      <Panel title="Top Competitor Matrix">
        <div className="overflow-x-auto rounded-lg border">
          <div className="min-w-[52rem]">
            <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Brand / Hero SKU</span>
              <span>Avg Price (IDR)</span>
              <span>Promo Intensity</span>
              <span>Est. Monthly Sales</span>
              <span>Rating / Reviews</span>
            </div>
            {competitorRows.map((row) => (
              <div
                className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] items-center border-b px-4 py-3 text-sm last:border-b-0"
                key={row.sku}
              >
                <div>
                  <p className="font-semibold">{row.brand}</p>
                  <p className="text-xs text-muted-foreground">{row.sku}</p>
                </div>
                <div>
                  <p className="font-semibold">{row.avgPrice}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.priceDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive"
                    )}
                  >
                    {row.priceDelta}
                  </p>
                </div>
                <div>
                  <div className="h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ?? "w-1/2 bg-foreground"
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.promoIntensity}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">{row.monthlySales}</p>
                  <p
                    className={cn(
                      "text-xs",
                      row.salesDelta.startsWith("+")
                        ? "text-chart-4"
                        : "text-destructive"
                    )}
                  >
                    {row.salesDelta}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">
                    {row.rating}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({row.reviews})
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Avg Movement">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-foreground" /> You
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-chart-4" /> Somethinc
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive" /> Skintific
          </span>
        </div>
        <div className="mt-3 h-32 w-full rounded-lg border bg-muted/30 p-3">
          <PriceMovementChart />
        </div>
      </Panel>
    </div>
  );
}

function CompetitorSignalCards() {
  const signals = [
    {
      action: "View Impact",
      body: (
        <>
          <strong>Skintific</strong> dropped price on{" "}
          <em>5X Ceramide Barrier Repair Moisture Gel</em> by 15% on Shopee.
        </>
      ),
      icon: AlertTriangle,
      label: "Price Drop Alert",
      time: "2h ago",
      tone: "danger",
    },
    {
      action: "View Keywords",
      body: (
        <>
          <strong>Somethinc</strong> moved up 3 spots in "Niacinamide Serum"
          keyword search.
        </>
      ),
      icon: TrendingUp,
      label: "Search Rank Surge",
      time: "5h ago",
      tone: "warning",
    },
    {
      action: "Capitalize Now",
      body: (
        <>
          <strong>Avoskin</strong> Perfect Hydrating Treatment Essence is OOS on
          Tokopedia.
        </>
      ),
      icon: PackageX,
      label: "Stock Outage",
      time: "1d ago",
      tone: "success",
    },
  ] as const;

  const toneClasses = {
    danger: {
      card: "border-destructive/30 bg-destructive/5",
      text: "text-destructive",
    },
    warning: {
      card: "border-chart-3/40 bg-chart-3/10",
      text: "text-chart-3",
    },
    success: {
      card: "border-chart-4/40 bg-chart-4/10",
      text: "text-chart-4",
    },
  };

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {signals.map(({ action, body, icon: Icon, label, time, tone }) => {
        const classes = toneClasses[tone];

        return (
          <article
            className={cn("rounded-xl border p-3.5 shadow-sm", classes.card)}
            key={label}
          >
            <div className="flex items-start justify-between gap-3">
              <p
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]",
                  classes.text
                )}
              >
                <Icon className="size-4" />
                {label}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {time}
              </span>
            </div>
            <p className="mt-3 min-h-12 text-sm leading-6">{body}</p>
            <Button className="mt-2 h-auto p-0" size="sm" variant="link">
              {action}
              <ArrowRight className="size-3.5" />
            </Button>
          </article>
        );
      })}
    </div>
  );
}

function LaunchCompass() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
            <div>
              <span className="rounded bg-foreground px-2 py-1 text-[10px] font-semibold uppercase text-background">
                AI Recommended Decision
              </span>
              <h3 className="mt-4 text-3xl font-semibold leading-none tracking-tight xl:text-4xl">
                GO TO
                <br />
                MARKET
              </h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                All primary indicators align for a high-impact launch. Demand
                signals in the target demographic have peaked at a 24-month
                high.
              </p>
              <div className="mt-4 flex gap-3">
                <Button className="bg-foreground text-background hover:bg-foreground/90">
                  Initiate Rollout
                </Button>
                <Button variant="outline">Export Logic</Button>
              </div>
            </div>
            <div className="grid place-items-center border-l">
              <div className="text-center">
                <ScoreDonutChart score={92} />
                <p className="mt-4 font-semibold">Market Gap Score</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Extreme validation against current competitor saturation.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Pricing Strategy">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between">
              <span className="text-xs text-muted-foreground">
                Introductory Tier
              </span>
              <p className="text-2xl font-semibold">Rp119K</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Penetration pricing model with 35% margin floor.
            </p>
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs">
              <span>Elasticity Range</span>
              <span>Rp89K - Rp159K</span>
            </div>
            <PricingElasticityChart />
          </div>
          <Button className="mt-4 w-full" variant="outline">
            Review Profit Models
          </Button>
        </Panel>
      </div>

      <Panel
        title="Channel Rollout Sequence"
        subtitle="Prioritized phases based on CAC efficiency"
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          {[
            ["1", "Shopee Beta", "Top 500 wishlist users"],
            ["2", "Organic Search", "SEO keyword injection"],
            ["3", "TikTok Amplify", "Creator affiliate test"],
            ["4", "Mass Market", "Lazada expansion"],
          ].map(([num, title, desc], index) => (
            <div className="rounded-lg border p-3" key={title}>
              <div
                className={cn(
                  "mb-4 grid size-8 place-items-center rounded-full border font-semibold",
                  index === 0 && "bg-foreground text-background"
                )}
              >
                {num}
              </div>
              <p className="font-semibold uppercase tracking-[0.08em] text-xs">
                {title}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel title="Strategic Moat Analysis">
          <div className="grid gap-3">
            <MoatRow icon={<Lock />} label="Data Propriety" value="High" />
            <MoatRow
              icon={<Zap />}
              label="Execution Velocity"
              value="Extreme"
            />
            <MoatRow
              icon={<Sparkles />}
              label="Switching Costs"
              value="Medium"
            />
          </div>
        </Panel>
        <Panel
          title="Intelligence Feed"
          subtitle="Global market signals tracked hourly"
        >
          {[
            "Beauty challenger adjusts pricing for Southeast Asia.",
            "Consumer interest in sensitive skin spikes +12%.",
            "Search trend for ceramide barrier continues upward.",
          ].map((item, index) => (
            <div className="border-b py-3 text-sm last:border-b-0" key={item}>
              <p className="text-xs text-muted-foreground">
                {index === 0 ? "2m ago" : index === 1 ? "15m ago" : "1h ago"}
              </p>
              <p className="mt-1 font-medium">{item}</p>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3">
        <Panel title="Network Health">
          <div className="grid gap-3 text-sm">
            <HealthRow label="Bright Data" value="99.9% Uptime" />
            <HealthRow label="Shopee Connect" value="12ms" />
            <HealthRow label="Tokopedia Stream" value="18ms" />
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
              "Shopee storefronts",
              "Active",
              "15 mins ago",
              "1.2M req",
              "850ms",
            ],
            [
              "Scraper Studio",
              "Custom Tokopedia parser",
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
                    : "border-chart-3/40 text-chart-3"
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

function getSectionTitle(section: DashboardSection) {
  switch (section) {
    case "dashboard":
      return "Market Intelligence";
    case "pulse":
      return "Demand Pulse";
    case "persona":
      return "Persona Decode";
    case "competitor":
      return "Competitor Mirror";
    case "compass":
      return "Launch Compass";
    case "settings":
      return "Data Sources & Infrastructure";
  }
}

function getSectionLabel(section: DashboardSection) {
  switch (section) {
    case "dashboard":
      return "Pusat kendali data pasar dengan metrik Trend Velocity, Estimated Demand, dan Market Gaps.";
    case "pulse":
      return "Analisis real-time pergerakan tren dan sinyal pencarian konsumen (SERP data).";
    case "persona":
      return "Segmentasi mendalam dan pemetaan perilaku pembeli berdasarkan ekstraksi ulasan.";
    case "competitor":
      return "Monitoring performa relatif, harga, dan Share of Voice dibandingkan pesaing.";
    case "compass":
      return "Strategi peluncuran optimal dengan rekomendasi Go-to-Market berbasis data.";
    case "settings":
      return "Transparansi teknis infrastruktur Bright Data (Web Unlocker, Scraper API, dll).";
  }
}

function OnboardingShell({
  children,
  footer,
  progress,
}: {
  children: ReactNode;
  footer: string;
  progress: number;
}) {
  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="p-10">
        <ProgressBar value={progress} />
        <div className="mt-8">{children}</div>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/35 px-10 py-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-muted-foreground" />
          {footer}
        </span>
        <span>Secure Transmission</span>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground transition-all duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div aria-label={label} className="grid gap-2" role="group">
      <span className="text-xs font-medium uppercase tracking-[0.16em]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

function FieldCounter({ count, limit }: { count: number; limit: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      {count}/{limit}
    </p>
  );
}

function BasicSelect({
  placeholder,
  values,
  value,
  onValueChange,
  isInvalid,
  isRequired,
}: {
  placeholder: string;
  values: string[];
  value?: string;
  onValueChange?: (value: string) => void;
  isInvalid?: boolean;
  isRequired?: boolean;
}) {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger
        aria-invalid={isInvalid ? "true" : undefined}
        aria-required={isRequired ? "true" : undefined}
        className={cn(
          "h-11 w-full",
          isInvalid && "border-destructive focus:ring-destructive/40"
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {values.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StepActions({
  onBack,
  onNext,
}: {
  onBack?: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center border-t pt-6",
        onBack ? "justify-between" : "justify-end"
      )}
    >
      {onBack ? (
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
      ) : null}
      <Button
        className="bg-foreground text-background hover:bg-foreground/90"
        onClick={onNext}
      >
        Continue
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function Panel({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title?: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
      {title ? (
        <div className="mb-3">
          <h3 className="font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function MetricCard({
  label,
  status,
  title,
  tone,
}: {
  label: string;
  status: string;
  title: string;
  tone?: "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-sm",
        tone === "danger" && "border-destructive/30 bg-destructive/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tracking-tight",
          tone === "danger" && "text-destructive"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm text-muted-foreground",
          tone === "success" && "text-chart-4",
          tone === "danger" && "text-destructive"
        )}
      >
        {status}
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-foreground",
            tone === "danger" && "bg-destructive"
          )}
          style={{ width: tone === "danger" ? "45%" : "67%" }}
        />
      </div>
    </div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 text-left">
      <span className="grid size-10 place-items-center rounded-md bg-muted">
        {icon}
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "danger";
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function MapCard() {
  const chartData = [
    { city: "Jabodetabek", x: 31, y: 46, z: 58.2 },
    { city: "Surabaya", x: 62, y: 54, z: 19.4 },
    { city: "Bandung", x: 48, y: 66, z: 12.1 },
  ];
  const chartConfig = {
    z: {
      label: "Demand",
      color: "var(--foreground)",
    },
  };

  return (
    <div className="relative mb-3 aspect-[2.35] min-h-40 rounded-lg border bg-muted/30">
      <Globe2 className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 size-20 text-muted-foreground/15" />
      <ChartContainer
        className="absolute inset-0 h-full w-full"
        config={chartConfig}
      >
        <ScatterChart margin={{ bottom: 12, left: 12, right: 12, top: 12 }}>
          <XAxis dataKey="x" domain={[0, 100]} hide type="number" />
          <YAxis dataKey="y" domain={[0, 100]} hide type="number" />
          <ZAxis dataKey="z" range={[70, 240]} type="number" />
          <ChartTooltip
            content={<ChartTooltipContent hideLabel nameKey="city" />}
          />
          <Scatter data={chartData} fill="var(--color-z)" name="Demand" />
        </ScatterChart>
      </ChartContainer>
    </div>
  );
}

function RegionBars({ rows }: { rows: [string, number][] }) {
  const chartData = rows.map(([label, value]) => ({ label, value }));
  const chartConfig = {
    value: {
      label: "Share",
      color: "var(--foreground)",
    },
  };

  return (
    <ChartContainer className="h-24 w-full" config={chartConfig}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis hide type="number" />
        <YAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          type="category"
          width={82}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 6, 6]} />
      </BarChart>
    </ChartContainer>
  );
}

function PlatformShareChart() {
  const chartData = [
    { name: "Shopee", value: 64.2, fill: "var(--foreground)" },
    { name: "Tokopedia", value: 22.8, fill: "var(--muted-foreground)" },
    { name: "TikTok Shop", value: 13, fill: "var(--chart-5)" },
  ];
  const chartConfig = {
    value: {
      label: "Share",
      color: "var(--foreground)",
    },
  };

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[7rem_1fr]">
      <div className="relative size-28">
        <ChartContainer className="h-full w-full" config={chartConfig}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={36}
              nameKey="name"
              outerRadius={54}
              paddingAngle={2}
            >
              {chartData.map((entry) => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2 text-center">
          <p className="text-xl font-semibold">64%</p>
          <p className="text-[10px] uppercase tracking-[0.16em]">Leader</p>
        </div>
      </div>
      <div className="grid gap-3 text-sm">
        {chartData.map((item) => (
          <div
            className="flex items-center justify-between gap-5"
            key={item.name}
          >
            <span className="flex items-center gap-2">
              <span className="size-3" style={{ backgroundColor: item.fill }} />
              {item.name}
            </span>
            <strong>{item.value.toFixed(1)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineGraph() {
  const chartData = [
    { week: "W1", value: 42 },
    { week: "W2", value: 46 },
    { week: "W3", value: 45 },
    { week: "W4", value: 52 },
    { week: "W5", value: 49 },
    { week: "W6", value: 58 },
    { week: "W7", value: 62 },
    { week: "W8", value: 68 },
    { week: "W9", value: 72 },
    { week: "W10", value: 77 },
  ];
  const chartConfig = {
    value: {
      label: "Velocity",
      color: "var(--foreground)",
    },
  };

  return (
    <ChartContainer className="h-48 w-full" config={chartConfig}>
      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="week"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}

function PriceMovementChart() {
  const chartData = [
    { period: "Jan", you: 52, somethinc: 58, skintific: 44 },
    { period: "Feb", you: 54, somethinc: 59, skintific: 43 },
    { period: "Mar", you: 56, somethinc: 61, skintific: 42 },
    { period: "Apr", you: 58, somethinc: 63, skintific: 41 },
    { period: "May", you: 62, somethinc: 66, skintific: 45 },
    { period: "Jun", you: 68, somethinc: 70, skintific: 49 },
  ];
  const chartConfig = {
    you: { label: "You", color: "var(--foreground)" },
    somethinc: { label: "Somethinc", color: "var(--chart-4)" },
    skintific: { label: "Skintific", color: "var(--destructive)" },
  };

  return (
    <ChartContainer className="h-full w-full" config={chartConfig}>
      <LineChart
        data={chartData}
        margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" hide />
        <YAxis hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          dataKey="you"
          stroke="var(--color-you)"
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
        <Line
          dataKey="somethinc"
          stroke="var(--color-somethinc)"
          strokeWidth={2}
          dot={false}
          strokeDasharray="5 4"
          type="monotone"
        />
        <Line
          dataKey="skintific"
          stroke="var(--color-skintific)"
          strokeWidth={2}
          dot={false}
          type="monotone"
        />
      </LineChart>
    </ChartContainer>
  );
}

function ScoreDonutChart({ score }: { score: number }) {
  const chartData = [
    { name: "Score", value: score, fill: "var(--foreground)" },
    { name: "Remaining", value: 100 - score, fill: "var(--muted)" },
  ];
  const chartConfig = {
    value: {
      label: "Score",
      color: "var(--foreground)",
    },
  };

  return (
    <div className="relative mx-auto size-28">
      <ChartContainer className="h-full w-full" config={chartConfig}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            innerRadius={36}
            nameKey="name"
            outerRadius={54}
            paddingAngle={2}
            startAngle={90}
            endAngle={-270}
          >
            {chartData.map((entry) => (
              <Cell fill={entry.fill} key={entry.name} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 top-1/2">
        <p className="text-2xl font-semibold">{score}</p>
        <p className="text-[10px] uppercase tracking-[0.18em]">Score</p>
      </div>
    </div>
  );
}

function PricingElasticityChart() {
  const chartData = [
    { tier: "Floor", price: 89 },
    { tier: "Target", price: 119 },
    { tier: "Ceiling", price: 159 },
  ];
  const chartConfig = {
    price: {
      label: "Price",
      color: "var(--foreground)",
    },
  };

  return (
    <ChartContainer className="h-16 w-full" config={chartConfig}>
      <BarChart
        data={chartData}
        margin={{ bottom: 0, left: 0, right: 0, top: 8 }}
      >
        <XAxis
          dataKey="tier"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis hide domain={[0, 180]} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                `Rp${Number(value).toLocaleString("id-ID")}K`
              }
            />
          }
        />
        <Bar dataKey="price" fill="var(--color-price)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function MoatRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <span className="grid size-10 place-items-center rounded-md bg-muted">
          {icon}
        </span>
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">
            Unique access to niche behavioral data sets.
          </p>
        </div>
      </div>
      <span className="rounded bg-muted px-2 py-1 text-xs font-semibold uppercase text-chart-4">
        {value}
      </span>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Database className="size-4" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
