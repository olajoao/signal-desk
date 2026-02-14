import { Resend } from "resend";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const FROM = process.env.EMAIL_FROM ?? "SignalDesk <noreply@signaldesk.dev>";

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[EMAIL] Password reset email skipped (no RESEND_API_KEY)`);
    return;
  }

  const resend = new Resend(apiKey);

  const link = `${APP_URL}/reset-password?token=${token}`;
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p>Click the link below to reset your password. It expires in 15 minutes.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

export async function sendInviteEmail(to: string, token: string, orgName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[EMAIL] Invite email skipped (no RESEND_API_KEY)`);
    return;
  }

  const resend = new Resend(apiKey);

  const link = `${APP_URL}/invite/accept?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You're invited to ${orgName} on SignalDesk`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">You've been invited</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on SignalDesk.</p>
        <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
          Accept Invite
        </a>
        <p style="color:#666;font-size:13px">This invite expires in 7 days.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send invite email: ${error.message}`);
  }
}
