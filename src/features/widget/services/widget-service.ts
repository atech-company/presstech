import type { WidgetBotConfig, WidgetMessage, WidgetProduct } from "@/features/widget/types";

export type { WidgetBotConfig, WidgetMessage, WidgetProduct };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function widgetApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }

  return API_URL;
}

async function widgetFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${widgetApiBase()}/api/v1${path}${separator}token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Embed-Token": token,
      ...(options?.headers ?? {}),
    },
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message ?? "Widget request failed");
  }

  return json.data as T;
}

export const widgetService = {
  config(botId: string, token: string) {
    return widgetFetch<WidgetBotConfig>(`/widget/${botId}/config`, token);
  },

  startConversation(botId: string, token: string, pageUrl?: string) {
    return widgetFetch<{ id: string }>(`/widget/${botId}/conversations`, token, {
      method: "POST",
      body: JSON.stringify({ page_url: pageUrl }),
    });
  },

  sendMessage(conversationId: string, token: string, content: string) {
    return widgetFetch<{ assistant_message: WidgetMessage }>(
      `/widget/conversations/${conversationId}/messages`,
      token,
      { method: "POST", body: JSON.stringify({ content }) }
    );
  },
};
