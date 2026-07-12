import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "@/services/api/client";
import type {
  ApiKey,
  Organization,
  Session,
  User,
  Workspace,
} from "@/types/api";
import type {
  ApiKeyInput,
  ForgotPasswordInput,
  LoginInput,
  ProfileInput,
  RegisterInput,
} from "@/features/auth/schemas";

export interface AuthPayload {
  user: User;
  token: string;
}

export const authService = {
  login(data: LoginInput) {
    return apiPost<AuthPayload>("/auth/login", data);
  },

  register(data: RegisterInput) {
    return apiPost<AuthPayload>("/auth/register", data);
  },

  logout() {
    return apiPost("/auth/logout");
  },

  forgotPassword(data: ForgotPasswordInput) {
    return apiPost("/auth/forgot-password", data);
  },

  getUser() {
    return apiGet<User>("/auth/user");
  },

  updateProfile(data: ProfileInput) {
    return apiPut<User>("/auth/profile", data);
  },

  getOrganizations() {
    return apiGet<Organization[]>("/organizations");
  },

  getWorkspaces(organizationId: string) {
    return apiGet<Workspace[]>(`/organizations/${organizationId}/workspaces`);
  },

  getApiKeys() {
    return apiGet<ApiKey[]>("/auth/api-keys");
  },

  createApiKey(data: ApiKeyInput) {
    return apiPost<{ api_key: ApiKey; plain_text_token: string }>(
      "/auth/api-keys",
      data
    );
  },

  deleteApiKey(id: string) {
    return apiDelete(`/auth/api-keys/${id}`);
  },

  getSessions() {
    return apiGet<Session[]>("/auth/sessions");
  },

  revokeSession(id: string) {
    return apiDelete(`/auth/sessions/${id}`);
  },
};
