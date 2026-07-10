import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workflowService } from "@/features/workflows/services/workflow-service";
import { useWorkspaceStore } from "@/store/workspace-store";

export function useWorkflows() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  return useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: () => workflowService.list(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => workflowService.get(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workflowService.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof workflowService.update>[1]) =>
      workflowService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflows", id] });
    },
  });
}

export function useRunWorkflow() {
  return useMutation({
    mutationFn: ({ id, variables }: { id: string; variables?: Record<string, unknown> }) =>
      workflowService.run(id, variables),
  });
}
