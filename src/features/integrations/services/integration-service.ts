import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { Integration, IntegrationCatalogItem } from "@/types/api/integrations";

export const integrationService = {
  catalog() {
    return apiGet<IntegrationCatalogItem[]>("/integrations/catalog");
  },

  list(workspaceId: string) {
    return apiGet<Integration[]>(`/integrations?workspace_id=${workspaceId}`);
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

  update(id: string, data: Partial<Integration> & { credentials?: string }) {
    return apiPatch<Integration>(`/integrations/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/integrations/${id}`);
  },
};
