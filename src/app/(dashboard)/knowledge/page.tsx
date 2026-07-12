"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, Trash2, RefreshCw, AlertCircle } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { knowledgeService } from "@/features/knowledge/services/knowledge-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function statusVariant(status: string) {
  if (status === "indexed") return "success";
  if (status === "failed") return "destructive";
  if (status === "processing") return "warning";
  return "secondary";
}

export default function KnowledgePage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("txt");
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["knowledge", workspaceId],
    queryFn: () => knowledgeService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const sources = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("workspace_id", workspaceId!);
      formData.append("name", name);
      formData.append("type", type);
      if (sourceUrl) formData.append("source_url", sourceUrl);
      if (file) formData.append("file", file);
      return knowledgeService.create(formData);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      setOpen(false);
      setName("");
      setSourceUrl("");
      setFile(null);
      if (res.data.status === "failed") {
        toast.error(res.data.metadata?.error ?? "Crawl failed");
      } else {
        toast.success("Knowledge source indexed");
      }
    },
    onError: () => toast.error("Failed to add knowledge source"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => knowledgeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Deleted");
    },
  });

  const recrawlMutation = useMutation({
    mutationFn: (id: string) => knowledgeService.recrawl(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      if (res.data.status === "failed") {
        toast.error(res.data.metadata?.error ?? "Re-crawl failed");
      } else {
        toast.success(`Indexed ${res.data.chunk_count} chunks`);
      }
    },
    onError: () => toast.error("Re-crawl failed"),
  });

  return (
    <div>
      <PageHeader
        title="Knowledge"
        description="Upload documents and URLs for your bots to reference"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Source</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Knowledge Source</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["txt", "markdown", "pdf", "csv", "website", "sitemap"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(type === "website" || type === "sitemap") && (
                  <div className="space-y-2">
                    <Label>{type === "sitemap" ? "Sitemap URL" : "Website URL"}</Label>
                    <Input
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder={type === "sitemap" ? "https://example.com/sitemap.xml" : "https://example.com"}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {type === "website"
                        ? "Crawls the homepage and linked pages on the same domain (up to 25 pages)."
                        : "Reads URLs from your sitemap and indexes each page."}
                    </p>
                  </div>
                )}
                {type !== "website" && type !== "sitemap" && (
                <div className="space-y-2">
                  <Label>URL (optional)</Label>
                  <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
                </div>
                )}
                <div className="space-y-2">
                  <Label>File (optional)</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={
                    !name ||
                    createMutation.isPending ||
                    ((type === "website" || type === "sitemap") && !sourceUrl)
                  }
                  className="w-full"
                >
                  {createMutation.isPending ? "Crawling..." : "Add Source"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : sources.length === 0 ? (
        <EmptyState title="No knowledge sources" description="Add documents or URLs to build your bot's knowledge base." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => (
            <Card key={source.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.chunk_count} chunks
                        {source.metadata?.pages_indexed != null && ` · ${source.metadata.pages_indexed} pages`}
                      </p>
                      {source.source_url && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{source.source_url}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge variant={statusVariant(source.status)}>{source.status}</Badge>
                    {(source.type === "website" || source.type === "sitemap") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => recrawlMutation.mutate(source.id)}
                        disabled={recrawlMutation.isPending}
                        title="Re-crawl"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(source.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {source.metadata?.error && (
                  <div className="flex gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{source.metadata.error}</span>
                  </div>
                )}

                {source.metadata?.crawl_errors && source.metadata.crawl_errors.length > 0 && source.status === "indexed" && (
                  <p className="text-xs text-muted-foreground">
                    {source.metadata.crawl_errors.length} page(s) skipped during crawl
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
