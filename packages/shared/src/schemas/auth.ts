import { z } from "zod";

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
  orgName: z.string().min(1).max(100).optional(),
  inviteToken: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
});

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
});

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: z.string(),
  createdAt: z.date(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
});

export type Signup = z.infer<typeof SignupSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type InviteMember = z.infer<typeof InviteMemberSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type ForgotPassword = z.infer<typeof ForgotPasswordSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type AcceptInvite = z.infer<typeof AcceptInviteSchema>;
export type User = z.infer<typeof UserSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
