import { useEffect, useState } from "react";
import { getAuthToken } from "@/lib/auth";
import type { DemandPulseData } from "./data/demand-pulse";

export type MarketOverviewData = {
  trendVelocity: string;
  trendVelocityStatus: string;
  estimatedDemand: string;
  priceTarget: string;
  marketGaps: number;
  topSkus: Array<{
    name: string;
    tag: string;
    price: string;
    stock: string;
    momentum: string;
  }>;
  regionDemand: Array<{ city: string; percentage: number }>;
};

export type CompetitorMirrorData = {
  competitors: Array<{
    brand: string;
    sku: string;
    avgPrice: string;
    priceDelta: string;
    promoIntensity: string;
    promoLevel: "low" | "medium" | "high" | "very-high";
    monthlySales: string;
    salesDelta: string;
    rating: string;
    reviews: string;
  }>;
  pricingTiers: Array<{
    label: string;
    note: string;
    demand: string;
    percentage: number;
    type: "saturated" | "sweet-spot" | "premium";
  }>;
  advisorRecommendation: string;
  advisorSignals: Array<{ label: string; value: string }>;
};

export type LaunchCompassData = {
  seasonality: Array<{
    id: string;
    month: string;
    index: number;
    status: "peak" | "normal" | "avoid";
  }>;
  citySales: Array<{
    city: string;
    sales: string;
    growth: string;
    channels: string;
    rating: string;
    searchDemand: string;
    personaFit: string;
    gdpPerCapita: string;
    signal: string;
  }>;
  advisorRecommendation: string;
  advisorSignals: Array<{ label: string; value: string }>;
};

export type DashboardData = {
  marketOverview?: MarketOverviewData;
  demandPulse?: DemandPulseData;
  competitorMirror?: CompetitorMirrorData;
  launchCompass?: LaunchCompassData;
};

export type InsightsResponse = {
  status: string;
  category: string;
  country: string;
  gtmIntelligence?: Record<string, unknown>;
  financeIntelligence?: Record<string, unknown>;
  securityCompliance?: Record<string, unknown>;
  extraAnalysis?: { dashboardData?: DashboardData } | null;
  lastUpdated?: string | null;
};

const INSIGHTS_CACHE_KEY = "ciq_insights_data";
const INSIGHTS_CACHE_TTL_MS = 30 * 60 * 1000;

function readCache(): InsightsResponse | null {
  try {
    const raw = localStorage.getItem(INSIGHTS_CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > INSIGHTS_CACHE_TTL_MS) return null;
    return data as InsightsResponse;
  } catch {
    return null;
  }
}

function writeCache(data: InsightsResponse) {
  try {
    localStorage.setItem(
      INSIGHTS_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {}
}

export function clearInsightsCache() {
  try {
    localStorage.removeItem(INSIGHTS_CACHE_KEY);
  } catch {}
}

async function fetchInsights(): Promise<InsightsResponse | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const res = await fetch("/api/insights/me", { headers });
    if (!res.ok) return null;
    return res.json() as Promise<InsightsResponse>;
  } catch {
    return null;
  }
}

function hasDashboardContent(r: InsightsResponse | null): boolean {
  const d = r?.extraAnalysis?.dashboardData;
  if (!d || typeof d !== "object") return false;
  return Boolean(
    (d as DashboardData).marketOverview ||
    (d as DashboardData).demandPulse ||
    (d as DashboardData).competitorMirror ||
    (d as DashboardData).launchCompass,
  );
}

export function useInsights() {
  const [data, setData] = useState<InsightsResponse | null>(() => readCache());
  const [loading, setLoading] = useState(!hasDashboardContent(readCache()));

  useEffect(() => {
    if (hasDashboardContent(readCache())) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        const result = await fetchInsights();
        if (cancelled) return;
        if (result) setData(result);
        if (result && result.status === "completed" && hasDashboardContent(result)) {
          writeCache(result);
          setLoading(false);
          return;
        }
        await new Promise<void>((r) => setTimeout(r, 3000));
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const dashboardData = hasDashboardContent(data) ? data!.extraAnalysis!.dashboardData! : null;
  return { insights: data, dashboardData, loading };
}
