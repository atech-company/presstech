"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setUser, logout: clearAuth } = useAuthStore();
  const { setOrganizations, setWorkspaces, setCurrentOrganization, setCurrentWorkspace } =
    useWorkspaceStore();

  const loginMutation = useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: async (res) => {
      setUser(res.data.user);
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();

      try {
        await loadWorkspaces();
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
    onSuccess: (res) => {
      setUser(res.data.user);
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

  async function loadWorkspaces() {
    const orgsRes = await authService.getOrganizations();
    setOrganizations(orgsRes.data);
    if (orgsRes.data.length > 0) {
      const org = orgsRes.data[0];
      setCurrentOrganization(org);
      const wsRes = await authService.getWorkspaces(org.id);
      setWorkspaces(wsRes.data);
      if (wsRes.data.length > 0) setCurrentWorkspace(wsRes.data[0]);
    }
  }

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
