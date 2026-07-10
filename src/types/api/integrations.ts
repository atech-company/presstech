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
