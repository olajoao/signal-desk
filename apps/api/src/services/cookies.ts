import type { FastifyReply } from "fastify";

const isDev = process.env.NODE_ENV !== "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isDev,
  sameSite: (isDev ? "lax" : "strict") as "lax" | "strict",
  path: "/",
} as const;

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void {
  reply.setCookie("access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });
  reply.setCookie("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    path: "/auth", // only sent to auth endpoints
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

export function clearAuthCookies(reply: FastifyReply): void {
  reply.clearCookie("access_token", { ...COOKIE_OPTIONS });
  reply.clearCookie("refresh_token", { ...COOKIE_OPTIONS, path: "/auth" });
}
