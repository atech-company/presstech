import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { User } from "@/types/api";

const TOKEN_KEY = "presstech-token";

const cookieStorage: StateStorage = {
  getItem(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },
  setItem(name: string, value: string): void {
    if (typeof document === "undefined") return;
    const maxAge = 60 * 60 * 24 * 7;
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
  },
  removeItem(name: string): void {
    if (typeof document === "undefined") return;
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return useAuthStore.getState().token || localStorage.getItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem(TOKEN_KEY, token);
        set({ user, token, isAuthenticated: true });
      },
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!user,
          token: user ? state.token : null,
        })),
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "presstech-auth",
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || typeof window === "undefined") return;
        const storedToken = localStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          state.token = storedToken;
        }
        if (state.isAuthenticated && !state.token) {
          state.user = null;
          state.isAuthenticated = false;
        }
      },
    }
  )
);
