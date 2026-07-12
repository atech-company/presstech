import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/client";
import type {
  Integration,
  IntegrationCatalogItem,
  IntegrationTestResult,
  WasenderSession,
  WhatsAppSetupResponse,
  WhatsAppStatusResponse,
} from "@/types/api/integrations";

export const integrationService = {
  catalog() {
    return apiGet<IntegrationCatalogItem[]>("/integrations/catalog");
  },

  list(workspaceId: string) {
    return apiGet<Integration[]>(`/integrations?workspace_id=${workspaceId}`);
  },

  get(id: string) {
    return apiGet<Integration>(`/integrations/${id}`);
  },

  create(data: {
    workspace_id: string;
    type: string;
    name: string;
    config?: Record<string, unknown>;
    credentials?: string;
  }) {
    return apiPost<Integration>("/integrations", data);
  },

  update(id: string, data: Partial<Integration> & { credentials?: string; config?: Record<string, unknown> }) {
    return apiPatch<Integration>(`/integrations/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/integrations/${id}`);
  },

  test(id: string) {
    return apiPost<IntegrationTestResult>(`/integrations/${id}/test`, {});
  },

  whatsappSessions(id: string, personalAccessToken?: string) {
    const params = personalAccessToken
      ? `?personal_access_token=${encodeURIComponent(personalAccessToken)}`
      : "";
    return apiGet<WasenderSession[]>(`/integrations/${id}/whatsapp/sessions${params}`);
  },

  whatsappSetup(
    id: string,
    data?: { personal_access_token?: string; wasender_session_id?: string; bot_id?: string }
  ) {
    return apiPost<WhatsAppSetupResponse>(`/integrations/${id}/whatsapp/setup`, data ?? {});
  },

  whatsappSync(id: string) {
    return apiPost<WhatsAppStatusResponse>(`/integrations/${id}/whatsapp/sync`, {});
  },

  whatsappConnect(id: string, data?: { personal_access_token?: string; wasender_session_id?: string }) {
    return apiPost<Record<string, unknown>>(`/integrations/${id}/whatsapp/connect`, data ?? {});
  },

  whatsappStatus(id: string) {
    return apiGet<WhatsAppStatusResponse>(`/integrations/${id}/whatsapp/status`);
  },
};
