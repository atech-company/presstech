"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/layout/page-header";
import { BotGrid } from "@/features/bots/components/bot-grid";
import { useBots } from "@/features/bots/hooks/use-bots";
import { Button } from "@/components/ui/button";

export default function BotsPage() {
  const { bots, isLoading } = useBots();

  return (
    <div>
      <PageHeader
        title="Bots"
        description="Create and manage your AI bots"
        action={
          <Button asChild>
            <Link href="/bots/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Bot
            </Link>
          </Button>
        }
      />

      {!isLoading && bots.length === 0 ? (
        <EmptyState
          title="No bots yet"
          description="Create your first AI bot to get started with automation."
          action={
            <Button asChild>
              <Link href="/bots/new">Create your first bot</Link>
            </Button>
          }
        />
      ) : (
        <BotGrid />
      )}
    </div>
  );
}
