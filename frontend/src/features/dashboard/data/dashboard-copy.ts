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
