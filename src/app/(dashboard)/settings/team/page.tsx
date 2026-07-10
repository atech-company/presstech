"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "@/services/api/client";
import { workspaceService } from "@/services/api/platform-service";
import type { TeamMember } from "@/types/api";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/store/workspace-store";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";

export default function TeamSettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  const { data, isLoading } = useQuery({
    queryKey: ["team", currentWorkspace?.id],
    queryFn: () => apiGet<TeamMember[]>(`/workspaces/${currentWorkspace!.id}/team`),
    enabled: !!currentWorkspace,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      workspaceService.inviteMember(currentWorkspace!.id, { email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setEmail("");
      toast.success("Member invited");
    },
    onError: () => toast.error("Failed to invite member"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeMember(currentWorkspace!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Member removed");
    },
  });

  const members = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Team" description="Manage workspace team members and roles" />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="flex-1 space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="w-40 space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["admin", "member", "viewer"].map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => inviteMutation.mutate()} disabled={!email || inviteMutation.isPending}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          members.map((member) => (
            <Card key={member.user.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.user.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{member.role.name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {formatDate(member.joined_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate(member.user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
