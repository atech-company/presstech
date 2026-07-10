"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Copy,
} from "lucide-react";
import { useWorkflowStore } from "@/features/workflows/store/workflow-store";
import { WorkflowCanvas } from "@/features/workflows/components/workflow-canvas";
import { NodePalette } from "@/features/workflows/components/node-palette";
import { NodeConfigPanel } from "@/features/workflows/components/node-config-panel";
import { workflowService } from "@/features/workflows/services/workflow-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { WorkflowGraph } from "@/types/api/workflows";

export function WorkflowBuilder({ workflowId }: { workflowId?: string }) {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const [loading, setLoading] = useState(!!workflowId);
  const [id, setId] = useState<string | null>(workflowId ?? null);

  const {
    workflowName,
    isDirty,
    setWorkflowName,
    deleteSelected,
    duplicateSelected,
    getGraph,
    markClean,
    loadGraph,
  } = useWorkflowStore();

  const temporal = useWorkflowStore.temporal;

  useEffect(() => {
    if (!workflowId) {
      loadGraph(
        [{ id: "start_1", type: "start", position: { x: 250, y: 50 }, data: { label: "Start" } }],
        [],
        undefined,
        "New Workflow"
      );
      return;
    }

    workflowService.get(workflowId).then((res) => {
      const wf = res.data;
      const graph = wf.graph ?? { nodes: [], edges: [] };
      loadGraph(graph.nodes as never[], graph.edges as never[], wf.id, wf.name);
      setId(wf.id);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load workflow");
      setLoading(false);
    });
  }, [workflowId, loadGraph]);

  const handleSave = useCallback(async () => {
    if (!workspaceId) {
      toast.error("Select a workspace first");
      return;
    }

    const graph = getGraph() as WorkflowGraph;

    try {
      if (id) {
        await workflowService.update(id, { name: workflowName, graph });
      } else {
        const res = await workflowService.create({
          workspace_id: workspaceId,
          name: workflowName,
          graph,
        });
        setId(res.data.id);
        router.replace(`/workflows/${res.data.id}`);
      }
      markClean();
      toast.success("Workflow saved");
    } catch {
      toast.error("Failed to save workflow");
    }
  }, [workspaceId, getGraph, workflowName, id, markClean, router]);

  const handleRun = useCallback(async () => {
    if (!id) {
      toast.error("Save the workflow first");
      return;
    }
    try {
      const res = await workflowService.run(id);
      toast.success(`Workflow started (${res.data.status})`);
    } catch {
      toast.error("Failed to run workflow");
    }
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        temporal.getState().undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        temporal.getState().redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if ((e.target as HTMLElement).tagName !== "INPUT" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          deleteSelected();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [temporal, deleteSelected, duplicateSelected, handleSave]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading workflow...</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/workflows">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 w-64 border-none bg-transparent text-lg font-semibold focus-visible:ring-0"
          />
          {isDirty && <Badge variant="warning">Unsaved</Badge>}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => temporal.getState().undo()} title="Undo (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => temporal.getState().redo()} title="Redo (Ctrl+Y)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={duplicateSelected} title="Duplicate (Ctrl+D)">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={deleteSelected} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          {id && (
            <Button variant="outline" size="sm" onClick={handleRun}>
              <Play className="mr-2 h-4 w-4" />
              Run
            </Button>
          )}
          <Button onClick={handleSave} size="sm" className="ml-2">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div className="flex-1">
          <WorkflowCanvas />
        </div>
        <NodeConfigPanel />
      </div>
    </div>
  );
}
