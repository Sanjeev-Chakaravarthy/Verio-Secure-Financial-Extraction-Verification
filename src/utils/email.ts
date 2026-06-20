import nodemailer from "nodemailer";
import { Resend } from "resend";

// ── Email provider auto-selection ──────────────────────────────
// If RESEND_API_KEY is set → use Resend (recommended)
// Otherwise → fall back to Nodemailer SMTP (Gmail App Password)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const isSmtpConfigured =
  !!process.env.EMAIL_SMTP_USER &&
  !!process.env.EMAIL_SMTP_PASS &&
  process.env.EMAIL_SMTP_USER !== "your-gmail@gmail.com";

function createSmtpTransporter() {
  if (!isSmtpConfigured) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_SMTP_PORT || "465"),
    secure: parseInt(process.env.EMAIL_SMTP_PORT || "465") === 465,
    auth: {
      user: process.env.EMAIL_SMTP_USER!,
      pass: process.env.EMAIL_SMTP_PASS!,
    },
  });
}

interface InviteEmailOptions {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  joinUrl?: string;
  appUrl?: string;
}

export async function sendInviteEmail({
  toEmail,
  inviterName,
  workspaceName,
  joinUrl,
  appUrl = process.env.APP_URL || "http://localhost:3000",
}: InviteEmailOptions) {
  const ctaUrl = joinUrl || `${appUrl}/register`;
  const registerUrl = `${appUrl}/register`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You've been invited to Verio</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#121212;padding:32px 40px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:36px;color:#FFFFFF;letter-spacing:-1px;">Verio</p>
              <p style="margin:6px 0 0;font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">Secure Financial Workspace</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:48px 40px;">
              <p style="margin:0 0 8px;font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Workspace Invitation</p>
              <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:28px;color:#1A1A1A;line-height:1.2;">
                You've been invited to join <em>${workspaceName}</em>
              </h1>

              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Hi there,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                <strong style="color:#1A1A1A;">${inviterName}</strong> has added you as a member of the <strong style="color:#1A1A1A;">${workspaceName}</strong> workspace on Verio — a secure, organization-scoped financial transaction extractor.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">
                Sign in to access your shared workspace and start collaborating on the ledger.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#1A1A1A;padding:14px 32px;">
                    <a href="${ctaUrl}" style="color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                      Join Workspace on Verio →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="border-top:1px solid #E8E8E8;"></td></tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#999;">
                Don't have an account yet?
                <a href="${registerUrl}" style="color:#1A1A1A;font-weight:600;">Create one here</a>
                and you'll automatically be linked to <strong>${workspaceName}</strong>.
              </p>

              <!-- What is Verio -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;background:#F9F9F7;border:1px solid #E8E8E8;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase;font-weight:600;">What is Verio?</p>
                    <p style="margin:0;font-size:13px;color:#666;line-height:1.7;">
                      Verio is a workspace-isolated financial transaction extractor. Paste raw bank text — SMS alerts, statements, wire confirmations — and instantly get structured, secure ledger entries. All data is strictly scoped to your organization.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F0EFE9;padding:24px 40px;border-top:1px solid #E8E8E8;">
              <p style="margin:0;font-size:11px;color:#AAA;line-height:1.8;">
                You received this email because <strong style="color:#888;">${inviterName}</strong> invited you to the <strong style="color:#888;">${workspaceName}</strong> workspace on Verio.<br/>
                If you weren't expecting this, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // ── Send via Resend (preferred) ──────────────────────────────
  if (resend) {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Verio <onboarding@resend.dev>",
      to: toEmail,
      subject: `You've been invited to join ${workspaceName} on Verio`,
      html,
    });
    if (error) throw new Error(error.message);
    console.log(`[email/resend] Invite sent to ${toEmail}`);
    return;
  }

  // ── Fall back to SMTP ─────────────────────────────────────────
  const transporter = createSmtpTransporter();
  if (!transporter) {
    console.warn("[email] No email provider configured — skipping invite email to", toEmail);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Verio" <noreply@verio.app>`,
    to: toEmail,
    subject: `You've been invited to join ${workspaceName} on Verio`,
    html,
  });

  console.log(`[email/smtp] Invite sent to ${toEmail}`);
}

interface PasswordResetEmailOptions {
  toEmail: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  toEmail,
  userName,
  resetUrl,
}: PasswordResetEmailOptions) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your Verio Password</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#121212;padding:32px 40px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:36px;color:#FFFFFF;letter-spacing:-1px;">Verio</p>
              <p style="margin:6px 0 0;font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;">Secure Financial Workspace</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:48px 40px;">
              <p style="margin:0 0 8px;font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Security Notification</p>
              <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:28px;color:#1A1A1A;line-height:1.2;">
                Reset your password
              </h1>

              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                Hi ${userName},
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;line-height:1.7;">
                We received a request to reset the password for your Verio account. Click the button below to configure your new security credentials.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#555;line-height:1.7;">
                If you did not make this request, you can safely ignore this email — your account security has not been compromised.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#1A1A1A;padding:14px 32px;">
                    <a href="${resetUrl}" style="color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                      Reset Password →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr><td style="border-top:1px solid #E8E8E8;"></td></tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#999;">
                If the button above does not work, copy and paste this URL into your browser:
                <br/>
                <a href="${resetUrl}" style="color:#1A1A1A;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F0EFE9;padding:24px 40px;border-top:1px solid #E8E8E8;">
              <p style="margin:0;font-size:11px;color:#AAA;line-height:1.8;">
                This link will expire for security purposes. If you continue to have trouble, please visit the Help Center.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  if (resend) {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Verio <onboarding@resend.dev>",
      to: toEmail,
      subject: `Reset your Verio Password`,
      html,
    });
    if (error) throw new Error(error.message);
    console.log(`[email/resend] Password reset sent to ${toEmail}`);
    return;
  }

  const transporter = createSmtpTransporter();
  if (!transporter) {
    console.warn("[email] No email provider configured — skipping password reset email to", toEmail);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"Verio" <noreply@verio.app>`,
    to: toEmail,
    subject: `Reset your Verio Password`,
    html,
  });

  console.log(`[email/smtp] Password reset sent to ${toEmail}`);
}

