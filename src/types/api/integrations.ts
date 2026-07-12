export interface IntegrationCatalogItem {
  type: string;
  name: string;
  category: string;
  description?: string;
}

export interface Integration {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  status: string;
  config: Record<string, unknown> | null;
  has_credentials: boolean;
  webhook_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationTestCheck {
  ok: boolean;
  message: string;
  url?: string;
  status?: unknown;
  session?: unknown;
  status_code?: number;
}

export interface IntegrationTestResult {
  ok: boolean;
  type: string;
  message?: string;
  checks?: Record<string, IntegrationTestCheck>;
}

export interface WhatsAppQrResponse {
  qrcode: string | null;
  session_id: string;
}

export interface WhatsAppStatusResponse {
  connected: boolean;
  session_api: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
}
