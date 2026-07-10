"use client";

import { useEffect, useState } from "react";

export function MswProvider({ children }: { children: React.ReactNode }) {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
  const [ready, setReady] = useState(!useMocks);

  useEffect(() => {
    if (!useMocks) return;

    async function init() {
      try {
        const { worker } = await import("@/mocks/browser");
        await worker.start({ onUnhandledRequest: "bypass" });
      } catch (error) {
        console.warn("[MSW] Mock worker failed to start — using real API instead.", error);
      } finally {
        setReady(true);
      }
    }

    init();
  }, [useMocks]);

  if (!ready) return null;

  return <>{children}</>;
}
