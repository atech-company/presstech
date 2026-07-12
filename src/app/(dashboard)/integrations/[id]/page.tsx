"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  Smartphone,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { integrationService } from "@/features/integrations/services/integration-service";
import { botService } from "@/features/bots/services/bot-service";
import { ApiClientError } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IntegrationTestResult } from "@/types/api/integrations";
import { toast } from "sonner";

function apiErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiClientError) return err.message;
  return fallback;
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}`;
}

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [pat, setPat] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessionApiKey, setSessionApiKey] = useState("");
  const [botId, setBotId] = useState("");
  const [testResult, setTestResult] = useState<IntegrationTestResult | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["integration", id],
    queryFn: () => integrationService.get(id),
  });

  const integration = data?.data;
  const isWhatsApp = integration?.type === "whatsapp";

  const { data: botsData } = useQuery({
    queryKey: ["bots", integration?.workspace_id],
    queryFn: () => botService.list(integration!.workspace_id),
    enabled: !!integration?.workspace_id,
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ["integration-status", id],
    queryFn: () => integrationService.whatsappStatus(id),
    enabled: !!id && isWhatsApp,
    refetchInterval: (query) => (query.state.data?.data?.connected ? false : 5000),
  });

  useEffect(() => {
    if (!integration) return;
    setSessionId(String(integration.config?.wasender_session_id ?? ""));
    setBotId(String(integration.config?.bot_id ?? ""));
  }, [integration]);

  const saveMutation = useMutation({
    mutationFn: () =>
      integrationService.update(id, {
        config: {
          ...(integration?.config ?? {}),
          bot_id: botId || null,
          wasender_session_id: sessionId || null,
          ...(pat ? { personal_access_token: pat } : {}),
        },
        ...(sessionApiKey ? { credentials: sessionApiKey } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration", id] });
      setPat("");
      setSessionApiKey("");
      toast.success("Settings saved");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to save settings")),
  });

  const testMutation = useMutation({
    mutationFn: () => integrationService.test(id),
    onSuccess: (res) => {
      setTestResult(res.data);
      toast.success(res.data.ok ? "All checks passed" : "Some checks failed");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Test failed")),
  });

  const connectMutation = useMutation({
    mutationFn: () => integrationService.whatsappConnect(id),
    onSuccess: () => {
      toast.success("Connecting — fetching QR code...");
      qrMutation.mutate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to start WhatsApp connection")),
  });

  const qrMutation = useMutation({
    mutationFn: () => integrationService.whatsappQrCode(id),
    onSuccess: (res) => {
      setQrCode(res.data.qrcode);
      if (!res.data.qrcode) {
        toast.error("No QR code returned — save PAT + Session ID first, then click Connect");
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to fetch QR code")),
  });

  function copyWebhook(url: string) {
    navigator.clipboard.writeText(url);
    toast.success("Webhook URL copied");
  }

  if (isLoading || !integration) {
    return <p className="text-sm text-muted-foreground">Loading integration...</p>;
  }

  const whatsappStatus = statusData?.data;
  const bots = botsData?.data ?? [];

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Integrations
          </Link>
        </Button>
      </div>

      <PageHeader
        title={integration.name}
        description={`${integration.type} integration — test credentials and manage connection`}
        action={
          <Badge variant={integration.status === "active" ? "success" : "secondary"}>
            {integration.status}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Connection</CardTitle>
            <CardDescription>Verify that your credentials work before going live</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              {testMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Run Test
            </Button>

            {testResult && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  {testResult.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span className="font-medium">
                    {testResult.ok ? "Credentials look good" : "Issues found"}
                  </span>
                </div>

                {testResult.checks ? (
                  Object.entries(testResult.checks).map(([key, check]) => (
                    <div key={key} className="rounded-md bg-muted/50 p-3 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        {check.ok ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        {key.replace(/_/g, " ")}
                      </div>
                      <p className="mt-1 text-muted-foreground">{check.message}</p>
                      {check.url && (
                        <div className="mt-2 flex gap-2">
                          <Input readOnly value={check.url} className="text-xs" />
                          <Button variant="outline" size="icon" onClick={() => copyWebhook(check.url!)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{testResult.message}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>Update credentials and bot assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isWhatsApp && (
              <>
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
                <div className="space-y-2">
                  <Label>Session API Key {integration.has_credentials && "(saved — leave blank to keep)"}</Label>
                  <Input
                    type="password"
                    value={sessionApiKey}
                    onChange={(e) => setSessionApiKey(e.target.value)}
                    placeholder="Wasender session API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Personal Access Token
                    {integration.config?.personal_access_token_set === true && " (saved — leave blank to keep)"}
                  </Label>
                  <Input
                    type="password"
                    value={pat}
                    onChange={(e) => setPat(e.target.value)}
                    placeholder="For QR linking"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wasender Session ID</Label>
                  <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="e.g. 12345" />
                </div>
              </>
            )}

            {integration.webhook_url && (
              <div className="space-y-2">
                <Label>Webhook URL (paste in Wasender)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={integration.webhook_url} className="text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyWebhook(integration.webhook_url!)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {isWhatsApp && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="h-5 w-5" />
                Link WhatsApp on Mobile
              </CardTitle>
              <CardDescription>
                Save your Personal Access Token and Session ID, then scan the QR code with WhatsApp on your phone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={whatsappStatus?.connected ? "success" : "warning"}>
                  {whatsappStatus?.connected ? "Connected" : "Not connected"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
                  Refresh status
                </Button>
              </div>

              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Save PAT + Session ID above</li>
                <li>Click Connect to start the Wasender session</li>
                <li>Scan the QR code with WhatsApp → Linked Devices</li>
                <li>Paste the webhook URL into Wasender and enable messages.received</li>
              </ol>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (!sessionId) {
                      toast.error("Enter and save Wasender Session ID first");
                      return;
                    }
                    if (!integration.config?.personal_access_token_set && !pat) {
                      toast.error("Enter and save Personal Access Token first");
                      return;
                    }
                    connectMutation.mutate();
                  }}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect &amp; Get QR
                </Button>
                <Button variant="outline" onClick={() => qrMutation.mutate()} disabled={qrMutation.isPending}>
                  Refresh QR
                </Button>
              </div>

              {qrCode && (
                <div className="flex flex-col items-start gap-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">Scan with WhatsApp</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrImageUrl(qrCode)} alt="WhatsApp QR code" className="rounded-md border" width={280} height={280} />
                  <p className="max-w-md break-all text-xs text-muted-foreground">{qrCode}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
