import type { DashboardSection } from "../constants";

export function getSectionTitle(section: DashboardSection) {
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

export function getSectionLabel(section: DashboardSection) {
  switch (section) {
    case "dashboard":
      return "Market data control center with Trend Velocity, Estimated Demand, and Market Gaps metrics.";
    case "pulse":
      return "Real-time analysis of trend movements and consumer search signals (SERP data).";
    case "persona":
      return "In-depth segmentation and buyer behavior mapping based on review extraction.";
    case "competitor":
      return "Monitor relative performance, pricing, and Share of Voice against competitors.";
    case "compass":
      return "Optimal launch strategy with data-driven Go-to-Market recommendations.";
    case "settings":
      return "Technical transparency for Bright Data infrastructure (Web Unlocker, Scraper API, etc.).";
  }
}
