"use client";

import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceStore } from "@/store/workspace-store";
import { analyticsService } from "@/services/api/platform-service";
import { BarChart3, MessageSquare, Bot, GitBranch, Database } from "lucide-react";

export default function AnalyticsPage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", workspaceId],
    queryFn: () => analyticsService.summary(workspaceId),
    enabled: !!workspaceId,
  });

  const stats = data?.data;

  const cards = [
    { title: "Conversations", value: stats?.conversations ?? 0, icon: MessageSquare },
    { title: "Messages", value: stats?.messages ?? 0, icon: MessageSquare },
    { title: "Active Bots", value: stats?.active_bots ?? 0, icon: Bot },
    { title: "Workflow Runs", value: stats?.workflow_executions ?? 0, icon: GitBranch },
    { title: "Knowledge Sources", value: stats?.knowledge_sources ?? 0, icon: Database },
    { title: "Success Rate", value: `${stats?.success_rate ?? 0}%`, icon: BarChart3 },
  ];

  return (
    <div>
      <PageHeader title="Analytics" description="Platform usage and performance metrics" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28" />)
          : cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Average execution duration</span>
            <Badge>{stats?.avg_duration_ms ?? 0}ms</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Token usage</span>
            <Badge variant="secondary">{stats?.tokens ?? 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated cost</span>
            <Badge variant="secondary">${stats?.cost ?? 0}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
