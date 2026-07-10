export interface Bot {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  avatar: string | null;
  icon: string | null;
  status: "draft" | "active" | "archived";
  settings: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
