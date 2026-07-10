"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { botService } from "@/features/bots/services/bot-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import type { Bot } from "@/types/api/bots";
import { ApiClientError } from "@/services/api/client";

export function useBots(params?: { status?: string; search?: string }) {
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bots", currentWorkspace?.id, params],
    queryFn: () => botService.list(currentWorkspace!.id, params),
    enabled: !!currentWorkspace,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Bot> & { name: string }) =>
      botService.create({ ...data, workspace_id: currentWorkspace!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success("Bot created");
    },
    onError: (err: ApiClientError) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bot> }) =>
      botService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success("Bot updated");
    },
    onError: (err: ApiClientError) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => botService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success("Bot deleted");
    },
    onError: (err: ApiClientError) => toast.error(err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => botService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success("Bot archived");
    },
    onError: (err: ApiClientError) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => botService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      toast.success("Bot duplicated");
    },
    onError: (err: ApiClientError) => toast.error(err.message),
  });

  return {
    bots: query.data?.data ?? [],
    isLoading: query.isLoading,
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    archive: archiveMutation,
    duplicate: duplicateMutation,
  };
}

export function useBot(id: string) {
  return useQuery({
    queryKey: ["bots", id],
    queryFn: () => botService.get(id),
    enabled: !!id,
  });
}
