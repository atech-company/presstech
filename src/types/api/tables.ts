export interface TableDefinition {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  field_count: number;
  row_count: number;
  fields?: TableField[];
  rows?: TableRow[];
  created_at: string;
  updated_at: string;
}

export interface TableField {
  id: string;
  name: string;
  slug: string;
  type: string;
  required: boolean;
  options: Record<string, unknown> | null;
  position: number;
}

export interface TableRow {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
}
