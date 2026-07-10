import type { StateStorage } from "zustand/middleware";

/** Cookie storage so Next.js middleware can read auth state (localStorage is client-only). */
export function createCookieStorage(maxAgeSeconds = 60 * 60 * 24 * 7): StateStorage {
  return {
    getItem(name: string): string | null {
      if (typeof document === "undefined") return null;
      const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return match ? decodeURIComponent(match[1]) : null;
    },
    setItem(name: string, value: string): void {
      if (typeof document === "undefined") return;
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
    },
    removeItem(name: string): void {
      if (typeof document === "undefined") return;
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
    },
  };
}
