import { nanoid } from "nanoid";
import type { MessageType } from "../types";

// isinya masih dummy data semua
export const initialSources = [
  {
    href: "https://example.com/consumeriq/review-drivers",
    title: "ConsumerIQ review driver index",
  },
  {
    href: "https://example.com/consumeriq/social-sentiment",
    title: "Social sentiment pulse",
  },
  {
    href: "https://example.com/consumeriq/category-benchmarks",
    title: "Premium snack category benchmarks",
  },
];

export const initialMessages: MessageType[] = [
  {
    from: "user",
    key: nanoid(),
    versions: [
      {
        content: "Compare consumer sentiment across premium snack brands.",
        id: nanoid(),
      },
    ],
  },
  {
    from: "assistant",
    key: nanoid(),
    sources: initialSources.slice(0, 2),
    versions: [
      {
        content: `## Premium Snack Sentiment

ConsumerIQ is seeing three useful gaps across the premium snack set:

1. **Flavor curiosity is rising**, especially around sweet-salty profiles.
2. **Texture complaints are more predictive than price complaints** for repeat purchase risk.
3. **Ingredient transparency is now a trust signal**, not just a health-positioning claim.

The strongest opportunity is a concise product story that connects texture, clean ingredients, and a clear flavor promise.`,
        id: nanoid(),
      },
    ],
  },
  {
    from: "user",
    key: nanoid(),
    versions: [
      {
        content: "Find the strongest negative review drivers this quarter.",
        id: nanoid(),
      },
      {
        content: "Rank the review themes most likely to suppress repeat buys.",
        id: nanoid(),
      },
      {
        content: "Which complaints should the insights team escalate first?",
        id: nanoid(),
      },
    ],
  },
  {
    from: "assistant",
    key: nanoid(),
    reasoning: {
      content:
        "I grouped recent reviews by complaint theme, weighted them by purchase intent language, then compared the themes against competitor mentions to find the issues most likely to affect retention.",
      duration: 8,
    },
    versions: [
      {
        content: `## Negative Driver Priority

- **Stale or inconsistent texture** is the highest-risk theme because it appears in reviews that also mention switching brands.
- **Small pack size versus price** is the second priority, but it is often softened when consumers believe the ingredient quality is premium.
- **Unclear flavor naming** creates trial friction for new buyers, especially when seasonal flavors are described with broad claims.

Recommended next step: brief product and merchandising teams on texture consistency first, then test clearer shelf copy for flavor expectations.`,
        id: nanoid(),
      },
    ],
  },
];

export const suggestions = [
  "Find negative review drivers",
  "Summarize premium snack gaps",
  "Compare Gen Z sentiment",
  "Draft shopper insight brief",
  "Identify emerging flavors",
  "Rank competitor pain points",
];

export const mockResponses = [
  `## Review Theme Snapshot

The highest-signal theme is texture reliability. Positive reviews describe "crisp", "fresh", and "substantial"; negative reviews cluster around "crumbly", "stale", and "thin". That makes texture the clearest operational lever before changing price or pack architecture.`,
  `## Opportunity Readout

Premium buyers are rewarding brands that make flavor expectations obvious. The best near-term move is to pair adventurous flavors with plain-language descriptors so shoppers know whether the product is sweet, savory, spicy, or balanced before trial.`,
  `## Segment Takeaway

Gen Z sentiment over-indexes on novelty and shareability, but repeat intent still depends on value cues. The winning message is not just "new flavor"; it is "worth buying again because the texture and ingredient story hold up."`,
  `## Competitive Risk

Competitor pain points are concentrated in unclear claims, inconsistent crunch, and pack-size frustration. A product page or retail shelf story that handles those three issues directly should improve confidence at the moment of comparison.`,
];
