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
  credentials_saved?: boolean;
  webhook_configured?: boolean;
  webhook_url?: string;
  session_status?: string | null;
  session_api?: Record<string, unknown> | null;
  session?: Record<string, unknown> | null;
}

export interface WhatsAppSetupResponse {
  session_id: string;
  qrcode: string | null;
  webhook_url: string;
  webhook_configured: boolean;
  connected: boolean;
  credentials_saved: boolean;
  session_status: string | null;
}

export interface WasenderSession {
  id: number;
  name?: string;
  status?: string;
  phone_number?: string;
}
