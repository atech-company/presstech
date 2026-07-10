"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { marketplaceService } from "@/services/api/platform-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function MarketplacePage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace"],
    queryFn: () => marketplaceService.list(),
  });

  const installMutation = useMutation({
    mutationFn: (templateId: string) => marketplaceService.install(templateId, workspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots"] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Template installed");
    },
    onError: () => toast.error("Failed to install template"),
  });

  const templates = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Marketplace" description="Pre-built bots and workflows to get started fast" />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates available yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.is_featured && <Star className="h-4 w-4 text-amber-500" />}
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline">{template.type}</Badge>
                  <Badge variant="secondary">{template.category}</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={() => installMutation.mutate(template.id)}
                  disabled={!workspaceId || installMutation.isPending}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Install
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
