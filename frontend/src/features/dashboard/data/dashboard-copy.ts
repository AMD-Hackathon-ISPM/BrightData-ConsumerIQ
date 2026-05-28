import type { DashboardSection } from "../constants";

export function getSectionTitle(section: DashboardSection) {
  switch (section) {
    case "dashboard":
      return "Dashboard";
    case "pulse":
      return "Demand Pulse";
    case "persona":
      return "Persona Decode";
    case "competitor":
      return "Competitor Mirror";
    case "compass":
      return "Launch Compass";
  }
}

export function getSectionLabel(section: DashboardSection) {
  switch (section) {
    case "dashboard":
      return "Live market opportunity overview — demand, competition, pricing, and category whitespace at a glance.";
    case "pulse":
      return "Real-time analysis of trend movements and consumer search signals (SERP data).";
    case "persona":
      return "In-depth segmentation and buyer behavior mapping based on review extraction.";
    case "competitor":
      return "Monitor relative performance, pricing, and Share of Voice against competitors.";
    case "compass":
      return "Optimal launch strategy with data-driven Go-to-Market recommendations.";
  }
}
