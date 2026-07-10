"use client";

import { use, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { tableService } from "@/features/tables/services/table-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function TableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [newRow, setNewRow] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["tables", id],
    queryFn: () => tableService.get(id),
  });

  const table = data?.data;

  const addRowMutation = useMutation({
    mutationFn: () => tableService.createRow(id, newRow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", id] });
      setNewRow({});
      toast.success("Row added");
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!table) return <p>Table not found</p>;

  return (
    <div>
      <PageHeader title={table.name} description={table.description ?? undefined} />

      <Card className="mb-6">
        <CardHeader><CardTitle>Add Row</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {(table.fields ?? []).map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="text-sm font-medium">{field.name}</label>
              <Input
                value={newRow[field.slug] ?? ""}
                onChange={(e) => setNewRow((prev) => ({ ...prev, [field.slug]: e.target.value }))}
              />
            </div>
          ))}
          <Button className="self-end" onClick={() => addRowMutation.mutate()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Row
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rows ({table.rows?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {(table.fields ?? []).map((f) => (
                    <th key={f.id} className="px-4 py-2 text-left font-medium">{f.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(table.rows ?? []).map((row) => (
                  <tr key={row.id} className="border-b">
                    {(table.fields ?? []).map((f) => (
                      <td key={f.id} className="px-4 py-2">
                        {String(row.data[f.slug] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
