export type DemandPulseTone = "opportunity" | "default" | "danger" | "muted";

export type DemandPulseIntent =
  | "commercial"
  | "informational"
  | "transactional";

export type DemandSupplyPoint = {
  product: string;
  demand: number;
  saturation: number;
};

export type DemandSupplyInsight = {
  label: string;
  formula: string;
  tone: DemandPulseTone;
};

export type MarketplaceShareItem = {
  name: string;
  value: number;
  change: number;
};

export type SearchIntentGroup = {
  tone: DemandPulseIntent;
  label: string;
};

export type SearchIntentKeyword = {
  keyword: string;
  volume: number;
  change: number;
  tone: DemandPulseIntent;
};

export type PriceTierMovementItem = {
  name: string;
  range: string;
  value: number;
  change: number;
  tone: DemandPulseTone;
};

export type ClaimTrendItem = {
  name: string;
  change: number;
  volume: string;
  saturation: string;
};

export type AdvisorSignal = {
  detail?: string;
  icon?: "down" | "target" | "trend" | "up";
  label: string;
  tone?: "negative" | "neutral" | "positive";
  value: string;
};

export type DemandPulseData = {
  demandSupply: {
    points: DemandSupplyPoint[];
    insights: DemandSupplyInsight[];
  };
  marketplaceShare: MarketplaceShareItem[];
  searchIntent: {
    groups: SearchIntentGroup[];
    keywords: SearchIntentKeyword[];
  };
  priceTierMovement: PriceTierMovementItem[];
  claimTrends: {
    rising: ClaimTrendItem[];
    falling: ClaimTrendItem[];
  };
  advisor: {
    recommendation: string;
    signals: AdvisorSignal[];
  };
};

