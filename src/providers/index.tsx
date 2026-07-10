"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { MswProvider } from "@/providers/msw-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MswProvider>
        <QueryProvider>
          <TooltipProvider delayDuration={0}>
            {children}
            <ToastProvider />
          </TooltipProvider>
        </QueryProvider>
      </MswProvider>
    </ThemeProvider>
  );
}
