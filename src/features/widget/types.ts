export interface WidgetProduct {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  image_url?: string | null;
  url?: string | null;
  order_url?: string | null;
  sku?: string | null;
}

export interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  products?: WidgetProduct[];
}

export interface WidgetBotConfig {
  bot_id: string;
  name: string;
  description?: string | null;
  avatar?: string | null;
}
