import type { Node, Edge } from "@xyflow/react";

export type NodeCategory =
  | "flow"
  | "message"
  | "ai"
  | "logic"
  | "integration"
  | "data"
  | "utility";

export interface NodeTypeDefinition {
  type: string;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
  defaultData: Record<string, unknown>;
}

export const NODE_TYPES: NodeTypeDefinition[] = [
  { type: "start", label: "Start", description: "Workflow entry point", category: "flow", icon: "Play", color: "#22c55e", inputs: 0, outputs: 1, defaultData: {} },
  { type: "end", label: "End", description: "Workflow exit point", category: "flow", icon: "Square", color: "#ef4444", inputs: 1, outputs: 0, defaultData: {} },
  { type: "message", label: "Message", description: "Send a text message", category: "message", icon: "MessageSquare", color: "#3b82f6", inputs: 1, outputs: 1, defaultData: { text: "" } },
  { type: "question", label: "Question", description: "Ask user a question", category: "message", icon: "HelpCircle", color: "#3b82f6", inputs: 1, outputs: 1, defaultData: { question: "", variable: "" } },
  { type: "ai_response", label: "AI Response", description: "Generate AI response", category: "ai", icon: "Sparkles", color: "#8b5cf6", inputs: 1, outputs: 1, defaultData: { model: "gpt-4o", prompt: "", temperature: 0.7 } },
  { type: "condition", label: "Condition", description: "Branch based on condition", category: "logic", icon: "GitBranch", color: "#f59e0b", inputs: 1, outputs: 2, defaultData: { expression: "" } },
  { type: "switch", label: "Switch", description: "Multi-way branch", category: "logic", icon: "Shuffle", color: "#f59e0b", inputs: 1, outputs: 3, defaultData: { variable: "" } },
  { type: "loop", label: "Loop", description: "Repeat actions", category: "logic", icon: "Repeat", color: "#f59e0b", inputs: 1, outputs: 2, defaultData: { max_iterations: 10 } },
  { type: "delay", label: "Delay", description: "Wait before continuing", category: "utility", icon: "Clock", color: "#6b7280", inputs: 1, outputs: 1, defaultData: { duration: 1000 } },
  { type: "webhook", label: "Webhook", description: "Call external webhook", category: "integration", icon: "Webhook", color: "#06b6d4", inputs: 1, outputs: 1, defaultData: { url: "", method: "POST" } },
  { type: "rest_api", label: "REST API", description: "Make HTTP request", category: "integration", icon: "Globe", color: "#06b6d4", inputs: 1, outputs: 1, defaultData: { url: "", method: "GET" } },
  { type: "knowledge_search", label: "Knowledge Search", description: "Search knowledge base", category: "ai", icon: "BookOpen", color: "#8b5cf6", inputs: 1, outputs: 1, defaultData: { query: "", top_k: 5 } },
  { type: "set_variable", label: "Set Variable", description: "Set a variable value", category: "data", icon: "Variable", color: "#10b981", inputs: 1, outputs: 1, defaultData: { name: "", value: "" } },
  { type: "code", label: "Code", description: "Run custom code", category: "utility", icon: "Code", color: "#6b7280", inputs: 1, outputs: 1, defaultData: { language: "javascript", code: "" } },
  { type: "human_handover", label: "Human Handover", description: "Transfer to human agent", category: "message", icon: "UserCheck", color: "#3b82f6", inputs: 1, outputs: 1, defaultData: { message: "" } },
];

export function getNodeDefinition(type: string): NodeTypeDefinition | undefined {
  return NODE_TYPES.find((n) => n.type === type);
}

export function createNode(type: string, position: { x: number; y: number }): Node {
  const def = getNodeDefinition(type);
  if (!def) throw new Error(`Unknown node type: ${type}`);

  return {
    id: `${type}_${Date.now()}`,
    type,
    position,
    data: {
      label: def.label,
      ...def.defaultData,
    },
  };
}

export interface WorkflowGraph {
  nodes: Node[];
  edges: Edge[];
}
