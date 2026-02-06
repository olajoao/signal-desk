import type { FastifyInstance } from "fastify";
import { prisma } from "@signaldesk/db";
import { randomBytes, createHash } from "crypto";
import {
  SignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  InviteMemberSchema,
  AcceptInviteSchema,
} from "@signaldesk/shared";
import { requireRole } from "../plugins/rbac.ts";
import { sendPasswordResetEmail, sendInviteEmail } from "../services/email.ts";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = generateSlug(base);
  let counter = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    counter++;
    slug = `${generateSlug(base)}-${counter}`;
  }
  return slug;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(prefix: string): string {
  return `${prefix}${randomBytes(32).toString("hex")}`;
}

async function createRefreshToken(userId: string, orgId: string): Promise<string> {
  const token = generateToken("rt_");
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, orgId, expiresAt },
  });

  return token;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Signup
  fastify.post("/auth/signup", async (request, reply) => {
    const parsed = SignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { email, password, name, orgName, inviteToken } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt" });

    // If invite token provided, join invited org instead of creating new one
    if (inviteToken) {
      const invite = await prisma.invite.findUnique({ where: { token: inviteToken } });
      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        return reply.status(400).send({ error: "Invalid or expired invite" });
      }

      if (invite.email !== email) {
        return reply.status(400).send({ error: "Email does not match invite" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email, passwordHash, name } });

        await tx.membership.create({
          data: { userId: user.id, orgId: invite.orgId, role: invite.role },
        });

        await tx.invite.update({
          where: { id: invite.id },
          data: { acceptedAt: new Date() },
        });

        const org = await tx.organization.findUniqueOrThrow({ where: { id: invite.orgId } });
        return { user, org, role: invite.role };
      });

      const accessToken = fastify.jwt.sign({
        userId: result.user.id,
        orgId: result.org.id,
        role: result.role,
      });

      const refreshToken = await createRefreshToken(result.user.id, result.org.id);

      return reply.status(201).send({
        accessToken,
        refreshToken,
        user: { id: result.user.id, email: result.user.email, name: result.user.name },
        org: { id: result.org.id, name: result.org.name, slug: result.org.slug, role: result.role },
      });
    }

    // Normal signup — require orgName
    if (!orgName) {
      return reply.status(400).send({ error: "Organization name required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, passwordHash, name } });
      const slug = await uniqueSlug(orgName);
      const org = await tx.organization.create({ data: { name: orgName, slug } });
      await tx.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });
      return { user, org };
    });

    const accessToken = fastify.jwt.sign({
      userId: result.user.id,
      orgId: result.org.id,
      role: "owner",
    });

    const refreshToken = await createRefreshToken(result.user.id, result.org.id);

    return reply.status(201).send({
      accessToken,
      refreshToken,
      user: { id: result.user.id, email: result.user.email, name: result.user.name },
      org: { id: result.org.id, name: result.org.name, slug: result.org.slug, role: "owner" },
    });
  });

  // Login
  fastify.post("/auth/login", async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { org: true }, take: 1 } },
    });

    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await Bun.password.verify(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const membership = user.memberships[0];
    if (!membership) {
      return reply.status(401).send({ error: "No organization found" });
    }

    const accessToken = fastify.jwt.sign({
      userId: user.id,
      orgId: membership.orgId,
      role: membership.role,
    });

    const refreshToken = await createRefreshToken(user.id, membership.orgId);

    return reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name },
      org: { id: membership.org.id, name: membership.org.name, slug: membership.org.slug, role: membership.role },
    });
  });

  // Refresh token
  fastify.post("/auth/refresh", async (request, reply) => {
    const parsed = RefreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const tokenHash = hashToken(parsed.data.refreshToken);
    const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      return reply.status(401).send({ error: "Invalid or expired refresh token" });
    }

    // Revoke old token (rotation)
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    // Get membership for role
    const membership = await prisma.membership.findFirst({
      where: { userId: existing.userId, orgId: existing.orgId },
    });

    if (!membership) {
      return reply.status(401).send({ error: "Membership not found" });
    }

    const accessToken = fastify.jwt.sign({
      userId: existing.userId,
      orgId: existing.orgId,
      role: membership.role,
    });

    const newRefreshToken = await createRefreshToken(existing.userId, existing.orgId);

    return reply.send({ accessToken, refreshToken: newRefreshToken });
  });

  // Logout
  fastify.post("/auth/logout", async (request, reply) => {
    const parsed = RefreshTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const tokenHash = hashToken(parsed.data.refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return reply.send({ message: "Logged out" });
  });

  // Get current user
  fastify.get("/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const { userId, orgId } = request.user as { userId: string; orgId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { where: { orgId }, include: { org: true } } },
    });

    if (!user) {
      return reply.status(404).send({ error: "User not found" });
    }

    const membership = user.memberships[0];

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name },
      org: membership
        ? { id: membership.org.id, name: membership.org.name, slug: membership.org.slug, role: membership.role }
        : null,
    });
  });

  // Forgot password
  fastify.post("/auth/forgot-password", async (request, reply) => {
    const parsed = ForgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    // Always return 200 to prevent email enumeration
    if (user) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await prisma.passwordResetToken.create({
        data: { tokenHash, userId: user.id, expiresAt },
      });

      await sendPasswordResetEmail(parsed.data.email, token);
    }

    return reply.send({ message: "If an account exists, a reset link has been generated" });
  });

  // Reset password
  fastify.post("/auth/reset-password", async (request, reply) => {
    const parsed = ResetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const tokenHash = hashToken(parsed.data.token);
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await Bun.password.hash(parsed.data.password, { algorithm: "bcrypt" });

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Revoke all refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return reply.send({ message: "Password updated" });
  });

  // Invite member (owner only, protected by auth plugin)
  fastify.post("/auth/invite", { preHandler: requireRole("owner") }, async (request, reply) => {
    const parsed = InviteMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findFirst({
        where: { userId: existingUser.id, orgId: request.orgId },
      });
      if (existingMembership) {
        return reply.status(409).send({ error: "User is already a member" });
      }
    }

    // Check for pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: { email: parsed.data.email, orgId: request.orgId, acceptedAt: null },
    });
    if (existingInvite) {
      return reply.status(409).send({ error: "Invite already pending for this email" });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.invite.create({
      data: {
        email: parsed.data.email,
        orgId: request.orgId,
        role: parsed.data.role,
        invitedBy: request.userId,
        token,
        expiresAt,
      },
    });

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: request.orgId } });
    await sendInviteEmail(parsed.data.email, token, org.name);

    return reply.status(201).send({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    });
  });

  // Accept invite (public — user must be logged in via JWT)
  fastify.post("/auth/accept-invite", async (request, reply) => {
    const parsed = AcceptInviteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid input" });
    }

    const invite = await prisma.invite.findUnique({
      where: { token: parsed.data.token },
      include: { org: true },
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      return reply.status(400).send({ error: "Invalid or expired invite" });
    }

    // Check if user is authenticated
    let userId: string | null = null;
    try {
      await request.jwtVerify();
      userId = request.user.userId;
    } catch {
      // Not logged in — return info so frontend can redirect to signup
      return reply.send({
        needsSignup: true,
        email: invite.email,
        orgName: invite.org.name,
        inviteToken: invite.token,
      });
    }

    // Verify email matches
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invite.email) {
      return reply.status(403).send({ error: "Email does not match invite" });
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findFirst({
      where: { userId, orgId: invite.orgId },
    });
    if (existingMembership) {
      return reply.status(409).send({ error: "Already a member of this organization" });
    }

    await prisma.$transaction([
      prisma.membership.create({
        data: { userId, orgId: invite.orgId, role: invite.role },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return reply.send({
      needsSignup: false,
      membership: { orgId: invite.orgId, role: invite.role },
      org: { id: invite.org.id, name: invite.org.name, slug: invite.org.slug },
    });
  });

  // List members (member+, protected by auth plugin)
  fastify.get("/auth/members", async (request, reply) => {
    const members = await prisma.membership.findMany({
      where: { orgId: request.orgId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return reply.send({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  });

  // Remove member (owner only)
  fastify.delete("/auth/members/:id", { preHandler: requireRole("owner") }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const membership = await prisma.membership.findFirst({
      where: { id, orgId: request.orgId },
    });

    if (!membership) {
      return reply.status(404).send({ error: "Member not found" });
    }

    // Cannot remove last owner
    if (membership.role === "owner") {
      const ownerCount = await prisma.membership.count({
        where: { orgId: request.orgId, role: "owner" },
      });
      if (ownerCount <= 1) {
        return reply.status(400).send({ error: "Cannot remove the last owner" });
      }
    }

    await prisma.membership.delete({ where: { id } });
    return reply.status(204).send();
  });
}