export const demandPulseFixture = {
  demandSupply: {
    points: [
      { product: "Tinted SPF", demand: 92, saturation: 28 },
      { product: "Acne Gel", demand: 88, saturation: 55 },
      { product: "Peptide Lip", demand: 85, saturation: 32 },
    ],
    insights: [
      {
        label: "Strong opportunity",
        formula: "High demand + low saturation",
        tone: "opportunity",
      },
      {
        label: "Crowded market",
        formula: "High demand + high saturation",
        tone: "danger",
      },
      {
        label: "Unproven",
        formula: "Low demand + low saturation",
        tone: "muted",
      },
    ],
  },
  marketplaceShare: [
    { name: "Amazon", value: 34.6, change: 2.1 },
    { name: "Temu", value: 22.4, change: -1.4 },
    { name: "TikTok Shop", value: 15.1, change: 3.6 },
    { name: "Shopee", value: 12.2, change: 0.8 },
    { name: "Walmart", value: 9.4, change: -0.7 },
    { name: "eBay", value: 6.3, change: -0.2 },
  ],
  searchIntent: {
    groups: [
      { tone: "commercial", label: "Commercial" },
      { tone: "informational", label: "Informational" },
      { tone: "transactional", label: "Transactional" },
    ],
    keywords: [
      {
        keyword: "barrier repair serum",
        volume: 144,
        change: 12,
        tone: "commercial",
      },
      {
        keyword: "spf moisturizer sensitive skin",
        volume: 82,
        change: 8,
        tone: "informational",
      },
      {
        keyword: "budget skincare bundle",
        volume: 36,
        change: -3,
        tone: "transactional",
      },
      {
        keyword: "peptide eye cream",
        volume: 64,
        change: 19,
        tone: "commercial",
      },
      {
        keyword: "niacinamide vs vitamin c",
        volume: 58,
        change: 5,
        tone: "informational",
      },
      {
        keyword: "korean glass skin routine",
        volume: 47,
        change: 22,
        tone: "informational",
      },
      {
        keyword: "centella spot treatment",
        volume: 29,
        change: 14,
        tone: "transactional",
      },
    ],
  },
  priceTierMovement: [
    {
      name: "Budget",
      range: "$0–$10",
      value: 12,
      change: -4,
      tone: "default",
    },
    {
      name: "Mid",
      range: "$10–$25",
      value: 47,
      change: 18,
      tone: "opportunity",
    },
    {
      name: "Premium",
      range: "$25–$50",
      value: 28,
      change: -6,
      tone: "default",
    },
    {
      name: "Luxury",
      range: "$50+",
      value: 13,
      change: 3,
      tone: "default",
    },
  ],
  claimTrends: {
    rising: [
      {
        name: "Microbiome-friendly",
        change: 127,
        volume: "24K",
        saturation: "Very low",
      },
      {
        name: "Barrier repair",
        change: 42,
        volume: "89K",
        saturation: "Low",
      },
      {
        name: "Skin barrier",
        change: 38,
        volume: "67K",
        saturation: "Medium",
      },
    ],
    falling: [
      {
        name: "Paraben-free",
        change: -34,
        volume: "112K",
        saturation: "Very high",
      },
      {
        name: "Anti-aging",
        change: -18,
        volume: "204K",
        saturation: "High",
      },
    ],
  },
  advisor: {
    recommendation:
      "Lead with Amazon for high-intent capture, then amplify on TikTok Shop where discovery growth is fastest. Anchor creative on barrier-repair claims; a +42% rise against low saturation is a clean window. Bid on commercial-intent keywords and skip paraben-free and anti-aging copy because they are saturated and falling.",
    signals: [
      {
        detail: "34.6% share · +2.1%",
        icon: "up",
        label: "Primary channel",
        tone: "positive",
        value: "Amazon",
      },
      {
        detail: "+3.6% fastest growing",
        icon: "trend",
        label: "Amplify channel",
        tone: "positive",
        value: "TikTok Shop",
      },
      {
        detail: "64K + 144K commercial vol",
        icon: "target",
        label: "Ad format",
        tone: "neutral",
        value: "Sponsored Products",
      },
      {
        detail: "+42% · 89K vol · low sat",
        icon: "up",
        label: "Creative hook",
        tone: "positive",
        value: "Barrier repair",
      },
      {
        detail: "144K vol · +12%",
        icon: "up",
        label: "Keyword focus",
        tone: "positive",
        value: "barrier repair serum",
      },
      {
        detail: "−34% / −18% · saturated",
        icon: "down",
        label: "Claims to avoid",
        tone: "negative",
        value: "Paraben-free, anti-aging",
      },
    ],
  },
} satisfies DemandPulseData;

type DemandPulseDataInput = {
  demandSupply?: Partial<DemandPulseData["demandSupply"]>;
  marketplaceShare?: DemandPulseData["marketplaceShare"];
  searchIntent?: Partial<DemandPulseData["searchIntent"]>;
  priceTierMovement?: DemandPulseData["priceTierMovement"];
  claimTrends?: Partial<DemandPulseData["claimTrends"]>;
  advisor?: Partial<DemandPulseData["advisor"]>;
};

export function normalizeDemandPulseData(
  input?: DemandPulseDataInput | null,
): DemandPulseData {
  return {
    demandSupply: {
      points: input?.demandSupply?.points ?? demandPulseFixture.demandSupply.points,
      insights:
        input?.demandSupply?.insights ?? demandPulseFixture.demandSupply.insights,
    },
    marketplaceShare: input?.marketplaceShare ?? demandPulseFixture.marketplaceShare,
    searchIntent: {
      groups: input?.searchIntent?.groups ?? demandPulseFixture.searchIntent.groups,
      keywords:
        input?.searchIntent?.keywords ?? demandPulseFixture.searchIntent.keywords,
    },
    priceTierMovement:
      input?.priceTierMovement ?? demandPulseFixture.priceTierMovement,
    claimTrends: {
      rising: input?.claimTrends?.rising ?? demandPulseFixture.claimTrends.rising,
      falling:
        input?.claimTrends?.falling ?? demandPulseFixture.claimTrends.falling,
    },
    advisor: {
      recommendation:
        input?.advisor?.recommendation ?? demandPulseFixture.advisor.recommendation,
      signals: input?.advisor?.signals ?? demandPulseFixture.advisor.signals,
    },
  };
}
