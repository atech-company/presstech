import type { WidgetBotConfig, WidgetMessage, WidgetProduct } from "@/features/widget/types";

export type { WidgetBotConfig, WidgetMessage, WidgetProduct };

/**
 * Widget calls the Laravel API host directly.
 * Routing through the Vercel rewrite would hit Hostinger's AWS IP rate limits (HTTP 429).
 */
function widgetApiBase(): string {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:8000";
}

async function widgetFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${widgetApiBase()}/api/v1${path}${separator}token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    ...options,
    credentials: "omit",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Embed-Token": token,
      ...(options?.headers ?? {}),
    },
  });

  let json: { message?: string; data?: T } = {};
  try {
    json = await response.json();
  } catch {
    // non-JSON error body (e.g. host 429 HTML)
  }

  if (response.status === 429) {
    throw new Error("Too many requests — please wait a moment and try again.");
  }

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
