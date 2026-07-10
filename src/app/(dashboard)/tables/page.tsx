"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Table2, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { tableService } from "@/features/tables/services/table-service";
import { useWorkspaceStore } from "@/store/workspace-store";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

export default function TablesPage() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tables", workspaceId],
    queryFn: () => tableService.list(workspaceId!),
    enabled: !!workspaceId,
  });

  const tables = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      tableService.create({
        workspace_id: workspaceId!,
        name,
        description,
        fields: [
          { name: "Name", type: "text", required: true },
          { name: "Value", type: "text" },
        ],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      setOpen(false);
      setName("");
      toast.success("Table created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tableService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      toast.success("Table deleted");
    },
  });

  return (
    <div>
      <PageHeader
        title="Tables"
        description="Structured data your bots and workflows can use"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Create Table</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Table</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={!name} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tables.length === 0 ? (
        <EmptyState title="No tables yet" description="Create structured data tables for your bots." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardContent className="flex items-center justify-between py-4">
                <Link href={`/tables/${table.id}`} className="flex items-center gap-3 flex-1">
                  <Table2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{table.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {table.field_count} fields · {table.row_count} rows
                    </p>
                  </div>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(table.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
