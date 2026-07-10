import { apiGet } from "@/services/api/client";

export interface AIModelOption {
  id: string;
  label: string;
}

export interface AIProviderOption {
  id: string;
  label: string;
  default_model: string | null;
  models: AIModelOption[];
  configured: boolean;
}

export const aiService = {
  providers() {
    return apiGet<{ default: string; providers: AIProviderOption[] }>("/ai/providers");
  },
};
