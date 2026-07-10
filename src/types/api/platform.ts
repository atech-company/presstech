export interface AnalyticsSummary {
  conversations: number;
  messages: number;
  active_bots: number;
  knowledge_sources: number;
  workflow_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  tokens: number;
  cost: number;
}

export interface Conversation {
  id: string;
  bot_id: string;
  workspace_id: string;
  status: string;
  created_at: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  features: string[];
}

export interface BillingInfo {
  current_plan: {
    id?: string;
    name: string;
    slug?: string;
    status: string;
    current_period_end?: string | null;
  };
  plans: Plan[];
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  category: string | null;
  install_count: number;
  is_featured: boolean;
}
