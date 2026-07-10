"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/store/workspace-store";
import { analyticsService } from "@/services/api/platform-service";
import { botService } from "@/features/bots/services/bot-service";
import { workflowService } from "@/features/workflows/services/workflow-service";
import {
  Activity,
  Bot,
  GitBranch,
  MessageSquare,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", workspaceId],
    queryFn: () => analyticsService.summary(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: botsData } = useQuery({
    queryKey: ["bots", workspaceId],
    queryFn: () => botService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: workflowsData } = useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: () => workflowService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const stats = analytics?.data;
  const bots = botsData?.data ?? [];
  const workflows = workflowsData?.data ?? [];

  const cards = [
    { title: "Active Bots", value: stats?.active_bots ?? 0, icon: Bot },
    { title: "Workflows", value: workflows.length, icon: GitBranch },
    { title: "Conversations", value: stats?.conversations ?? 0, icon: MessageSquare },
    { title: "Messages", value: stats?.messages ?? 0, icon: Activity },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your AI automation platform" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)
          : cards.map((stat) => (
              <Card key={stat.title} className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Recent Bots
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {bots.slice(0, 5).map((bot) => (
              <div key={bot.id} className="flex items-center justify-between text-sm">
                <span>{bot.name}</span>
                <Badge variant="secondary">{bot.status}</Badge>
              </div>
            ))}
            {bots.length === 0 && (
              <p className="text-sm text-muted-foreground">No bots yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Success Rate", value: `${stats?.success_rate ?? 0}%`, status: "success" as const },
              { label: "Avg Duration", value: `${stats?.avg_duration_ms ?? 0}ms`, status: "default" as const },
              { label: "Executions", value: String(stats?.workflow_executions ?? 0), status: "warning" as const },
            ].map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <Badge variant={metric.status}>{metric.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
