import {
  BarChart3,
  Compass,
  Database,
  FileText,
  Globe2,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export const navGroups = [
  [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  [
    { id: "persona", label: "Persona Decode", icon: Users },
    { id: "compass", label: "Launch Compass", icon: Compass },
    { id: "pulse", label: "Demand Pulse", icon: TrendingUp },
    { id: "competitor", label: "Competitor Mirror", icon: Target },
    { id: "settings", label: "Settings", icon: Settings },
  ],
] as const;

export const navItems = navGroups.flat();

export const pipelineSteps = [
  { label: "Marketplaces", icon: Globe2, caption: "External Source" },
  { label: "Web Unlocker", icon: ShieldCheck, caption: "Anti Bot Bypass" },
  { label: "Parsers", icon: FileText, caption: "Schema Mapping" },
  { label: "Data Lake", icon: Database, caption: "Caches & Diffs" },
  { label: "Frontend", icon: BarChart3, caption: "Presentation" },
] as const;

export type DashboardSection = (typeof navItems)[number]["id"];
