export interface Workflow {
  id: string;
  workspace_id: string;
  bot_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  graph?: WorkflowGraph;
  version?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowExecution {
  id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}
