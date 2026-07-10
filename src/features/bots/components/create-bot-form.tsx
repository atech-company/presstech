"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useBots } from "@/features/bots/hooks/use-bots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const createBotSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type CreateBotInput = z.infer<typeof createBotSchema>;

export function CreateBotForm() {
  const router = useRouter();
  const { create } = useBots();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBotInput>({
    resolver: zodResolver(createBotSchema),
    defaultValues: { name: "", description: "" },
  });

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Bot Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => {
            create.mutate(data, {
              onSuccess: (res) => router.push(`/bots/${res.data.id}`),
            });
          })}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Bot name</Label>
            <Input id="name" placeholder="Customer Support Bot" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What does this bot do?"
              {...register("description")}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create bot
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
