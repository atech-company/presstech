"use client";

import Link from "next/link";
import { Plus, GitBranch } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { useWorkflows } from "@/features/workflows/hooks/use-workflows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkflowsPage() {
  const { data, isLoading } = useWorkflows();
  const workflows = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Design and automate conversation flows"
        action={
          <Button asChild>
            <Link href="/workflows/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <EmptyState
          title="No workflows yet"
          description="Build visual workflows to automate your bot conversations."
          action={
            <Button asChild>
              <Link href="/workflows/new">Create your first workflow</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Link key={wf.id} href={`/workflows/${wf.id}`}>
              <Card className="transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {wf.description ?? "No description"}
                  </p>
                  <Badge variant={wf.status === "active" ? "success" : "secondary"}>
                    {wf.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
