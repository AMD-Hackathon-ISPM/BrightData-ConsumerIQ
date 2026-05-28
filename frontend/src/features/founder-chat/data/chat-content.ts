import type { MessageType } from "../types";

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

export const initialMessages: MessageType[] = [];

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
