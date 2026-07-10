import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/services/api/client";
import type { TableDefinition, TableRow } from "@/types/api/tables";

export const tableService = {
  list(workspaceId: string) {
    return apiGet<TableDefinition[]>(`/tables?workspace_id=${workspaceId}`);
  },

  get(id: string) {
    return apiGet<TableDefinition>(`/tables/${id}`);
  },

  create(data: {
    workspace_id: string;
    name: string;
    description?: string;
    fields?: Array<{ name: string; type: string; required?: boolean; options?: Record<string, unknown> }>;
  }) {
    return apiPost<TableDefinition>("/tables", data);
  },

  update(id: string, data: Partial<TableDefinition>) {
    return apiPatch<TableDefinition>(`/tables/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/tables/${id}`);
  },

  createRow(tableId: string, data: Record<string, unknown>) {
    return apiPost<TableRow>(`/tables/${tableId}/rows`, { data });
  },

  updateRow(tableId: string, rowId: string, data: Record<string, unknown>) {
    return apiPut<TableRow>(`/tables/${tableId}/rows/${rowId}`, { data });
  },

  deleteRow(tableId: string, rowId: string) {
    return apiDelete(`/tables/${tableId}/rows/${rowId}`);
  },
};
