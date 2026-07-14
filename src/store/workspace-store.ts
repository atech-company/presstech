import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Organization, Workspace } from "@/types/api";

interface WorkspaceState {
  currentOrganization: Organization | null;
  currentWorkspace: Workspace | null;
  organizations: Organization[];
  workspaces: Workspace[];
  setCurrentOrganization: (org: Organization | null) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  clearWorkspaceState: () => void;
}

const emptyState = {
  currentOrganization: null,
  currentWorkspace: null,
  organizations: [] as Organization[],
  workspaces: [] as Workspace[],
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...emptyState,
      setCurrentOrganization: (currentOrganization) => set({ currentOrganization }),
      setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
      setOrganizations: (organizations) => set({ organizations }),
      setWorkspaces: (workspaces) => set({ workspaces }),
      clearWorkspaceState: () => set({ ...emptyState }),
    }),
    { name: "presstech-workspace" }
  )
);
