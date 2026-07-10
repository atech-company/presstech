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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (bot && !initialized) {
      setName(bot.name);
      setDescription(bot.description ?? "");
      setInstructions(bot.instructions ?? "");
      setInitialized(true);
    }
  }, [bot, initialized]);

  const { data: knowledgeData } = useQuery({
    queryKey: ["knowledge", bot?.workspace_id, id],
    queryFn: () => knowledgeService.list(bot!.workspace_id, id),
    enabled: !!bot,
  });

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
    mutationFn: () => botService.update(id, { name, description, instructions }),
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!bot) return <p className="text-muted-foreground">Bot not found</p>;

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
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatEmulator botId={id} botName={bot.name} />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Linked Knowledge</CardTitle></CardHeader>
            <CardContent>
              {(knowledgeData?.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No knowledge sources linked.</p>
              ) : (
                <ul className="space-y-2">
                  {knowledgeData?.data.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span>{s.name}</span>
                      <Badge variant="secondary">{s.status}</Badge>
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
