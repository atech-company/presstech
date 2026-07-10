import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  getCsrfCookie,
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

export const authService = {
  async login(data: LoginInput) {
    await getCsrfCookie();
    return apiPost<{ user: User }>("/auth/login", data);
  },

  async register(data: RegisterInput) {
    await getCsrfCookie();
    return apiPost<{ user: User }>("/auth/register", data);
  },

  async logout() {
    return apiPost("/auth/logout");
  },

  async forgotPassword(data: ForgotPasswordInput) {
    return apiPost("/auth/forgot-password", data);
  },

  async getUser() {
    return apiGet<User>("/auth/user");
  },

  async updateProfile(data: ProfileInput) {
    return apiPut<User>("/auth/profile", data);
  },

  async getOrganizations() {
    return apiGet<Organization[]>("/organizations");
  },

  async getWorkspaces(organizationId: string) {
    return apiGet<Workspace[]>(`/organizations/${organizationId}/workspaces`);
  },

  async getApiKeys() {
    return apiGet<ApiKey[]>("/auth/api-keys");
  },

  async createApiKey(data: ApiKeyInput) {
    return apiPost<{ api_key: ApiKey; plain_text_token: string }>(
      "/auth/api-keys",
      data
    );
  },

  async deleteApiKey(id: string) {
    return apiDelete(`/auth/api-keys/${id}`);
  },

  async getSessions() {
    return apiGet<Session[]>("/auth/sessions");
  },

  async revokeSession(id: string) {
    return apiDelete(`/auth/sessions/${id}`);
  },
};
