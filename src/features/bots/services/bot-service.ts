import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { Bot } from "@/types/api/bots";

export const botService = {
  list(workspaceId: string, params?: { status?: string; search?: string }) {
    const query = new URLSearchParams({ workspace_id: workspaceId, ...params });
    return apiGet<Bot[]>(`/bots?${query}`);
  },

  get(id: string) {
    return apiGet<Bot>(`/bots/${id}`);
  },

  create(data: Partial<Bot> & { workspace_id: string; name: string }) {
    return apiPost<Bot>("/bots", data);
  },

  update(id: string, data: Partial<Bot>) {
    return apiPatch<Bot>(`/bots/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/bots/${id}`);
  },

  archive(id: string) {
    return apiPost<Bot>(`/bots/${id}/archive`);
  },

  duplicate(id: string) {
    return apiPost<Bot>(`/bots/${id}/duplicate`);
  },
};
