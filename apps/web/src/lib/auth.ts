import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./token-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  org: Org;
}

export async function signup(data: {
  email: string;
  password: string;
  name?: string;
  orgName?: string;
  inviteToken?: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Signup failed" }));
    throw new Error(error.message ?? error.error ?? "Signup failed");
  }

  const result: AuthResponse = await response.json();
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Login failed" }));
    throw new Error(error.message ?? error.error ?? "Login failed");
  }

  const result: AuthResponse = await response.json();
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function getMe(): Promise<{ user: User; org: Org | null }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/auth/me`, { headers });

  if (!response.ok) {
    throw new Error("Unauthorized");
  }

  return response.json();
}

export async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string }> {
  const rt = getRefreshToken();

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rt ? { refreshToken: rt } : {}),
  });

  if (!response.ok) {
    clearTokens();
    throw new Error("Refresh failed");
  }

  const result = await response.json();
  setTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logoutApi(): Promise<void> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers,
  }).catch(() => {});

  clearTokens();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.message ?? error.error ?? "Request failed");
  }

  return response.json();
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Reset failed" }));
    throw new Error(error.message ?? error.error ?? "Reset failed");
  }

  return response.json();
}

export async function getWsTicket(): Promise<{ ticket: string }> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}/auth/ws-ticket`, { headers });

  if (!response.ok) {
    throw new Error("Failed to get WS ticket");
  }

  return response.json();
}

export interface AcceptInviteResponse {
  needsSignup: boolean;
  email?: string;
  orgName?: string;
  inviteToken?: string;
  membership?: { orgId: string; role: string };
  org?: Org;
}

export async function acceptInvite(token: string): Promise<AcceptInviteResponse> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_URL}/auth/accept-invite`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to accept invite" }));
    throw new Error(error.message ?? error.error ?? "Failed to accept invite");
  }

  return response.json();
}
