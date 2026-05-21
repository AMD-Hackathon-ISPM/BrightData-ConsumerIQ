import { nanoid } from "nanoid";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Compass,
  Database,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
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
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
  AnalysisStep,
  GeneratingStep,
  SignupStep,
  WhiteSpaceStep,
} from "./founder-form";
import { submitFounderForm } from "./founder-form/api";
import type { FounderFormPayload, FounderFormState } from "./founder-form/types";
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
    void transitionKey
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
    void transitionKey
    setIsVisible(false);

    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

  return (
    <div
      className={cn(
        "min-w-0 transition-all duration-300 ease-out",
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
  onComplete: () => void
}) {
  const [step, setStep] = useState(1)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle')
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FounderFormState>({
    fullName: '',
    workEmail: '',
    password: '',
    workspaceName: '',
    industry: '',
    region: '',
    marketplace: '',
    competitors: ['', '', ''],
    searchIntentKeywords: '',
    customerSegment: '',
    painPoint: '',
    priceRangeMin: 89000,
    priceRangeMax: 159000,
  })

  const updateField = useCallback(
    <T extends keyof FounderFormState>(field: T, value: FounderFormState[T]) => {
      setFormState((current: FounderFormState) => ({
        ...current,
        [field]: value,
      }))
    },
    [],
  )

  const updateCompetitor = useCallback((index: number, value: string) => {
    setFormState((current: FounderFormState) => {
      const nextCompetitors = [...current.competitors]
      nextCompetitors[index] = value
      return { ...current, competitors: nextCompetitors }
    })
  }, [])

  const handleComplete = useCallback(async () => {
    if (submitStatus === 'success') {
      onComplete()
      return
    }

    if (submitStatus === 'submitting') {
      return
    }

    setSubmitStatus('submitting')
    setSubmittedFormId(null)

    const payload: FounderFormPayload = {
      fullName: formState.fullName,
      workEmail: formState.workEmail,
      password: formState.password,
      workspaceName: formState.workspaceName,
      industry: formState.industry,
      region: formState.region,
      marketplace: formState.marketplace,
      competitors: formState.competitors
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      searchIntentKeywords: formState.searchIntentKeywords
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean),
      customerSegment: formState.customerSegment,
      painPoint: formState.painPoint,
      priceRangeMin: formState.priceRangeMin,
      priceRangeMax: formState.priceRangeMax,
    }

    try {
      const response = await submitFounderForm(payload)
      setSubmittedFormId(response.id)
      setSubmitStatus('success')
    } catch (_error) {
      setSubmitStatus('error')
      toast.error('Unable to submit the founder form')
    }
  }, [formState, onComplete, submitStatus])

  const isSignupValid =
    formState.fullName.trim().length > 0 &&
    formState.workEmail.includes('@') &&
    formState.password.trim().length >= 8
  const isAnalysisValid =
    formState.workspaceName.trim().length > 0 &&
    formState.industry.trim().length > 0 &&
    formState.region.trim().length > 0 &&
    formState.marketplace.trim().length > 0
  const isWhiteSpaceValid =
    formState.competitors.some((entry: string) => entry.trim().length > 0) &&
    formState.searchIntentKeywords.trim().length > 0 &&
    formState.customerSegment.trim().length > 0 &&
    formState.painPoint.trim().length > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-10">
        <AnimatedPage className="flex w-full justify-center" transitionKey={step}>
          {step === 1 ? (
            <SignupStep
              onNext={() => setStep(2)}
              fullName={formState.fullName}
              workEmail={formState.workEmail}
              password={formState.password}
              onFullNameChange={(value) => updateField('fullName', value)}
              onWorkEmailChange={(value) => updateField('workEmail', value)}
              onPasswordChange={(value) => updateField('password', value)}
              isNextDisabled={!isSignupValid}
            />
          ) : step === 2 ? (
            <AnalysisStep
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              workspaceName={formState.workspaceName}
              industry={formState.industry}
              region={formState.region}
              marketplace={formState.marketplace}
              onWorkspaceNameChange={(value) =>
                updateField('workspaceName', value)
              }
              onIndustryChange={(value) => updateField('industry', value)}
              onRegionChange={(value) => updateField('region', value)}
              onMarketplaceChange={(value) => updateField('marketplace', value)}
              isNextDisabled={!isAnalysisValid}
            />
          ) : step === 3 ? (
            <WhiteSpaceStep
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              competitors={formState.competitors}
              searchIntentKeywords={formState.searchIntentKeywords}
              customerSegment={formState.customerSegment}
              painPoint={formState.painPoint}
              onCompetitorChange={updateCompetitor}
              onSearchIntentKeywordsChange={(value) =>
                updateField('searchIntentKeywords', value)
              }
              onCustomerSegmentChange={(value) =>
                updateField('customerSegment', value)
              }
              onPainPointChange={(value) => updateField('painPoint', value)}
              isNextDisabled={!isWhiteSpaceValid}
            />
          ) : (
            <GeneratingStep
              onComplete={handleComplete}
              submitStatus={submitStatus}
              formId={submittedFormId}
            />
          )}
        </AnimatedPage>
      </div>
    </main>
  )
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
        {
          label: "AI Recommendation",
          keywords: [
            "ai recommendation",
            "amazon",
            "temu",
            "channel recommendation",
            "best channel",
            "ad placement",
            "sponsored products",
            "coupon feed",
          ],
        },
        {
          label: "Product Opportunity Matrix",
          keywords: [
            "product opportunity",
            "opportunity matrix",
            "tinted sunscreen",
            "acne spot gel",
            "peptide lip treatment",
            "demand index",
            "competitor saturation",
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
          label: "AI Recommendation",
          keywords: [
            "recommendation",
            "channel",
            "advertising",
            "ads",
            "serp",
            "short video",
            "micro segmentation",
            "q4 ad spend",
          ],
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
        {
          label: "Top Rising Formats",
          keywords: [
            "top rising formats",
            "hydrating serum",
            "ceramide barrier",
            "sensitive skin spf",
            "reach",
            "penetration",
          ],
        },
      ],
    },
    {
      section: "persona",
      suggestions: [
        {
          label: "Persona Decode",
          keywords: [
            "persona",
            "customer",
            "audience",
            "segment",
            "profile",
            "market persona",
            "stressed young professional",
            "budget-conscious trend seeker",
            "family care gatekeeper",
          ],
        },
        {
          label: "STP",
          keywords: [
            "stp",
            "segmentation",
            "targeting",
            "positioning",
            "geographic",
            "demographic",
            "psychographic",
            "behavioral",
          ],
        },
        {
          label: "TAM / SAM / SOM",
          keywords: [
            "tam",
            "sam",
            "som",
            "market sizing",
            "total addressable market",
            "serviceable available market",
            "serviceable obtainable market",
          ],
        },
        {
          label: "AI Recommendation",
          keywords: [
            "ai recommendation",
            "main channel",
            "core message",
            "kpi focus",
            "repeat purchase",
            "urban gen z",
          ],
        },
      ],
    },
    {
      section: "competitor",
      suggestions: [
        {
          label: "Competitor Mirror",
          keywords: [
            "competitor",
            "benchmark",
            "mirror",
            "matrix",
            "amazon",
            "temu",
            "cerave",
            "cosrx",
            "the ordinary",
          ],
        },
        {
          label: "AI Recommendation",
          keywords: [
            "ai recommendation",
            "trust gap",
            "amazon",
            "temu",
            "clinical proof",
            "bundle value",
            "export strategy",
          ],
        },
        {
          label: "Key Advantage",
          keywords: [
            "key advantage",
            "proof-led",
            "barrier repair",
            "positioning",
            "clinical proof",
            "bundle value",
          ],
        },
        {
          label: "Pricing Advice",
          keywords: [
            "pricing advice",
            "price",
            "pricing",
            "amazon core sku",
            "starter bundles",
            "under 15",
          ],
        },
        {
          label: "Top Competitor Matrix",
          keywords: [
            "top competitor matrix",
            "competitor matrix",
            "matrix",
            "benchmark grid",
            "hero sku",
            "avg price",
            "promo intensity",
            "monthly sales",
            "rating reviews",
          ],
        },
        {
          label: "Avg Sales Movement",
          keywords: [
            "avg sales movement",
            "sales movement",
            "amazon avg",
            "temu avg",
            "sales chart",
          ],
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
            "amazon",
            "temu",
            "los angeles",
            "dallas",
            "phoenix",
          ],
        },
        {
          label: "Interactive Heatmap",
          keywords: [
            "interactive heatmap",
            "heatmap",
            "demand area",
            "opportunity expansion",
            "sales weighted demand",
            "competitor position",
            "scatter",
          ],
        },
        {
          label: "City Sales Signals",
          keywords: [
            "city sales signals",
            "city sales",
            "sales signals",
            "amazon",
            "temu",
            "los angeles",
            "new york",
            "dallas",
            "phoenix",
          ],
        },
        {
          label: "AI Recommendation",
          keywords: [
            "ai recommendation",
            "los angeles",
            "amazon",
            "temu",
            "dallas",
            "phoenix",
            "sponsored products",
            "creator review",
            "coupon bundles",
          ],
        },
        {
          label: "Amazon GTM",
          keywords: [
            "amazon gtm",
            "gtm",
            "amazon ads",
            "marketplace agency",
            "maya chen",
            "retail media",
          ],
        },
        {
          label: "Temu Expansion",
          keywords: [
            "temu expansion",
            "creator commerce",
            "coupon placement",
            "ethan brooks",
            "marketplace ops",
          ],
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
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const sectionEntries = navItems.map((item) => {
    const title = getSectionTitle(item.id);
    const description = getSectionLabel(item.id);

    return {
      source: "section",
      section: item.id,
      label: title,
      description,
      keywords: [item.label, title, description],
    };
  });
  const suggestionEntries = searchIndex.flatMap((entry) =>
    entry.suggestions.map((suggestion) => ({
      source: "suggestion",
      section: entry.section,
      label: suggestion.label,
      description: undefined,
      keywords: suggestion.keywords,
    }))
  );
  const searchSuggestions = [...sectionEntries, ...suggestionEntries].map(
    (entry) => ({
      ...entry,
      searchText: [entry.label, entry.description, ...entry.keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  );
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

  const handleSearchSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
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
          title="$19"
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
            {["Amazon", "Temu"].map((item, index) => (
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
                "Barrier Repair Serum",
                "Amazon Hero SKU",
                "$18.99",
                "82%",
                "+12.4%",
              ],
              [
                "SPF Moisture Duo",
                "Temu Bundle",
                "$14.50",
                "Low Stock",
                "+28.1%",
              ],
              [
                "Peptide Night Cream",
                "Amazon Premium",
                "$22.00",
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
              ["Los Angeles", 58.2],
              ["New York", 19.4],
              ["Dallas", 12.1],
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

        <DemandPulseRecommendation />

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
            ['"barrier repair serum"', "Commercial", "144K"],
            ['"spf moisturizer sensitive skin"', "Informational", "82K"],
            ['"budget skincare bundle"', "Transactional", "36K"],
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

function DemandPulseRecommendation() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
          <Sparkles className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            AI Recommendation
          </p>
          <h3 className="mt-2 text-lg font-semibold">
            Lead with Amazon intent, amplify with Temu discovery.
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Prioritize Amazon for high-intent conversion because search demand
            is clustering around proof-based skincare terms. Use Sponsored
            Products on "barrier repair serum" and "sensitive skin SPF", then
            test Temu deal placements for bundle discovery and price-sensitive
            trial traffic.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Best Channel
          </p>
          <p className="mt-2 font-semibold">Amazon Search + Sponsored Products</p>
        </div>
        <div className="rounded-lg border bg-muted/25 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ad Placement
          </p>
          <p className="mt-2 font-semibold">Temu in-app bundles + coupon feed</p>
        </div>
      </div>
    </Panel>
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
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm xl:p-4">
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
        {opportunities.map(
          ({ demand, icon: Icon, saturation, tags, title }) => (
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
          )
        )}
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
            <p className="mt-2 text-sm font-semibold">Amazon + Temu</p>
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
      brand: "CeraVe",
      sku: "AM Facial Moisturizing Lotion SPF 30",
      avgPrice: "$16.99",
      priceDelta: "-2.1%",
      promoIntensity: "High",
      promoLevel: "high",
      monthlySales: "45.2K",
      salesDelta: "+5.4%",
      rating: "4.7",
      reviews: "94K",
    },
    {
      brand: "COSRX",
      sku: "Snail Mucin Essence 100ml",
      avgPrice: "$13.80",
      priceDelta: "-0.8%",
      promoIntensity: "Low",
      promoLevel: "low",
      monthlySales: "18.5K",
      salesDelta: "-1.2%",
      rating: "4.6",
      reviews: "72K",
    },
    {
      brand: "The Ordinary",
      sku: "Hyaluronic Acid 2% + B5",
      avgPrice: "$18.50",
      priceDelta: "+5.8%",
      promoIntensity: "Very High",
      promoLevel: "very-high",
      monthlySales: "82.1K",
      salesDelta: "+12.4%",
      rating: "4.5",
      reviews: "118K",
    },
  ];

  const promoBarClasses: Record<string, string> = {
    low: "w-1/4 bg-muted-foreground/50",
    medium: "w-1/2 bg-muted-foreground/70",
    high: "w-3/4 bg-foreground",
    "very-high": "w-5/6 bg-foreground",
  };

  return (
    <div className="grid min-w-0 gap-3">
      <CompetitorAiRecommendation />

      <Panel title="Top Competitor Matrix">
        <div className="grid gap-3 md:hidden">
          {competitorRows.map((row) => (
            <article
              className="min-w-0 rounded-lg border bg-muted/25 p-3"
              key={row.sku}
            >
              <div className="min-w-0">
                <p className="font-semibold">{row.brand}</p>
                <p className="break-words text-xs text-muted-foreground">
                  {row.sku}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Avg Price</p>
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
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Sales</p>
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
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Promo</p>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        promoBarClasses[row.promoLevel] ?? "w-1/2 bg-foreground"
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs">{row.promoIntensity}</p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-semibold">{row.rating}</p>
                  <p className="text-xs text-muted-foreground">{row.reviews}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto rounded-lg border md:block">
          <div className="min-w-[52rem]">
            <div className="grid grid-cols-[1.5fr_0.8fr_0.8fr_0.9fr_0.9fr] border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Brand / Hero SKU</span>
              <span>Avg Price (USD)</span>
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

      <Panel title="Avg Sales Movement">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-foreground" /> You
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-chart-4" /> Amazon Avg
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-destructive" /> Temu Avg
          </span>
        </div>
        <div className="mt-3 h-32 w-full rounded-lg border bg-muted/30 p-3">
          <PriceMovementChart />
        </div>
      </Panel>
    </div>
  );
}

function CompetitorAiRecommendation() {
  const items = [
    {
      label: "Key Advantage",
      value: "Proof-led barrier repair positioning",
      detail:
        "Amazon buyers reward clinical proof, while Temu shoppers respond to visible bundle value.",
    },
    {
      label: "Pricing Advice",
      value: "$18-$22 Amazon core SKU",
      detail:
        "Keep Amazon above commodity pricing, then use Temu under-$15 starter bundles for trial.",
    },
    {
      label: "Positioning",
      value: "Premium efficacy without premium friction",
      detail:
        "Lead with sensitive-skin trust, fast absorption, and clearer ingredient claims.",
    },
  ];

  return (
    <Panel>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI Recommendation
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold">
              Win by owning the trust gap between Amazon and Temu.
            </h3>
            <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
              Competitors are either credible but expensive on Amazon, or cheap
              but low-trust on Temu. Position the product as a clinically clear,
              affordable barrier-repair routine with enough proof for Amazon and
              enough bundle value for Temu.
            </p>
          </div>
        </div>
        <Button className="h-auto w-full shrink-0 justify-center whitespace-normal bg-foreground px-4 py-2 text-center text-background hover:bg-foreground/90 sm:w-auto">
          Export Strategy
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <article
            className="min-w-0 rounded-lg border bg-muted/25 p-3"
            key={item.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 break-words font-semibold">{item.value}</p>
            <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
              {item.detail}
            </p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function LaunchCompass() {
  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Panel
          title="Interactive Heatmap"
          subtitle="Demand area by sales and expansion opportunity by competitor position"
        >
          <LaunchHeatmap />
        </Panel>

        <Panel title="City Sales Signals" subtitle="Amazon and Temu only">
          <LaunchCitySales />
        </Panel>
      </div>

      <LaunchAiRecommendation />
    </div>
  );
}

function LaunchHeatmap() {
  const chartData = [
    {
      city: "Los Angeles",
      channel: "Amazon",
      demand: 92,
      expansion: 74,
      sales: 18400,
    },
    {
      city: "New York",
      channel: "Amazon",
      demand: 88,
      expansion: 62,
      sales: 16100,
    },
    {
      city: "Dallas",
      channel: "Temu",
      demand: 72,
      expansion: 86,
      sales: 12800,
    },
    {
      city: "Phoenix",
      channel: "Temu",
      demand: 64,
      expansion: 91,
      sales: 9600,
    },
    {
      city: "Chicago",
      channel: "Amazon",
      demand: 78,
      expansion: 68,
      sales: 11200,
    },
  ];

  const chartConfig = {
    amazon: { label: "Amazon demand", color: "var(--foreground)" },
    temu: { label: "Temu expansion", color: "var(--chart-5)" },
  };

  return (
    <div className="grid w-full min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="flex min-w-0 flex-wrap gap-2 text-xs">
        <span className="w-full max-w-full break-words rounded-full border bg-muted/30 px-3 py-1 font-medium sm:w-auto">
          Demand Area: sales-weighted demand
        </span>
        <span className="w-full max-w-full break-words rounded-full border bg-chart-5/10 px-3 py-1 font-medium text-chart-5 sm:w-auto">
          Opportunity Expansion: lower competitor pressure
        </span>
      </div>
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <ChartContainer
          className="h-56 w-full min-w-0 max-w-full overflow-hidden sm:h-64"
          config={chartConfig}
          initialDimension={{ height: 224, width: 260 }}
        >
          <ScatterChart margin={{ bottom: 18, left: -14, right: 4, top: 10 }}>
          <CartesianGrid />
          <XAxis
            dataKey="demand"
            ticks={[50, 65, 80, 95]}
            name="Demand"
            tickLine={false}
            axisLine={false}
            label={{
              value: "Demand Area",
              position: "insideBottom",
              offset: -10,
            }}
            type="number"
            domain={[50, 100]}
          />
          <YAxis
            dataKey="expansion"
            ticks={[50, 65, 80, 100]}
            name="Expansion"
            width={30}
            tickLine={false}
            axisLine={false}
            type="number"
            domain={[50, 100]}
          />
          <ZAxis dataKey="sales" range={[90, 420]} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const payload = item.payload as (typeof chartData)[number];

                  if (name === "sales") {
                    return `${Number(value).toLocaleString("en-US")} sales`;
                  }

                  return `${value} - ${payload.city} (${payload.channel})`;
                }}
              />
            }
          />
          <Scatter
            data={chartData.filter((item) => item.channel === "Amazon")}
            dataKey="sales"
            fill="var(--foreground)"
            name="Amazon"
          />
          <Scatter
            data={chartData.filter((item) => item.channel === "Temu")}
            dataKey="sales"
            fill="var(--chart-5)"
            name="Temu"
          />
          </ScatterChart>
        </ChartContainer>
      </div>
    </div>
  );
}

function LaunchCitySales() {
  const rows = [
    {
      city: "Los Angeles",
      amazon: "18.4K",
      temu: "7.2K",
      signal: "Best first city",
    },
    {
      city: "New York",
      amazon: "16.1K",
      temu: "6.8K",
      signal: "High intent",
    },
    {
      city: "Dallas",
      amazon: "9.4K",
      temu: "12.8K",
      signal: "Expansion pocket",
    },
    {
      city: "Phoenix",
      amazon: "6.7K",
      temu: "9.6K",
      signal: "Low competition",
    },
  ];

  return (
    <div className="grid w-full min-w-0 max-w-full gap-3 overflow-x-hidden">
      {rows.map((row) => (
        <div
          className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/25 p-3"
          key={row.city}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words font-semibold">{row.city}</p>
              <p className="text-xs text-muted-foreground">{row.signal}</p>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
              Sales
            </span>
          </div>
          <div className="mt-3 grid w-full min-w-0 max-w-full gap-2 text-sm sm:grid-cols-2">
            <div className="min-w-0 rounded-md border bg-card p-2">
              <p className="text-xs text-muted-foreground">Amazon</p>
              <p className="font-semibold">{row.amazon}</p>
            </div>
            <div className="min-w-0 rounded-md border bg-card p-2">
              <p className="text-xs text-muted-foreground">Temu</p>
              <p className="font-semibold">{row.temu}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LaunchAiRecommendation() {
  return (
    <Panel>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-chart-5/10 text-chart-5">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              AI Recommendation
            </p>
            <h3 className="mt-2 break-words text-xl font-semibold">
              Start in Los Angeles on Amazon, then expand Temu into Dallas and
              Phoenix.
            </h3>
            <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">
              Los Angeles has the strongest Amazon sales density and enough
              competitor distance to validate premium positioning. Use Amazon
              Sponsored Products and creator review seeding first. Once review
              confidence is visible, use Temu coupon bundles in Dallas and
              Phoenix to capture value-sensitive expansion demand.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {[
            [
              "Amazon GTM",
              "Amazon Ads partner or marketplace agency",
              "Maya Chen - Retail media lead, example.amazon@agency.test",
            ],
            [
              "Temu Expansion",
              "Creator-commerce and coupon placement operator",
              "Ethan Brooks - Marketplace ops, example.temu@agency.test",
            ],
          ].map(([title, firm, contact]) => (
            <article className="min-w-0 rounded-lg border bg-muted/25 p-3" key={title}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {title}
              </p>
              <p className="mt-2 break-words font-semibold">{firm}</p>
              <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                {contact}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DataSettings() {
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
        <div className="mb-3 min-w-0">
          <h3 className="break-words font-semibold">{title}</h3>
          {subtitle ? (
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {subtitle}
            </p>
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
    { city: "Los Angeles", x: 31, y: 46, z: 58.2 },
    { city: "New York", x: 62, y: 54, z: 19.4 },
    { city: "Dallas", x: 48, y: 66, z: 12.1 },
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
    { name: "Amazon", value: 61.5, fill: "var(--foreground)" },
    { name: "Temu", value: 38.5, fill: "var(--chart-5)" },
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
          <p className="text-xl font-semibold">62%</p>
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
    somethinc: { label: "Amazon Avg", color: "var(--chart-4)" },
    skintific: { label: "Temu Avg", color: "var(--destructive)" },
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
