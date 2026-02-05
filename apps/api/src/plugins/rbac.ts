import type { FastifyRequest, FastifyReply } from "fastify";

type Role = "member" | "admin" | "owner";

const ROLE_HIERARCHY: Record<Role, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

export function requireRole(minRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // API keys bypass RBAC (full org access)
    if (request.authType === "api_key") return;

    const userLevel = ROLE_HIERARCHY[request.role as Role] ?? -1;
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      return reply.status(403).send({ error: "Insufficient permissions" });
    }
  };
}
