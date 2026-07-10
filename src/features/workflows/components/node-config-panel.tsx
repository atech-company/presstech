"use client";

import { useWorkflowStore } from "@/features/workflows/store/workflow-store";
import { getNodeDefinition } from "@/features/workflows/lib/node-registry";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NodeConfigPanel() {
  const { nodes, selectedNodeId, updateNodeData } = useWorkflowStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="flex h-full w-72 items-center justify-center border-l p-4">
        <p className="text-center text-sm text-muted-foreground">
          Select a node to configure
        </p>
      </div>
    );
  }

  const def = getNodeDefinition(selectedNode.type ?? "");
  if (!def) return null;

  return (
    <div className="flex h-full w-72 flex-col border-l bg-sidebar">
      <div className="border-b p-4">
        <h3 className="font-semibold">{def.label}</h3>
        <p className="text-xs text-muted-foreground">{def.description}</p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={(selectedNode.data.label as string) ?? ""}
              onChange={(e) =>
                updateNodeData(selectedNode.id, { label: e.target.value })
              }
            />
          </div>

          {selectedNode.type === "message" && (
            <div className="space-y-2">
              <Label>Message text</Label>
              <Textarea
                value={(selectedNode.data.text as string) ?? ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { text: e.target.value })
                }
                rows={4}
              />
            </div>
          )}

          {selectedNode.type === "ai_response" && (
            <>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={(selectedNode.data.model as string) ?? ""}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, { model: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={(selectedNode.data.prompt as string) ?? ""}
                  onChange={(e) =>
                    updateNodeData(selectedNode.id, { prompt: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </>
          )}

          {selectedNode.type === "condition" && (
            <div className="space-y-2">
              <Label>Expression</Label>
              <Input
                value={(selectedNode.data.expression as string) ?? ""}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, { expression: e.target.value })
                }
                placeholder="variable == 'value'"
              />
            </div>
          )}

          {selectedNode.type === "delay" && (
            <div className="space-y-2">
              <Label>Duration (ms)</Label>
              <Input
                type="number"
                value={(selectedNode.data.duration as number) ?? 1000}
                onChange={(e) =>
                  updateNodeData(selectedNode.id, {
                    duration: parseInt(e.target.value),
                  })
                }
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
