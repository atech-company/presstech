"use client";

import { use, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { useBot } from "@/features/bots/hooks/use-bots";
import { botService } from "@/features/bots/services/bot-service";
import { knowledgeService } from "@/features/knowledge/services/knowledge-service";
import { integrationService } from "@/features/integrations/services/integration-service";
import { analyticsService } from "@/services/api/platform-service";
import { ChatEmulator } from "@/features/chat-emulator/components/chat-emulator";
import { aiService } from "@/services/api/ai-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link2, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useBot(id);
  const bot = data?.data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [aiProvider, setAiProvider] = useState("deepseek");
  const [aiModel, setAiModel] = useState("deepseek-chat");
  const [initialized, setInitialized] = useState(false);
  const [addKnowledgeOpen, setAddKnowledgeOpen] = useState(false);
  const [knowledgeName, setKnowledgeName] = useState("");
  const [knowledgeType, setKnowledgeType] = useState("website");
  const [knowledgeUrl, setKnowledgeUrl] = useState("");
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);

  const { data: aiProvidersData } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => aiService.providers(),
  });

  const aiProviders = aiProvidersData?.data.providers ?? [];

  useEffect(() => {
    if (bot && !initialized) {
      setName(bot.name);
      setDescription(bot.description ?? "");
      setInstructions(bot.instructions ?? "");
      const settings = bot.settings ?? {};
      setAiProvider((settings.ai_provider as string) ?? aiProvidersData?.data.default ?? "deepseek");
      setAiModel((settings.ai_model as string) ?? "deepseek-chat");
      setInitialized(true);
    }
  }, [bot, initialized, aiProvidersData?.data.default]);

  const { data: knowledgeData } = useQuery({
    queryKey: ["knowledge", bot?.workspace_id],
    queryFn: () => knowledgeService.list(bot!.workspace_id),
    enabled: !!bot,
  });

  const allKnowledge = knowledgeData?.data ?? [];
  const linkedKnowledge = allKnowledge.filter((s) => s.bot_id === id);
  const availableKnowledge = allKnowledge.filter((s) => s.bot_id !== id);

  const { data: integrationsData } = useQuery({
    queryKey: ["integrations", bot?.workspace_id],
    queryFn: () => integrationService.list(bot!.workspace_id),
    enabled: !!bot,
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["bot-analytics", id],
    queryFn: () => analyticsService.bot(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      botService.update(id, {
        name,
        description,
        instructions,
        settings: {
          ...(bot?.settings ?? {}),
          ai_provider: aiProvider,
          ai_model: aiModel,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bots", id] });
      toast.success("Bot updated");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => botService.archive(id),
    onSuccess: () => {
      toast.success("Bot archived");
      router.push("/bots");
    },
  });

  const linkKnowledgeMutation = useMutation({
    mutationFn: (sourceId: string) => knowledgeService.update(sourceId, { bot_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", bot?.workspace_id] });
      toast.success("Knowledge linked to bot");
    },
    onError: () => toast.error("Failed to link knowledge"),
  });

  const unlinkKnowledgeMutation = useMutation({
    mutationFn: (sourceId: string) => knowledgeService.update(sourceId, { bot_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", bot?.workspace_id] });
      toast.success("Knowledge unlinked");
    },
    onError: () => toast.error("Failed to unlink knowledge"),
  });

  const addKnowledgeMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("workspace_id", bot!.workspace_id);
      formData.append("bot_id", id);
      formData.append("name", knowledgeName);
      formData.append("type", knowledgeType);
      if (knowledgeUrl) formData.append("source_url", knowledgeUrl);
      if (knowledgeFile) formData.append("file", knowledgeFile);
      return knowledgeService.create(formData);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge", bot?.workspace_id] });
      setAddKnowledgeOpen(false);
      setKnowledgeName("");
      setKnowledgeUrl("");
      setKnowledgeFile(null);
      if (res.data.status === "failed") {
        toast.error(res.data.metadata?.error ?? "Knowledge source failed to index");
      } else {
        toast.success("Knowledge added and linked to this bot");
      }
    },
    onError: () => toast.error("Failed to add knowledge"),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bot) return <p className="text-muted-foreground">Bot not found</p>;

  const selectedProvider = aiProviders.find((p) => p.id === aiProvider);
  const modelOptions = selectedProvider?.models ?? [];

  return (
    <div>
      <PageHeader
        title={bot.name}
        description={bot.description ?? undefined}
        action={
          <div className="flex gap-2">
            <Badge>{bot.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate()}>
              Archive
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Bot Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select
                    value={aiProvider}
                    onValueChange={(value) => {
                      setAiProvider(value);
                      const provider = aiProviders.find((p) => p.id === value);
                      if (provider?.default_model) setAiModel(provider.default_model);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id} disabled={!provider.configured}>
                          {provider.label}{!provider.configured ? " (not configured)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aiProvider === "deepseek" && (
                    <p className="text-xs text-muted-foreground">
                      Use <strong>DeepSeek Reasoner</strong> for the most capable answers (slower).
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatEmulator botId={id} botName={bot.name} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Linked Knowledge ({linkedKnowledge.length})</CardTitle>
              <Dialog open={addKnowledgeOpen} onOpenChange={setAddKnowledgeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Source
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Knowledge for {bot.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={knowledgeName} onChange={(e) => setKnowledgeName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={knowledgeType} onValueChange={setKnowledgeType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["txt", "markdown", "pdf", "csv", "website", "sitemap"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(knowledgeType === "website" || knowledgeType === "sitemap") && (
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={knowledgeUrl}
                          onChange={(e) => setKnowledgeUrl(e.target.value)}
                          placeholder="https://example.com"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>File (optional)</Label>
                      <Input type="file" onChange={(e) => setKnowledgeFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <Button
                      className="w-full"
                      disabled={
                        !knowledgeName ||
                        addKnowledgeMutation.isPending ||
                        ((knowledgeType === "website" || knowledgeType === "sitemap") && !knowledgeUrl)
                      }
                      onClick={() => addKnowledgeMutation.mutate()}
                    >
                      {addKnowledgeMutation.isPending ? "Processing..." : "Add & Link"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {linkedKnowledge.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No knowledge linked yet. Link an existing source below or add a new one.
                </p>
              ) : (
                <ul className="space-y-2">
                  {linkedKnowledge.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.type} · {s.chunk_count} chunks
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.status === "indexed" ? "success" : "secondary"}>{s.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Unlink from bot"
                          onClick={() => unlinkKnowledgeMutation.mutate(s.id)}
                          disabled={unlinkKnowledgeMutation.isPending}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {availableKnowledge.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All workspace knowledge is already linked to this bot. Add more from the Knowledge page.
                </p>
              ) : (
                <ul className="space-y-2">
                  {availableKnowledge.map((s) => (
                    <li key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.type} · {s.chunk_count} chunks
                          {s.bot_id ? " · linked to another bot" : " · unassigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{s.status}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => linkKnowledgeMutation.mutate(s.id)}
                          disabled={linkKnowledgeMutation.isPending}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Link
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Connected Integrations</CardTitle></CardHeader>
            <CardContent>
              {(integrationsData?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No integrations connected.</p>
              ) : (
                <ul className="space-y-2">
                  {integrationsData?.data.map((i) => (
                    <li key={i.id} className="flex items-center justify-between text-sm">
                      <span>{i.name}</span>
                      <Badge variant="secondary">{i.type}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Conversations</p>
                <p className="text-2xl font-bold">{analyticsData?.data.conversations ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold">{analyticsData?.data.messages ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{analyticsData?.data.success_rate ?? 0}%</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
