"use client";

import { useCallback, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authService } from "@/features/auth/services/auth-service";
import type {
  ForgotPasswordInput,
  LoginInput,
  ProfileInput,
  RegisterInput,
} from "@/features/auth/schemas";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ApiClientError } from "@/services/api/client";

async function refreshWorkspaces() {
  const {
    setOrganizations,
    setWorkspaces,
    setCurrentOrganization,
    setCurrentWorkspace,
  } = useWorkspaceStore.getState();

  const orgsRes = await authService.getOrganizations();
  setOrganizations(orgsRes.data);

  if (orgsRes.data.length === 0) {
    setCurrentOrganization(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    return;
  }

  const org = orgsRes.data[0];
  setCurrentOrganization(org);

  const wsRes = await authService.getWorkspaces(org.id);
  setWorkspaces(wsRes.data);

  if (wsRes.data.length === 0) {
    setCurrentWorkspace(null);
    return;
  }

  const persistedId = useWorkspaceStore.getState().currentWorkspace?.id;
  const stillValid = persistedId
    ? wsRes.data.find((ws) => ws.id === persistedId)
    : undefined;

  setCurrentWorkspace(stillValid ?? wsRes.data[0]);
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth, setUser, logout: clearAuth } = useAuthStore();
  const clearWorkspaceState = useWorkspaceStore((s) => s.clearWorkspaceState);

  const loadWorkspaces = useCallback(() => refreshWorkspaces(), []);

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: async (res) => {
      setAuth(res.data.user, res.data.token);
      clearWorkspaceState();
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();

      try {
        await refreshWorkspaces();
      } catch {
        // Session is valid; workspace data can load on the dashboard
      }
    },
    onError: (err: ApiClientError) => {
      const fieldMsg = err.errors?.email?.[0] ?? err.errors?.password?.[0];
      toast.error(fieldMsg ?? err.message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: async (res) => {
      setAuth(res.data.user, res.data.token);
      clearWorkspaceState();
      try {
        await refreshWorkspaces();
      } catch {
        // Workspace can load after email verification
      }
      toast.success("Account created! Please verify your email.");
      router.push("/verify-email");
    },
    onError: (err: ApiClientError) => {
      toast.error(err.message);
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordInput) => authService.forgotPassword(data),
    onSuccess: () => {
      toast.success("Password reset link sent to your email.");
    },
    onError: (err: ApiClientError) => {
      toast.error(err.message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearAuth();
      clearWorkspaceState();
      queryClient.clear();
      router.push("/login");
    },
    onError: () => {
      clearAuth();
      clearWorkspaceState();
      queryClient.clear();
      router.push("/login");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileInput) => authService.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data);
      toast.success("Profile updated");
    },
    onError: (err: ApiClientError) => {
      toast.error(err.message);
    },
  });

  const userQuery = useQuery({
    queryKey: ["auth", "user"],
    queryFn: () => authService.getUser(),
    enabled: isAuthenticated && !user,
    retry: false,
  });

  return {
    user,
    isAuthenticated,
    login: loginMutation,
    register: registerMutation,
    forgotPassword: forgotPasswordMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
    loadWorkspaces,
    userQuery,
  };
}
