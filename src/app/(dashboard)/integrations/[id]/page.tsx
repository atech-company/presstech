"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
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
import type { WasenderSession } from "@/types/api/integrations";
import { toast } from "sonner";

function apiErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiClientError) return err.message;
  return fallback;
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}`;
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export default function IntegrationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [pat, setPat] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [botId, setBotId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [wasenderSessions, setWasenderSessions] = useState<WasenderSession[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["integration", id],
    queryFn: () => integrationService.get(id),
  });

  const integration = data?.data;
  const isWhatsApp = integration?.type === "whatsapp";
  const isWebsite = integration?.type === "website";

  const { data: botsData } = useQuery({
    queryKey: ["bots", integration?.workspace_id],
    queryFn: () => botService.list(integration!.workspace_id),
    enabled: !!integration?.workspace_id,
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ["integration-status", id],
    queryFn: () => integrationService.whatsappStatus(id),
    enabled: !!id && isWhatsApp,
    refetchInterval: (query) => {
      const d = query.state.data?.data;
      return d?.connected && d?.credentials_saved && d?.webhook_configured ? false : 3000;
    },
  });

  useEffect(() => {
    if (!integration) return;
    setSessionId(String(integration.config?.wasender_session_id ?? ""));
    setBotId(String(integration.config?.bot_id ?? ""));
    setPhoneNumber(String(integration.config?.phone_number ?? ""));
    setSessionName(String(integration.config?.session_name ?? ""));
  }, [integration]);

  useEffect(() => {
    if (searchParams.get("setup") === "whatsapp" && integration?.config?.personal_access_token_set) {
      loadSessionsMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id, searchParams]);

  const loadSessionsMutation = useMutation({
    mutationFn: () => integrationService.whatsappSessions(id, pat || undefined),
    onSuccess: (res) => {
      const sessions = Array.isArray(res.data) ? res.data : [];
      setWasenderSessions(sessions);
      if (sessions.length === 1 && !sessionId) {
        setSessionId(String(sessions[0].id));
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to load sessions")),
  });

  const setupMutation = useMutation({
    mutationFn: () =>
      integrationService.whatsappSetup(id, {
        ...(pat ? { personal_access_token: pat } : {}),
        ...(sessionId ? { wasender_session_id: sessionId } : {}),
        ...(botId ? { bot_id: botId } : {}),
        ...(phoneNumber.trim() ? { phone_number: phoneNumber.trim() } : {}),
        ...(sessionName.trim() ? { session_name: sessionName.trim() } : {}),
      }),
    onSuccess: (res) => {
      setSetupError(null);
      setQrCode(res.data.qrcode);
      if (res.data.session_id) setSessionId(String(res.data.session_id));
      if (res.data.phone_number) setPhoneNumber(String(res.data.phone_number));
      queryClient.invalidateQueries({ queryKey: ["integration", id] });
      queryClient.invalidateQueries({ queryKey: ["integration-status", id] });
      toast.success("Scan the QR code with WhatsApp on that phone (Linked Devices)");
    },
    onError: (err) => {
      const message = apiErrorMessage(err, "Failed to connect WhatsApp");
      setSetupError(message);
      toast.error(message);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => integrationService.whatsappSync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integration", id] });
      queryClient.invalidateQueries({ queryKey: ["integration-status", id] });
    },
  });

  if (isLoading || !integration) {
    return <p className="text-sm text-muted-foreground">Loading integration...</p>;
  }

  const status = statusData?.data;
  const bots = botsData?.data ?? [];
  const hasPat = !!pat || integration.config?.personal_access_token_set === true;
  const canRegisterWithPhone = !!botId && hasPat && phoneNumber.trim().length >= 8;
  const canConnectExisting = !!botId && hasPat;

  if (isWebsite) {
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
          description="Paste the embed code on your website — visitors can chat with your bot"
          action={<Badge variant="success">Active</Badge>}
        />

        <div className="mx-auto grid max-w-2xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-5 w-5" />
                Website Chat Widget
              </CardTitle>
              <CardDescription>
                Add this script before &lt;/body&gt; on any page. A chat bubble appears in the corner — same AI and knowledge as your bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integration.embed_code ? (
                <>
                  <div className="space-y-2">
                    <Label>Embed code</Label>
                    <textarea
                      readOnly
                      className="min-h-[80px] w-full rounded-md border bg-muted/40 p-3 font-mono text-xs"
                      value={integration.embed_code}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(integration.embed_code!);
                        toast.success("Embed code copied");
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy embed code
                    </Button>
                  </div>

                  {integration.embed_url && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <Button variant="outline" asChild>
                        <a href={integration.embed_url} target="_blank" rel="noopener noreferrer">
                          Open chat preview
                        </a>
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 rounded-lg border p-4 text-sm">
                    <StatusRow ok={!!integration.config?.bot_id} label="Bot linked" />
                    <StatusRow ok={!!integration.config?.embed_token_set} label="Secure embed token active" />
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Embed code not available. Re-create the website integration.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isWhatsApp) {
    return (
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/integrations"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
        </Button>
        <PageHeader title={integration.name} description={`${integration.type} integration`} />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">Open integration settings from the integrations list.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        description="Register any WhatsApp number — create a session, scan QR, AI replies"
        action={
          <Badge variant={status?.connected ? "success" : "warning"}>
            {status?.connected ? "Connected" : "Not connected"}
          </Badge>
        }
      />

      <div className="mx-auto grid max-w-lg gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5" />
              WhatsApp Setup
            </CardTitle>
            <CardDescription>
              Enter the phone number to register, then scan the QR with WhatsApp → Linked Devices on that phone.
              We auto-configure the webhook and API key from your Wasender account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Bot to reply on WhatsApp</Label>
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

            <div className="space-y-2">
              <Label>
                Wasender Personal Access Token
                {integration.config?.personal_access_token_set === true && " (saved)"}
              </Label>
              <Input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="From Wasender → Settings → Personal Access Token"
              />
            </div>

            <div className="space-y-2">
              <Label>WhatsApp phone number</Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="96170123456 (international, digits only)"
              />
              <p className="text-xs text-muted-foreground">
                Country code + number, no + or spaces. This number will host the AI chatbot.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Session name (optional)</Label>
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Store support line"
              />
            </div>

            {setupError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {setupError}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!canRegisterWithPhone || setupMutation.isPending}
              onClick={() => setupMutation.mutate()}
            >
              {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register number &amp; Show QR
            </Button>

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">Advanced: use existing Wasender session</summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-2">
                  <Label>Wasender session</Label>
                  <div className="flex gap-2">
                    <Select value={sessionId} onValueChange={setSessionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-pick first session" />
                      </SelectTrigger>
                      <SelectContent>
                        {wasenderSessions.map((session) => (
                          <SelectItem key={session.id} value={String(session.id)}>
                            #{session.id} {session.name ?? ""} {session.phone_number ? `· ${session.phone_number}` : ""} {session.status ? `(${session.status})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => loadSessionsMutation.mutate()}
                      disabled={loadSessionsMutation.isPending || !hasPat}
                    >
                      Load
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave phone empty and pick a session, or leave both empty to use your first Wasender session.
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={!canConnectExisting || setupMutation.isPending}
                  onClick={() => setupMutation.mutate()}
                >
                  {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect existing session &amp; Show QR
                </Button>
              </div>
            </details>

            {qrCode && (
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-6">
                <p className="font-medium text-center">Scan with WhatsApp → Linked Devices on that phone</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl(qrCode)} alt="WhatsApp QR code" className="rounded-md border bg-white" width={280} height={280} />
              </div>
            )}

            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Auto-setup status</p>
              <StatusRow ok={!!status?.connected} label="WhatsApp connected" />
              <StatusRow ok={!!status?.webhook_configured} label="Webhook configured on Wasender" />
              <StatusRow ok={!!status?.credentials_saved || integration.has_credentials} label="Session API key saved" />
              {status?.webhook_url && (
                <p className="pt-1 text-xs text-muted-foreground break-all">
                  Webhook: {status.webhook_url}
                </p>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={() => refetchStatus()} disabled={syncMutation.isPending}>
              Refresh status
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
