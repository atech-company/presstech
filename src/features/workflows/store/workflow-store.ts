import { create } from "zustand";
import { temporal } from "zundo";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { createNode } from "@/features/workflows/lib/node-registry";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  workflowId: string | null;
  workflowName: string;
  isDirty: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: string, position: { x: number; y: number }) => void;
  setSelectedNode: (id: string | null) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  loadGraph: (nodes: Node[], edges: Edge[], id?: string, name?: string) => void;
  getGraph: () => { nodes: Node[]; edges: Edge[] };
  setWorkflowName: (name: string) => void;
  markClean: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      workflowId: null,
      workflowName: "Untitled Workflow",
      isDirty: false,

      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
          isDirty: true,
        });
      },

      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
          isDirty: true,
        });
      },

      onConnect: (connection) => {
        set({
          edges: addEdge(connection, get().edges),
          isDirty: true,
        });
      },

      addNode: (type, position) => {
        const node = createNode(type, position);
        set({ nodes: [...get().nodes, node], isDirty: true });
      },

      setSelectedNode: (id) => set({ selectedNodeId: id }),

      updateNodeData: (id, data) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
          isDirty: true,
        });
      },

      deleteSelected: () => {
        const { selectedNodeId, nodes, edges } = get();
        if (!selectedNodeId) return;
        set({
          nodes: nodes.filter((n) => n.id !== selectedNodeId),
          edges: edges.filter(
            (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
          ),
          selectedNodeId: null,
          isDirty: true,
        });
      },

      duplicateSelected: () => {
        const { selectedNodeId, nodes } = get();
        const original = nodes.find((n) => n.id === selectedNodeId);
        if (!original) return;
        const copy: Node = {
          ...original,
          id: `${original.type}_${Date.now()}`,
          position: {
            x: original.position.x + 40,
            y: original.position.y + 40,
          },
          selected: false,
        };
        set({ nodes: [...nodes, copy], selectedNodeId: copy.id, isDirty: true });
      },

      loadGraph: (nodes, edges, id, name) => {
        set({
          nodes,
          edges,
          workflowId: id ?? null,
          workflowName: name ?? "Untitled Workflow",
          isDirty: false,
          selectedNodeId: null,
        });
      },

      getGraph: () => ({ nodes: get().nodes, edges: get().edges }),

      setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),

      markClean: () => set({ isDirty: false }),
    }),
    { limit: 50 }
  )
);
