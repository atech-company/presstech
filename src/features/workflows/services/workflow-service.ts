import { apiDelete, apiGet, apiPatch, apiPost } from "@/services/api/client";
import type { Workflow, WorkflowExecution, WorkflowGraph } from "@/types/api/workflows";

export const workflowService = {
  list(workspaceId: string) {
    return apiGet<Workflow[]>(`/workflows?workspace_id=${workspaceId}`);
  },

  get(id: string) {
    return apiGet<Workflow>(`/workflows/${id}`);
  },

  create(data: {
    workspace_id: string;
    name: string;
    description?: string;
    bot_id?: string;
    graph?: WorkflowGraph;
  }) {
    return apiPost<Workflow>("/workflows", data);
  },

  update(id: string, data: Partial<Workflow> & { graph?: WorkflowGraph }) {
    return apiPatch<Workflow>(`/workflows/${id}`, data);
  },

  delete(id: string) {
    return apiDelete(`/workflows/${id}`);
  },

  publish(id: string) {
    return apiPost<Workflow>(`/workflows/${id}/publish`);
  },

  run(id: string, variables?: Record<string, unknown>) {
    return apiPost<{ execution_id: string; status: string }>(`/workflows/${id}/run`, { variables });
  },

  executions(id: string) {
    return apiGet<WorkflowExecution[]>(`/workflows/${id}/executions`);
  },
};
