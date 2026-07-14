import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization, Workspace } from "@/types/api";

interface WorkspaceState {
  /** Bound to the logged-in user so workspaces never leak across accounts */
  userId: string | null;
  currentOrganization: Organization | null;
  currentWorkspace: Workspace | null;
  organizations: Organization[];
  workspaces: Workspace[];
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  clearWorkspaceState: () => void;
}

const emptyState = {
  userId: null as string | null,
  currentOrganization: null as Organization | null,
  currentWorkspace: null as Workspace | null,
  organizations: [] as Organization[],
  workspaces: [] as Workspace[],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...emptyState,
      _hasHydrated: false,
      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),
      setCurrentOrganization: (currentOrganization) => set({ currentOrganization }),
      setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
      setOrganizations: (organizations) => set({ organizations }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      clearWorkspaceState: () => set({ ...emptyState }),
    }),
    {
      name: "presstech-workspace",
      // Wipe legacy entries that stored someone else's workspace ID
      version: 2,
      migrate: () => ({ ...emptyState, _hasHydrated: false }),
      partialize: (state) => ({
        userId: state.userId,
        currentOrganization: state.currentOrganization,
        currentWorkspace: state.currentWorkspace,
        organizations: state.organizations,
        workspaces: state.workspaces,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export function waitForWorkspaceHydration(): Promise<void> {
  if (useWorkspaceStore.getState()._hasHydrated) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const unsub = useWorkspaceStore.persist.onFinishHydration(() => {
      useWorkspaceStore.getState().setHasHydrated(true);
      unsub();
      resolve();
    });

    // Fallback if hydration already finished between check and subscribe
    if (useWorkspaceStore.getState()._hasHydrated) {
      unsub();
      resolve();
    }
  });
}
