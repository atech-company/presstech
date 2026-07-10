import { apiDelete, apiGet, apiPost } from "@/services/api/client";
import type { AnalyticsSummary, BillingInfo, Conversation, MarketplaceTemplate, Message } from "@/types/api/platform";

export const analyticsService = {
  summary(workspaceId?: string) {
    const q = workspaceId ? `?workspace_id=${workspaceId}` : "";
    return apiGet<AnalyticsSummary>(`/analytics${q}`);
  },

  bot(botId: string) {
    return apiGet<{ conversations: number; messages: number; success_rate: number }>(
      `/analytics/bots/${botId}`
    );
  },
};

export const conversationService = {
  list(botId: string) {
    return apiGet<Conversation[]>(`/bots/${botId}/conversations`);
  },

  create(botId: string) {
    return apiPost<Conversation>(`/bots/${botId}/conversations`);
  },

  get(id: string) {
    return apiGet<Conversation>(`/conversations/${id}`);
  },

  sendMessage(conversationId: string, content: string) {
    return apiPost<{ user_message: Message; assistant_message: Message }>(
      `/conversations/${conversationId}/messages`,
      { content }
    );
  },
};

export const billingService = {
  get() {
    return apiGet<BillingInfo>("/billing");
  },

  checkout(planId: string) {
    return apiPost<{ redirect_url: string | null }>("/billing/checkout", { plan_id: planId });
  },
};

export const marketplaceService = {
  list(params?: { type?: string; category?: string }) {
    const q = new URLSearchParams(params as Record<string, string>);
    return apiGet<MarketplaceTemplate[]>(`/marketplace?${q}`);
  },

  install(templateId: string, workspaceId: string) {
    return apiPost<{ bot_id?: string; workflow_id?: string }>(
      `/marketplace/${templateId}/install`,
      { workspace_id: workspaceId }
    );
  },
};

export const workspaceService = {
  create(data: { organization_id: string; name: string; description?: string }) {
    return apiPost("/workspaces", data);
  },

  inviteMember(workspaceId: string, data: { email: string; role: string }) {
    return apiPost(`/workspaces/${workspaceId}/team`, data);
  },

  removeMember(workspaceId: string, userId: string) {
    return apiDelete(`/workspaces/${workspaceId}/team/${userId}`);
  },
};
