"use client";

import { NODE_TYPES, type NodeCategory } from "@/features/workflows/lib/node-registry";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import {
  Play, Square, MessageSquare, HelpCircle, Sparkles, GitBranch,
  Shuffle, Repeat, Clock, Webhook, Globe, BookOpen, Variable, Code, UserCheck,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, Square, MessageSquare, HelpCircle, Sparkles, GitBranch,
  Shuffle, Repeat, Clock, Webhook, Globe, BookOpen, Variable, Code, UserCheck,
};

const categoryLabels: Record<NodeCategory, string> = {
  flow: "Flow",
  message: "Messages",
  ai: "AI",
  logic: "Logic",
  integration: "Integrations",
  data: "Data",
  utility: "Utility",
};

export function NodePalette() {
  const [search, setSearch] = useState("");

  const filtered = NODE_TYPES.filter(
    (n) =>
      n.label.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, typeof NODE_TYPES>>((acc, node) => {
    if (!acc[node.category]) acc[node.category] = [];
    acc[node.category].push(node);
    return acc;
  }, {});

  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="border-b p-3">
        <Input
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8"
        />
      </div>
      <ScrollArea className="flex-1 p-3">
        {Object.entries(grouped).map(([category, nodes]) => (
          <div key={category} className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {categoryLabels[category as NodeCategory]}
            </p>
            <div className="space-y-1">
              {nodes.map((node) => {
                const Icon = iconMap[node.icon] ?? Square;
                return (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className="flex cursor-grab items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-all hover:border-primary/50 hover:shadow-sm active:cursor-grabbing"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: node.color, color: "white" }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{node.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
