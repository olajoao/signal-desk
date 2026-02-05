import { refreshAccessToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type FetchOptions = RequestInit & {
  token?: string;
};

// Deduplicate concurrent refresh attempts
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function tryRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const rt = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
  if (!rt) return null;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(rt).finally(() => {
      refreshPromise = null;
    });
  }

  try {
    const result = await refreshPromise;
    localStorage.setItem("token", result.accessToken);
    localStorage.setItem("refreshToken", result.refreshToken);
    return result;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...fetchOptions.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${refreshed.accessToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.message ?? error.error ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Events
export interface EventItem {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  processed: boolean;
}

export async function getEvents(token: string, options?: { limit?: number; type?: string }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.type) params.set("type", options.type);

  return fetchApi<{ events: EventItem[] }>(`/events?${params}`, { token });
}

// Rules
export interface RuleItem {
  id: string;
  name: string;
  eventType: string;
  condition: string;
  threshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
  actions: Array<{ channel: string; config: Record<string, unknown> }>;
  enabled: boolean;
}

export async function getRules(token: string) {
  return fetchApi<{ rules: RuleItem[] }>("/rules", { token });
}

export async function createRule(token: string, rule: Omit<RuleItem, "id">) {
  return fetchApi<RuleItem>("/rules", {
    token,
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateRule(token: string, id: string, updates: Partial<RuleItem>) {
  return fetchApi<RuleItem>(`/rules/${id}`, {
    token,
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteRule(token: string, id: string) {
  return fetchApi<void>(`/rules/${id}`, { token, method: "DELETE" });
}

// Notifications
export interface NotificationItem {
  id: string;
  ruleId: string;
  ruleName: string;
  eventId: string;
  eventType: string;
  channel: string;
  status: string;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}

export async function getNotifications(token: string, options?: { limit?: number; status?: string }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.status) params.set("status", options.status);

  return fetchApi<{ notifications: NotificationItem[] }>(`/notifications?${params}`, { token });
}

// API Keys
export interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  keyPrefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export async function getApiKeys(token: string) {
  return fetchApi<{ apiKeys: ApiKeyItem[] }>("/api-keys", { token });
}

export async function createApiKey(token: string, name: string, expiresIn?: string) {
  return fetchApi<ApiKeyItem & { key: string }>("/api-keys", {
    token,
    method: "POST",
    body: JSON.stringify({ name, expiresIn }),
  });
}

export async function deleteApiKey(token: string, id: string) {
  return fetchApi<void>(`/api-keys/${id}`, { token, method: "DELETE" });
}

// Usage
export interface UsageData {
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
  };
  usage: {
    events: {
      used: number;
      limit: number;
      remaining: number;
      percentUsed: number;
    };
    rules: {
      used: number;
      limit: number;
      remaining: number;
    };
    overage: {
      events: number;
      cost: number;
    };
  };
  limits: {
    rateLimit: number;
    retentionDays: number;
  };
  billing: {
    periodStart: string;
    periodEnd: string;
  };
}

export async function getUsage(token: string) {
  return fetchApi<UsageData>("/usage", { token });
}

export interface PlanData {
  id: string;
  name: string;
  displayName: string;
  priceMonthly: number;
  eventsPerMonth: number;
  rulesLimit: number;
  retentionDays: number;
  rateLimit: number;
  features: {
    webhooks: boolean;
    discord: boolean;
  };
}

export async function getPlans() {
  return fetchApi<{ plans: PlanData[] }>("/plans", {});
}

// Members
export interface MemberItem {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export async function getMembers(token: string) {
  return fetchApi<{ members: MemberItem[] }>("/auth/members", { token });
}

export async function inviteMember(token: string, email: string, role: string) {
  return fetchApi<{ id: string; email: string; role: string; expiresAt: string }>(
    "/auth/invite",
    { token, method: "POST", body: JSON.stringify({ email, role }) }
  );
}

export async function removeMember(token: string, id: string) {
  return fetchApi<void>(`/auth/members/${id}`, { token, method: "DELETE" });
}
