import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "@/services/api/client";
import type { KnowledgeSource } from "@/types/api/knowledge";

export const knowledgeService = {
  list(workspaceId: string, botId?: string) {
    const params = new URLSearchParams({ workspace_id: workspaceId });
    if (botId) params.set("bot_id", botId);
    return apiGet<KnowledgeSource[]>(`/knowledge?${params}`);
  },

  get(id: string) {
    return apiGet<KnowledgeSource>(`/knowledge/${id}`);
  },

  create(formData: FormData) {
    return apiPost<KnowledgeSource>("/knowledge", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  update(id: string, data: Partial<KnowledgeSource>) {
    return apiPatch<KnowledgeSource>(`/knowledge/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/knowledge/${id}`);
  },

  async recrawl(id: string) {
    try {
      return await apiPost<KnowledgeSource>(`/knowledge/${id}/recrawl`, {});
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        return apiPatch<KnowledgeSource>(`/knowledge/${id}`, { recrawl: true });
      }
      throw err;
    }
  },

  reprocess(id: string) {
    return apiPost<KnowledgeSource>(`/knowledge/${id}/reprocess`, {});
  },
};
