import type {
  ApiKey,
  Organization,
  Session,
  TeamMember,
  User,
  Workspace,
} from "@/types/api";

export const mockUser: User = {
  id: "usr_01",
  name: "John Doe",
  email: "john@presstech.com",
  email_verified_at: new Date().toISOString(),
  avatar: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockOrganizations: Organization[] = [
  {
    id: "org_01",
    name: "PressTech Inc",
    slug: "presstech-inc",
    logo: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockWorkspaces: Workspace[] = [
  {
    id: "ws_01",
    organization_id: "org_01",
    name: "Production",
    slug: "production",
    description: "Main production workspace",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "ws_02",
    organization_id: "org_01",
    name: "Development",
    slug: "development",
    description: "Development and testing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockApiKeys: ApiKey[] = [
  {
    id: "key_01",
    name: "Production API",
    abilities: ["bots:read", "bots:write", "workflows:read"],
    last_used_at: new Date().toISOString(),
    expires_at: null,
    created_at: new Date().toISOString(),
  },
];

export const mockSessions: Session[] = [
  {
    id: "sess_01",
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    last_active: new Date().toISOString(),
    is_current: true,
  },
  {
    id: "sess_02",
    ip_address: "192.168.1.50",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
    last_active: new Date(Date.now() - 86400000).toISOString(),
    is_current: false,
  },
];

export const mockTeamMembers: TeamMember[] = [
  {
    id: "tm_01",
    user: mockUser,
    role: { id: "role_01", name: "Owner", guard_name: "web" },
    joined_at: new Date().toISOString(),
  },
  {
    id: "tm_02",
    user: {
      id: "usr_02",
      name: "Jane Smith",
      email: "jane@presstech.com",
      email_verified_at: new Date().toISOString(),
      avatar: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: { id: "role_02", name: "Admin", guard_name: "web" },
    joined_at: new Date().toISOString(),
  },
];
