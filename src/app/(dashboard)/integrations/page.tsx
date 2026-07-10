"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plug, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { integrationService } from "@/features/integrations/services/integration-service";
import { botService } from "@/features/bots/services/bot-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<{ type: string; name: string; description?: string } | null>(null);
  const [configName, setConfigName] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [botId, setBotId] = useState("");

  const { data: catalogData } = useQuery({
    queryKey: ["integrations-catalog"],
    queryFn: () => integrationService.catalog(),
  });

  const { data: connectedData, isLoading } = useQuery({
    queryKey: ["integrations", workspaceId],
    queryFn: () => integrationService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const { data: botsData } = useQuery({
    queryKey: ["bots", workspaceId],
    queryFn: () => botService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const catalog = catalogData?.data ?? [];
  const connected = connectedData?.data ?? [];
  const bots = botsData?.data ?? [];

  const connectMutation = useMutation({
    mutationFn: () =>
      integrationService.create({
        workspace_id: workspaceId!,
        type: connecting!.type,
        name: configName || connecting!.name,
        credentials: apiToken || undefined,
        config: botId ? { bot_id: botId } : undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setConnecting(null);
      setConfigName("");
      setApiToken("");
      setBotId("");
      if (res.data.webhook_url) {
        toast.success("Connected! Copy the webhook URL into your Wasender session settings.");
      } else {
        toast.success("Integration connected");
      }
    },
    onError: () => toast.error("Failed to connect integration"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Disconnected");
    },
  });

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  }

  const isWhatsApp = connecting?.type === "whatsapp";

  return (
    <div>
      <PageHeader title="Integrations" description="Connect messaging channels and APIs" />

      {connected.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">Connected</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connected.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Plug className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === "active" ? "success" : "secondary"}>{item.status}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {item.webhook_url && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Wasender webhook URL</p>
                      <div className="flex gap-2">
                        <Input readOnly value={item.webhook_url} className="text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copyWebhook(item.webhook_url!)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Available Integrations</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {catalog.map((item) => (
            <Card
              key={item.type}
              className="cursor-pointer hover:shadow-md"
              onClick={() => {
                setConnecting(item);
                setConfigName(item.name);
              }}
            >
              <CardHeader>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">{item.category}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!connecting} onOpenChange={(o) => !o && setConnecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connecting?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isWhatsApp && (
              <p className="text-sm text-muted-foreground">
                Use your Wasender session API key. After connecting, paste the webhook URL into your Wasender session
                settings and enable <code className="text-xs">messages.received</code> events.
              </p>
            )}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={configName} onChange={(e) => setConfigName(e.target.value)} />
            </div>
            {isWhatsApp && (
              <div className="space-y-2">
                <Label>Bot to handle replies</Label>
                <Select value={botId} onValueChange={setBotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {bots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>
                        {bot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>{isWhatsApp ? "Wasender API Key" : "API Token / Key"}</Label>
              <Input type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} />
            </div>
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending || !apiToken || (isWhatsApp && !botId)}
              className="w-full"
            >
              Connect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
