"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { useAuth } from "@/hooks/use-auth";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loadWorkspaces } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setReady(false);
      return;
    }

    let cancelled = false;
    setReady(false);

    void loadWorkspaces()
      .catch(() => {
        // Still allow the shell; pages can retry
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadWorkspaces]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            {ready ? children : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Loading workspace…
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
