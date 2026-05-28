import { type DashboardSection, navItems } from "../constants";
import { getSectionLabel, getSectionTitle } from "./dashboard-copy";

export const searchIndex: Array<{
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
];

export const searchSuggestions = [
  ...navItems.map((item) => {
    const title = getSectionTitle(item.id);
    const description = getSectionLabel(item.id);

    return {
      source: "section",
      section: item.id,
      label: title,
      description,
      keywords: [item.label, title, description],
    };
  }),
  ...searchIndex.flatMap((entry) =>
    entry.suggestions.map((suggestion) => ({
      source: "suggestion",
      section: entry.section,
      label: suggestion.label,
      description: undefined,
      keywords: suggestion.keywords,
    }))
  ),
].map((entry) => ({
  ...entry,
  searchText: [entry.label, entry.description, ...entry.keywords]
    .filter(Boolean)
    .join(" ")
    .toLowerCase(),
}));
