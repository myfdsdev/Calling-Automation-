import axios from 'axios';
import { env } from '../config/env.js';

const RESEND_URL = 'https://api.resend.com/emails';

/** True when Resend is configured (API key + verified sender). */
export const emailReady = () => Boolean(env.resend.apiKey && env.resend.from);

/**
 * Send a transactional email via Resend. Returns true on success. If Resend isn't
 * configured it warns and returns false (so flows can degrade gracefully); on a
 * real provider error it throws so the caller can surface a clear message.
 */
export async function sendEmail({ to, subject, html }) {
  if (!emailReady()) {
    console.warn(
      '[email] Resend not configured (set RESEND_API_KEY and RESEND_FROM). Skipping email to',
      to,
    );
    return false;
  }
  try {
    await axios.post(
      RESEND_URL,
      { from: env.resend.from, to, subject, html },
      {
        headers: {
          Authorization: `Bearer ${env.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );
    return true;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    console.error('[email] Resend send failed:', msg);
    throw new Error(`Could not send the email: ${msg}`);
  }
}

/** Send the password-reset email containing the reset link. */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset your LeadCall AI password',
    html: passwordResetHtml({ name, resetUrl }),
  });
}

/* ------------------------------ Templates ------------------------------ */

function passwordResetHtml({ name, resetUrl }) {
  const safeName = (name || 'there').replace(/</g, '&lt;');
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e2df;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 32px 8px;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <span style="display:inline-block;width:36px;height:36px;background:#F59E0B;border-radius:9px;text-align:center;line-height:36px;font-size:18px;">&#128222;</span>
              <span style="font-size:18px;font-weight:700;color:#1C1D21;">LeadCall <span style="color:#F59E0B;">AI</span></span>
            </div>
          </td></tr>
          <tr><td style="padding:8px 32px 0;">
            <h1 style="margin:16px 0 8px;font-size:20px;color:#1C1D21;">Reset your password</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:22px;color:#5F626B;">
              Hi ${safeName}, we received a request to reset your LeadCall AI password.
              Click the button below to choose a new one. This link expires in 1 hour.
            </p>
          </td></tr>
          <tr><td style="padding:8px 32px 24px;">
            <a href="${resetUrl}" style="display:inline-block;background:#F59E0B;color:#1C1D21;font-weight:700;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:10px;">
              Reset password
            </a>
            <p style="margin:20px 0 0;font-size:12px;line-height:20px;color:#8A8D96;">
              Or paste this link into your browser:<br/>
              <a href="${resetUrl}" style="color:#C66A05;word-break:break-all;">${resetUrl}</a>
            </p>
          </td></tr>
          <tr><td style="padding:16px 32px 28px;border-top:1px solid #f0f0ed;">
            <p style="margin:0;font-size:12px;line-height:20px;color:#8A8D96;">
              If you didn't request a password reset, you can safely ignore this email — your
              password won't change.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
