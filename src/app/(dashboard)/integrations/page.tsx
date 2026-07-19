"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plug, Trash2 } from "lucide-react";
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
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<{ type: string; name: string; description?: string } | null>(null);
  const [configName, setConfigName] = useState("");
  const [personalAccessToken, setPersonalAccessToken] = useState("");
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
        config: {
          ...(botId ? { bot_id: botId } : {}),
          ...(personalAccessToken ? { personal_access_token: personalAccessToken } : {}),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      resetDialog();
      if (res.data.type === "whatsapp") {
        toast.success("Now scan the QR code to connect WhatsApp");
        router.push(`/integrations/${res.data.id}?setup=whatsapp`);
      } else if (res.data.type === "website") {
        toast.success("Copy the embed code and paste it on your website");
        router.push(`/integrations/${res.data.id}`);
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

  function resetDialog() {
    setConnecting(null);
    setConfigName("");
    setPersonalAccessToken("");
    setBotId("");
  }

  const isWhatsApp = connecting?.type === "whatsapp";
  const isWebsite = connecting?.type === "website";
  const needsBot = isWhatsApp || isWebsite;

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
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/integrations/${item.id}${item.type === "whatsapp" ? "?setup=whatsapp" : ""}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {item.type === "whatsapp" ? "Connect WhatsApp" : item.type === "website" ? "Get Embed Code" : "Configure"}
                    </Link>
                  </Button>
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

      <Dialog open={!!connecting} onOpenChange={(o) => !o && resetDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connecting?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isWhatsApp && (
              <p className="text-sm text-muted-foreground">
                Pick a bot and paste your Wasender token. Next you will enter any WhatsApp phone number, scan the QR (Linked Devices), and that number becomes an AI chatbot.
              </p>
            )}
            {isWebsite && (
              <p className="text-sm text-muted-foreground">
                Pick a bot and we generate an embed script. Paste it on your site — visitors get a chat bubble with the same AI and knowledge.
              </p>
            )}
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={configName} onChange={(e) => setConfigName(e.target.value)} />
            </div>
            {(isWhatsApp || isWebsite) && (
              <div className="space-y-2">
                <Label>Bot to handle replies</Label>
                <Select value={botId} onValueChange={setBotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bot" />
                  </SelectTrigger>
                  <SelectContent>
                    {bots.map((bot) => (
                      <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isWhatsApp && (
              <div className="space-y-2">
                <Label>Wasender Personal Access Token</Label>
                <Input
                  type="password"
                  value={personalAccessToken}
                  onChange={(e) => setPersonalAccessToken(e.target.value)}
                  placeholder="Wasender → Settings → Personal Access Token"
                />
              </div>
            )}
            {!needsBot && (
              <div className="space-y-2">
                <Label>API Token / Key</Label>
                <Input type="password" />
              </div>
            )}
            <Button
              onClick={() => connectMutation.mutate()}
              disabled={
                connectMutation.isPending ||
                (isWhatsApp && (!botId || !personalAccessToken)) ||
                (isWebsite && !botId)
              }
              className="w-full"
            >
              {isWhatsApp ? "Continue to QR Setup" : isWebsite ? "Create Website Chat" : "Connect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
