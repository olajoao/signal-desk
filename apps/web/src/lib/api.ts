import { refreshAccessToken } from "./auth";
import { getAccessToken, setTokens, clearTokens } from "./token-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Deduplicate concurrent refresh attempts
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function tryRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    const result = await refreshPromise;
    setTokens(result.accessToken, result.refreshToken);
    return result;
  } catch {
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed.accessToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
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

export async function getEvents(options?: { limit?: number; type?: string }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.type) params.set("type", options.type);

  return fetchApi<{ events: EventItem[] }>(`/events?${params}`);
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

export async function getRules() {
  return fetchApi<{ rules: RuleItem[] }>("/rules");
}

export async function createRule(rule: Omit<RuleItem, "id">) {
  return fetchApi<RuleItem>("/rules", {
    method: "POST",
    body: JSON.stringify(rule),
  });
}

export async function updateRule(id: string, updates: Partial<RuleItem>) {
  return fetchApi<RuleItem>(`/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteRule(id: string) {
  return fetchApi<void>(`/rules/${id}`, { method: "DELETE" });
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

export async function getNotifications(options?: { limit?: number; status?: string }) {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.status) params.set("status", options.status);

  return fetchApi<{ notifications: NotificationItem[] }>(`/notifications?${params}`);
}

// API Keys
export interface ApiKeyItem {
  id: string;
  name: string;
  key?: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export async function getApiKeys() {
  return fetchApi<{ apiKeys: ApiKeyItem[] }>("/api-keys");
}

export async function createApiKey(name: string, expiresIn?: string, scopes?: string[]) {
  return fetchApi<ApiKeyItem & { key: string }>("/api-keys", {
    method: "POST",
    body: JSON.stringify({ name, expiresIn, scopes }),
  });
}

export async function deleteApiKey(id: string) {
  return fetchApi<void>(`/api-keys/${id}`, { method: "DELETE" });
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

export async function getUsage() {
  return fetchApi<UsageData>("/usage");
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
  return fetchApi<{ plans: PlanData[] }>("/plans");
}

// Billing
export async function createCheckoutSession(planId: string) {
  return fetchApi<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
}

export async function getBillingPortal() {
  return fetchApi<{ url: string }>("/billing/portal");
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

export async function getMembers() {
  return fetchApi<{ members: MemberItem[] }>("/auth/members");
}

export async function inviteMember(email: string, role: string) {
  return fetchApi<{ id: string; email: string; role: string; expiresAt: string }>(
    "/auth/invite",
    { method: "POST", body: JSON.stringify({ email, role }) }
  );
}

export async function removeMember(id: string) {
  return fetchApi<void>(`/auth/members/${id}`, { method: "DELETE" });
}
