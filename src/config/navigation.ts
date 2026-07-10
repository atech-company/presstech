import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  CreditCard,
  Database,
  GitBranch,
  LayoutDashboard,
  Library,
  Plug,
  Settings,
  Store,
  BookOpen,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Bots", href: "/bots", icon: Bot },
  { title: "Knowledge", href: "/knowledge", icon: BookOpen },
  { title: "Workflows", href: "/workflows", icon: GitBranch },
  { title: "Tables", href: "/tables", icon: Database },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Marketplace", href: "/marketplace", icon: Store },
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const settingsNavItems: NavItem[] = [
  { title: "Profile", href: "/settings/profile", icon: Settings },
  { title: "API Keys", href: "/settings/api-keys", icon: Library },
  { title: "Sessions", href: "/settings/sessions", icon: Settings },
  { title: "Team", href: "/settings/team", icon: Settings },
];
