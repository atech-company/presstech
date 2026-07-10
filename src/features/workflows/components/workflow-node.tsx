"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeDefinition } from "@/features/workflows/lib/node-registry";
import { cn } from "@/lib/utils";
import {
  Play,
  Square,
  MessageSquare,
  HelpCircle,
  Sparkles,
  GitBranch,
  Shuffle,
  Repeat,
  Clock,
  Webhook,
  Globe,
  BookOpen,
  Variable,
  Code,
  UserCheck,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Play, Square, MessageSquare, HelpCircle, Sparkles, GitBranch,
  Shuffle, Repeat, Clock, Webhook, Globe, BookOpen, Variable, Code, UserCheck,
};

function WorkflowNodeComponent({ id, type, data, selected }: NodeProps) {
  const def = getNodeDefinition(type ?? "");
  if (!def) return null;

  const Icon = iconMap[def.icon] ?? Square;

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl border-2 bg-card shadow-md transition-all",
        selected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
      )}
    >
      {def.inputs > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}

      <div className="flex items-center gap-2 rounded-t-[10px] px-3 py-2" style={{ backgroundColor: `${def.color}15` }}>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: def.color, color: "white" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium">{data.label as string}</span>
      </div>

      <div className="px-3 py-2">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {def.description}
        </p>
      </div>

      {def.outputs > 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-background !bg-primary"
        />
      )}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
