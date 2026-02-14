import type { FastifyRequest, FastifyReply } from "fastify";

type Role = "member" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

// Route → required scope mapping
const ROUTE_SCOPES: Record<string, string> = {
  "POST /events": "events:write",
  "GET /events": "events:read",
  "GET /events/:id": "events:read",
  "POST /rules": "rules:write",
  "GET /rules": "rules:read",
  "GET /rules/:id": "rules:read",
  "PATCH /rules/:id": "rules:write",
  "DELETE /rules/:id": "rules:write",
  "GET /notifications": "notifications:read",
  "GET /notifications/:id": "notifications:read",
  "POST /api-keys": "api-keys:write",
  "GET /api-keys": "api-keys:read",
  "DELETE /api-keys/:id": "api-keys:write",
};

function matchRoute(method: string, url: string): string | undefined {
  const cleanUrl = url.split("?")[0]!;
  // Try exact match first
  const exact = `${method} ${cleanUrl}`;
  if (ROUTE_SCOPES[exact]) return ROUTE_SCOPES[exact];
  // Try with :id pattern
  const withParam = cleanUrl.replace(/\/[0-9a-f-]{36}$/i, "/:id");
  return ROUTE_SCOPES[`${method} ${withParam}`];
}

export function requireRole(minRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // API keys: check scopes instead of role hierarchy
    if (request.authType === "api_key") {
      // Empty scopes = full access (backward compatible)
      if (request.apiKeyScopes.length === 0) return;

      const requiredScope = matchRoute(request.method, request.url);
      if (requiredScope && !request.apiKeyScopes.includes(requiredScope)) {
        return reply.status(403).send({ error: "API key lacks required scope", scope: requiredScope });
      }
      return;
    }

    const userLevel = ROLE_HIERARCHY[request.role as Role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}

export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.authType !== "api_key") return; // JWT users not scope-restricted
    if (request.apiKeyScopes.length === 0) return; // empty = full access

    if (!request.apiKeyScopes.includes(scope)) {
      return reply.status(403).send({ error: "API key lacks required scope", scope });
    }
  };
}
