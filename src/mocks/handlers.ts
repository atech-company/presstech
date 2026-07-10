import { http, HttpResponse } from "msw";
import {
  mockApiKeys,
  mockOrganizations,
  mockSessions,
  mockTeamMembers,
  mockUser,
  mockWorkspaces,
} from "./data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const handlers = [
  http.get(`${API_URL}/sanctum/csrf-cookie`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_URL}/api/v1/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const email = body.email?.trim().toLowerCase();
    if (email === "john@presstech.com" && body.password === "Password1") {
      return HttpResponse.json({ data: { user: mockUser } });
    }
    return HttpResponse.json(
      { message: "Invalid credentials", errors: { email: ["Invalid credentials"] } },
      { status: 422 }
    );
  }),

  http.post(`${API_URL}/api/v1/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    return HttpResponse.json({
      data: {
        user: { ...mockUser, name: body.name, email: body.email, email_verified_at: null },
      },
    });
  }),

  http.post(`${API_URL}/api/v1/auth/logout`, () => {
    return HttpResponse.json({ data: null, message: "Logged out" });
  }),

  http.post(`${API_URL}/api/v1/auth/forgot-password`, () => {
    return HttpResponse.json({ data: null, message: "Reset link sent" });
  }),

  http.get(`${API_URL}/api/v1/auth/user`, () => {
    return HttpResponse.json({ data: mockUser });
  }),

  http.put(`${API_URL}/api/v1/auth/profile`, async ({ request }) => {
    const body = (await request.json()) as { name: string; email: string };
    return HttpResponse.json({ data: { ...mockUser, ...body } });
  }),

  http.get(`${API_URL}/api/v1/organizations`, () => {
    return HttpResponse.json({ data: mockOrganizations });
  }),

  http.get(`${API_URL}/api/v1/organizations/:orgId/workspaces`, () => {
    return HttpResponse.json({ data: mockWorkspaces });
  }),

  http.get(`${API_URL}/api/v1/auth/api-keys`, () => {
    return HttpResponse.json({ data: mockApiKeys });
  }),

  http.post(`${API_URL}/api/v1/auth/api-keys`, async ({ request }) => {
    const body = (await request.json()) as { name: string; abilities: string[] };
    return HttpResponse.json({
      data: {
        api_key: {
          id: `key_${Date.now()}`,
          name: body.name,
          abilities: body.abilities,
          last_used_at: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        },
        plain_text_token: `pt_${Date.now()}_mock_token`,
      },
    });
  }),

  http.delete(`${API_URL}/api/v1/auth/api-keys/:id`, () => {
    return HttpResponse.json({ data: null, message: "API key deleted" });
  }),

  http.get(`${API_URL}/api/v1/auth/sessions`, () => {
    return HttpResponse.json({ data: mockSessions });
  }),

  http.delete(`${API_URL}/api/v1/auth/sessions/:id`, () => {
    return HttpResponse.json({ data: null, message: "Session revoked" });
  }),

  http.get(`${API_URL}/api/v1/workspaces/:wsId/team`, () => {
    return HttpResponse.json({ data: mockTeamMembers });
  }),

  http.get(`${API_URL}/api/v1/bots`, () => {
    return HttpResponse.json({
      data: [
        {
          id: "bot_01",
          workspace_id: "ws_01",
          name: "Customer Support Bot",
          slug: "customer-support",
          description: "Handles customer inquiries and support tickets",
          instructions: "You are a helpful customer support agent.",
          avatar: null,
          icon: null,
          status: "active",
          settings: null,
          created_by: "usr_01",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: "bot_02",
          workspace_id: "ws_01",
          name: "Lead Qualification",
          slug: "lead-qualification",
          description: "Qualifies inbound leads automatically",
          instructions: null,
          avatar: null,
          icon: null,
          status: "draft",
          settings: null,
          created_by: "usr_01",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });
  }),

  http.get(`${API_URL}/api/v1/bots/:id`, ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.id,
        workspace_id: "ws_01",
        name: "Customer Support Bot",
        slug: "customer-support",
        description: "Handles customer inquiries and support tickets",
        instructions: "You are a helpful customer support agent.",
        avatar: null,
        icon: null,
        status: "active",
        settings: null,
        created_by: "usr_01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  http.post(`${API_URL}/api/v1/bots`, async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string };
    return HttpResponse.json({
      data: {
        id: `bot_${Date.now()}`,
        workspace_id: "ws_01",
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, "-"),
        description: body.description ?? null,
        instructions: null,
        avatar: null,
        icon: null,
        status: "draft",
        settings: null,
        created_by: "usr_01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.get(`${API_URL}/api/v1/workflows`, () => {
    return HttpResponse.json({ data: [] });
  }),

  http.post(`${API_URL}/api/v1/workflows`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({
      data: {
        id: `wf_${Date.now()}`,
        workspace_id: "ws_01",
        bot_id: null,
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, "-"),
        description: null,
        status: "draft",
        created_by: "usr_01",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
  }),

  http.get(`${API_URL}/api/v1/workflows/:id`, ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.id,
        workspace_id: "ws_01",
        name: "Mock Workflow",
        slug: "mock-workflow",
        status: "draft",
        graph: { nodes: [], edges: [] },
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }),

  http.get(`${API_URL}/api/v1/knowledge`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_URL}/api/v1/tables`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_URL}/api/v1/integrations/catalog`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_URL}/api/v1/integrations`, () => HttpResponse.json({ data: [] })),
  http.get(`${API_URL}/api/v1/analytics`, () =>
    HttpResponse.json({
      data: {
        conversations: 0,
        messages: 0,
        active_bots: 1,
        knowledge_sources: 0,
        workflow_executions: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        tokens: 0,
        cost: 0,
      },
    })
  ),
  http.get(`${API_URL}/api/v1/billing`, () =>
    HttpResponse.json({
      data: {
        current_plan: { name: "Free", slug: "free", status: "active" },
        plans: [{ id: "plan_1", name: "Free", slug: "free", price_monthly: 0, features: ["3 bots"] }],
      },
    })
  ),
  http.get(`${API_URL}/api/v1/marketplace`, () => HttpResponse.json({ data: [] })),
];
